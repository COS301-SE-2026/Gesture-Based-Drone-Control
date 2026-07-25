import { useState } from "react"


//cause the camelcase is needed in the backend commandtype in drone.py
const ACTION_TO_COMMAND ={
  moveForward:"MOVE_FORWARD",
  moveBackward:"MOVE_BACKWARD",
  moveLeft:"MOVE_LEFT",
  moveRight:"MOVE_RIGHT",
  goUp:"MOVE_UP",
  goDown:"MOVE_DOWN",
  rotateLeft:"ROTATE_CCW",
  rotateRight:"ROTATE_CW",
  takeoff:"TAKEOFF",
  hover:"HOVER",
  land:"LAND",
  emergencyStop:"EMERGENCY_STOP",
}

export const useDroneControls = (sendCommand) => {
  const [activeControls, setActiveControls] = useState({})

  const handleControlPress = (action, label) => {
    //change the tab here
    setActiveControls((prev) => ({
      ...prev,
      [label]: true,
    }))

    onControlAction?.(ACTION_TO_COMMAND[action]||action)
    

    //reset active state
    setTimeout(() => {
      setActiveControls((prev) => ({
        ...prev,
        [label]: false,
      }))
    }, 200)
  }

  const isControlActive = (label) => {
    return !!activeControls[label]
  }

  return {
    handleControlPress,
    isControlActive,
    activeControls,
  }
}
