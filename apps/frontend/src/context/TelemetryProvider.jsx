import { useState, useEffect, useRef } from "react"
import { TelemetryContext } from "./TelemetryContext"
import { useWebSocket } from "@/hooks/useWebSocket"
import { getWsUrl } from "@/lib/api"

export function TelemetryProvider({ children }) {
  const [telemetry, setTelemetry] = useState(null)

  const { status } = useWebSocket(getWsUrl("/api/drone/ws/telemetry"), {
    onMessage(event) {
      try {
        setTelemetry(JSON.parse(event.data))
      } catch (err) {
        console.error("TelemetryProvider: failed to parse frame", err)
      }
    },
  })

  return (
    <TelemetryContext.Provider value={{ telemetry, status }}>
      {children}
    </TelemetryContext.Provider>
  )
}
