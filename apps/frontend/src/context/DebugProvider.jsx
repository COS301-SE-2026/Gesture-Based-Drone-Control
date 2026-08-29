import { useState, useEffect, useMemo } from "react"
import PropTypes from "prop-types"
import { DebugContext } from "./DebugContext"

const DEBUG_KEY = "debug:enabled"

export const DebugProvider = ({ children }) => {
  const [debugMode, setDebugMode] = useState(() => {
    try {
      return localStorage.getItem(DEBUG_KEY) === "true"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(DEBUG_KEY, String(debugMode))
    } catch {
      //ignore
    }
  }, [debugMode])

  const toggle = () => setDebugMode((prev) => !prev)

  const value = useMemo(
    () => ({ debugMode, setDebugMode, toggle }),
    [debugMode]
  )

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>
}

DebugProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
