# /services/input/sources/gamepad_adapter.py

"""
A concrete InputAdapter that receives browser key events through
a WebSocket connection and maps them to Command objects.

This is based off of the KeyboardAdapter, and similarly translates
a JSON object into the appropriate action to execute on the drone.

This adapter features analog controls, implemented for the two analog sticks
and triggers. This offers a superior sense of control.

Message format is a snapshot of the controller state:
    {           
        // stick inputs within [-1, 1] inclusive
        left_x: cleanAxis(pad.axes[0]), //right==1, ,left==-1
        left_y: cleanAxis(pad.axes[1]), //down==1, up==-1

        right_x: cleanAxis(pad.axes[2]),
        right_y: cleanAxis(pad.axes[3]),
        
        //fully depressed == 1
        ltrigger: Number(((pad.buttons[6]?.value)||0).toFixed(3)),
        rtrigger:Number(((pad.buttons[7]?.value)||0).toFixed(3)),
        
        a: pad.buttons[0]?.pressed || false, //x
        b: pad.buttons[1]?.pressed || false, //o
        x: pad.buttons[2]?.pressed || false, //square
        y: pad.buttons[3]?.pressed || false, //triangle
        
        lb: pad.buttons[4]?.pressed || false,
        rb: pad.buttons[5]?.pressed || false,
        
        back: pad.buttons[8]?.pressed || false,
        start: pad.buttons[9]?.pressed || false,
        
        lclick: pad.buttons[10]?.pressed || false, //left stick click
        rclick: pad.buttons[11]?.pressed || false, //right stick click
        
        up: pad.buttons[12]?.pressed || false, //dpad
        down: pad.buttons[13]?.pressed || false,
        left: pad.buttons[14]?.pressed || false,
        right: pad.buttons[15]?.pressed || false
    }
    
Digital inputs such as the face buttons are handled as normal keypresses,
but the analog inputs are passed to the droneadapters to be handled uniquely.
This is abstracted away in this input adapter however.

Input mapping (xbox controller):

TODO STILL IN PROGRESS FINALISE AND UPDATE HERE

Analog inputs are DroneAdaper dependant, but we implement them there consistently:
    left_y = forward / backward
    left_x = strafe left / right

    right_x = yaw
    right_y = ascend / descend 

    ltrigger = ascend
    rtrigger = descend 
"""

from __future__ import annotations

import logging
from typing import Any

from services.commands.command import Command, CommandType, AnalogInput
from services.input.sources.input_adapter import InputAdapter

logger = logging.getLogger(__name__)

# Digital button to CommandType mapping
# This works about the same as keyboard inputs
BUTTON_MAP: dict[str, CommandType] = {
    'a': CommandType.TAKEOFF,
    'b': CommandType.LAND,
    'x': CommandType.HOVER,
    'y': CommandType.EMERGENCY_STOP,
    'lb': CommandType.ROTATE_CW,
    'rb': CommandType.ROTATE_CCW,
    'up':    CommandType.MOVE_FORWARD,
	'down':  CommandType.MOVE_BACKWARD,
	'left':  CommandType.MOVE_LEFT,
	'right': CommandType.MOVE_RIGHT,
}

# Because my controllers drift :(
DEADZONE: float = 0.08

class GamepadAdpater(InputAdapter):
    """
    Maps gamepad state passed from browser into Commands.
    
    One instance created per WebSocket connection in the API layer.
    Calls handle_message() for each incoming snapshot of the controller state
    
    Analog state is emitted once per frame, this is normalised according to 
    deadzone and simply passed to the DroneAdapter to handle itself.
    """
    
    def __init__(self) -> None:
        super().__init__()
    
    async def start(self) -> None:
        """
        This adapter does not need any background tasks. Simply log
        """
        logger.info('GamepadAdapter: ready and waiting for WS data')
        
    def handle_message(self, message: dict[str, Any]) -> None:
        ...

    # handle the analog and digital inputs separately
    
    def _process_analog(self, msg: dict[str, Any]) -> None:
        ...
        
    def _process_digital(self, msg: dict[str, Any]) -> None:
        ...
        
    def get_bindings(self) -> dict[str, str]:
        return {button: cmd.name for button, cmd in BUTTON_MAP.items()}