# /services/cv-pipeline/drone-control/adapters/tello_adapter.py

import logging
import math
from djitellopy import Tello, BackgroundFrameRead
from services.commands.command import AnalogInput, CommandType
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

logger = logging.getLogger(__name__)

class TelloAdapter(DroneAdapter):

    MOVEMENTSPEED = 50

    def __init__(
            self,
            _tello: Tello,
            _frameReader: BackgroundFrameRead,
            _connected: bool,
            _is_flying: bool,
            
    ) ->None:
        self._tello = Tello()
        self._connected = False
        self._is_flying = False


    async def connect(self) -> bool:
        try:
            self._tello.connect()
            self._tello.streamon()
            self._frameReader = self._tello.get_frame_read()
            self._connected = True
            return True
        except Exception:
            return False

    async def disconnect(self) -> None:
        self._assert_connected()

        self._tello.land()
        self._tello.streamoff()
        self._tello.end() 
        self._connected = False

    async def takeoff(self) -> None:
        self._assert_connected()
        self._tello.takeoff()
        self._is_flying = True
        logger.info('Tello Drone: taking off')

    async def land(self) -> None:
        self._assert_connected()
        self._assert_flying()

        self._tello.land()
        self._is_flying = False
        logger.info('Tello Drone: landing')

    async def move(self, direction: CommandType, **kwargs):
        """
        I am aware that the speed kwargs is being used here as a distance
        We are just moving with it considering its perfectly tuned without the kwargs input
        """
        self._assert_connected()
        self._assert_flying()

        speed = kwargs.get('speed_ms', self.MOVEMENTSPEED)

        velocity_map: dict[CommandType, tuple[int, int, int, int]] = {
            CommandType.MOVE_FORWARD: (0, speed, 0, 0),
            CommandType.MOVE_BACKWARD: (0, -speed, 0, 0),
            CommandType.MOVE_LEFT: (-speed, 0, 0, 0),
            CommandType.MOVE_RIGHT: (speed, 0, 0, 0),
            CommandType.MOVE_UP: (0, 0, speed, 0),
            CommandType.MOVE_DOWN: (0, 0, -speed, 0),
            CommandType.ROTATE_CW: (0, 0, 0, speed),
            CommandType.ROTATE_CCW: (0, 0, 0, -speed)
        }

        vec = velocity_map.get(direction)
        if vec is None:
            logger.warning('Tello.move: no vector for %s — skipping', direction.name)
            return

        lr, fb, ud, yaw = vec

        logger.info(
			'Tello: move %s (vx=%.2f vy=%.2f vz=%.2f dur=%.2fs)',
			direction.name,
			lr,
			fb,
			ud,
			yaw,
		)
        self._tello.send_rc_control(lr, fb, ud, yaw)


    async def analog(self, input: AnalogInput) -> None:
        self._assert_connected()
        self._assert_flying()

        fb = -input.left_y * self.MOVEMENTSPEED
        lr = input.left_x * self.MOVEMENTSPEED

        stickz = input.right_y
        triggerz = input.ltrigger - input.rtrigger
        vert = stickz if abs(stickz) >= abs(triggerz) else triggerz
        ud = vert * self.MOVEMENTSPEED

        yaw = input.right_x * self.MOVEMENTSPEED

        self._tello.send_rc_control(lr, fb, ud, yaw)

    async def hover (self) -> None:
        self._assert_connected()
        self._assert_flying()

        self._tello.send_rc_control(0,0,0,0)

    async def emergency_stop(self) -> None:
        self._tello.emergency()

    async def get_telemetry(self):
        if not self._connected:
            return TelemetryData(source='tello-disconnected')
            

        try:
            state = self._tello.get_current_state()

            altitude = state.get('tof') / 100 # conversion to meters

            vx = state.get('vgx')
            vy = state.get('vgy')
            vz = state.get('vgz')

            vel = math.sqrt(vx**2 + vy**2 + vz**2)
            vel = vel /100 # cm/s -> m/s

            yaw = state.get('yaw')
            body_heading = math.degrees(math.atan2(vy, vx))
            world_heading = (body_heading + yaw) % 360

            battery = state.get('bat')

            signal = self._tello.send_command_with_return('wifi')

            x, y = self._tello.get_position()

            return TelemetryData(
                altitude_m= round(altitude, 3),
                speed_ms=round(vel, 3),
                heading_deg= world_heading,
                battery_pct= battery,
                is_flying=self._is_flying,
                x_displacement= x,
                y_displacement= y,
                extra= ['signal', signal],
                source= 'tello'
            )

        except Exception as ex:
            logging.exception('ProjectAirSimAdapter.get_telemetry: error - %s', ex)
            logger.debug('Telemetry exception detail', exc_info=True)
            return TelemetryData(source='tello-error')
            



    def _assert_connected(self) -> None:
        if self._connected == False:
            raise RuntimeError(
                'Tello Drone is not connected. Await connect() before issuing commands.'
            ) 

    def _assert_flying(self) -> None:
        if self._is_flying == False:
            raise RuntimeError(
                'Tello Drone is not flying. Await takeoff() before issuing flight commands'
            )


    