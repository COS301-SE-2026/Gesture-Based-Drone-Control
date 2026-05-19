# services/drone_control/adapters/project_airsim_adapter.py

"""
Concrete DroneAdapter wrapping the Project AirSim Python client
Enables us to use the more updated unreal 5 Project Airsim

Project AirSim vs legacy AirSim

The legacy airsim package used msgpackrpc + a Tornado IOLoop internally,
which conflicted with asyncio and required threading workarounds.
(the workarounds never actually worked)

Project AirSim's client is built on pynng and is properly async-native.
Every drone method (takeoff_async, move_by_velocity_body_frame_async, etc.)
is a real coroutine that can be awaited directly

Coordinate system

Project AirSim uses the same NED as legacy AirSim
  +x = North / forward    +y = East / right    +z = Down

Movement uses body-frame velocity (move_by_velocity_body_frame_async) so
forward/back/left/right are relative to whichever way the drone is facing,
which is the natural expectation for manual control.
The legacy version sort of had tank controls, its a bit awkward.

World() needs a scene config file. We bundle a copy of the package and
sim_config such that environments are consistent and we are able to deploy eventually.
This code will likely have to be modified, so it serves as a place to keep our own fork.
The paths are evaluated at runtime so nothing needs to be copied or hardcoded.

Connection parameters

Project AirSim uses two separate ports:
  topics_port   : pub-sub stream (default 8989)
  services_port : RPC commands   (default 8990)
These are different from the legacy AirSim port (41451)

"""

from __future__ import annotations

import asyncio
import logging
import math
import pathlib
from typing import TYPE_CHECKING

from services.commands.command import CommandType
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

if TYPE_CHECKING:
    import projectairsim as _pas
    
logger = logging.getLogger(__name__)

#defaults for movement. tweakable, same as airsim
DEFAULT_SPEED_MS:     float = 3.0 
DEFAULT_DURATION_S:   float = 0.1  
DEFAULT_ROTATE_DEG:   float = 15.0 
DEFAULT_YAW_RATE_DPS: float = 45.0  

def _find_sim_config() -> str:
    """
    Internal method to resolve the sim_config/ dir to pass to World()
    
    Searches vendors/sim_config and vendors/projectairsim/gym_envs
    
    Raises a runtime error if nothing is found
    """
    #this code is so ass
    repo_root = pathlib.Path(__file__).resolve().parent.parent.parent.parent
    
    #vendors/sim_config
    bundled = repo_root / 'vendors' / 'sim_config'
    if bundled.is_dir():
        return str(bundled) + '/'
    
    #fallback 
    try:
        import projectairsim
        pkg_root = pathlib.Path(projectairsim.__file__).parent
        candidate = pkg_root / 'gym_envs' / 'sim_config'
        if candidate.is_dir():
            return str(candidate) + '/'
    except ImportError:
        pass
    
    raise RuntimeError(
        f'Could not find sim_config/. '
        f'Copy ProjectAirSim/client/python/example_user_scripts/sim_config into vendors/sim_config'
    )

class ProjectAirSimAdapter(DroneAdapter):
    """
    Wraps projectairsim.Drone to implement DroneAdapter.

    Parameters:     
        host : str
            IP of the machine running Project AirSim. Default 127.0.0.1 localhost
        topics_port : int
            Pub-sub port. Default 8989.
        services_port : int
            RPC services port. Default 8990.
        vehicle_name : str
            Vehicle name as defined in the scene config. Default "Drone1".
        scene_config : str
            Scene config filename (not full path). Default "scene_basic_drone.jsonc".
        sim_config_path : str | None
            Override the sim_config directory. Auto-detected from the package if None.
    """
    
    #holy constructor 
    def __init__(
        self,
        host: str = '127.0.0.1',
        topics_port: int = 8989,
        services_port: int = 8990,
        vehicle_name: str = 'Drone1',
        scene_config: str = 'scene_basic_drone.jsonc',
        sim_config_path: str | None = None,
    ) -> None:
        self._host = host
        self._topics_port = topics_port
        self._services_port = services_port
        self._vehicle_name = vehicle_name
        self._scene_config = scene_config
        self._sim_config_path = sim_config_path  #resolved in connect()

        self._client: '_pas.ProjectAirSimClient | None' = None
        self._drone:  '_pas.Drone | None' = None
        self._connected: bool = False

    #Connection lifecycle
    
    async def connect(self) -> bool:
        """
        Connect to Project AirSim, initialize the scene, and arm the dronw

        Returns False if fail rather than throw
        """
        try:
            import projectairsim
            from projectairsim import Drone, World
            
            # Resolve sim_config path once only at connect time
            config_path = self._sim_config_path or _find_sim_config()
            logger.info('ProjectAirSimAdapter: using sim_config at %s', config_path)

            self._client = projectairsim.ProjectAirSimClient(
                address=self._host,
                port_topics=self._topics_port,
                port_services=self._services_port,
            )
            
            self._client.connect()

            world = World(
                client=self._client,
                scene_config_name=self._scene_config,
                sim_config_path=config_path,
            )

            self._drone = Drone(self._client, world, self._vehicle_name)
            self._drone.enable_api_control()

            self._connected = True
            logger.info(
                'ProjectAirSimAdapter: connected to %s (topics=%d services=%d vehicle=%r)',
                self._host, self._topics_port, self._services_port, self._vehicle_name,
            )
            return True
            
        except Exception as ex:
            logger.error('ProjectAirSimAdapter: connection failed - %s', ex)
            self._connected = False
            return False
        
    async def disconnect(self) -> None:
        """
        Disarm the drone, disable API control, disconnect
        
        Uses a brief sleep to allow any async responses time to arrive
        before the port closes. otherwise we get flooded with 'Object closed'
        errors.
        """
        
        if self._drone and self._connected:
            try:
                self._drone.disarm()
                self._drone.disable_api_control()
            except Exception as ex:
                logger.warning('ProjectAirSimAdapter: error during disarm - %s', ex)
        
        #can increase if error messages still flooding
        await asyncio.sleep(0.5)
    
        if self._client:
                try:
                    self._client.disconnect()
                except Exception as ex:
                    logger.warning('ProjectAirSimAdapter: error during disconnect - %s', ex)

        self._connected = False
        logger.info('ProjectAirSimAdapter: disconnected')
        
    #Flight commands
    
    