import { useCallback, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { OverlayContext } from "./OverlayContext"

const SKELETON_KEY = "overlay-skeleton"
const MOTION_KEY = "overlay-motion"

function readStored(key) {
  try {
    return localStorage.getItem(key) !== "off"
  } catch {
    return true
  }
}

export const OverlayProvider = ({ children }) => {
  const [skeleton, setSkeleton] = useState(() => readStored(SKELETON_KEY))
  const [motionGuide, setMotionGuide] = useState(() => readStored(MOTION_KEY))

  const persist = useCallback((key, setter) => {
    return (next) => {
      setter(next)
      try {
        localStorage.setItem(key, next ? "on" : "off")
      } catch {
        //preference doessnt sruvive reload, safe failure
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      skeleton,
      motionGuide,
      setSkeleton: persist(SKELETON_KEY, setSkeleton),
      setMotionGuide: persist(MOTION_KEY, setMotionGuide),
    }),
    [skeleton, motionGuide, persist]
  )

  return (
    <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
  )
}

OverlayProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
