import { useContext, createContext } from "react"

export const TelemetryContext = createContext(null)
export const useTelemetry = () => useContext(TelemetryContext)
