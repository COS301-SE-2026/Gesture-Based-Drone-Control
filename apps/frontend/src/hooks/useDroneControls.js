import { useState } from "react"

export const useDroneControls = (onControlAction) => {
  const [activeControls, setActiveControls] = useState({})

  const handleControlPress = (action, label) => {
    //change the tab here
    setActiveControls((prev) => ({
      ...prev,
      [label]: true,
    }))

    //call parent handler if it is given
    if (onControlAction) {
      onControlAction(action, label)
    }

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
