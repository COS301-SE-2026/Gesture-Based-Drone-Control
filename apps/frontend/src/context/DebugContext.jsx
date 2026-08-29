import { createContext, useContext } from "react"

export const DebugContext = createContext()

export const useDebug = () => {
  const context = useContext(DebugContext)
  if (!context) {
    throw new Error("useDebug must be used within a debugProvider")
  }
  return context
}
