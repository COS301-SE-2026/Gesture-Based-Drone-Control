import { useState, useEffect, useRef } from "react"
import { TelemetryContext } from "./TelemetryContext"

export function TelemetryProvider({ children }) {
  const [telemetry, setTelemetry] = useState(null)
  const [status, setStatus] = useState("closed")
  const wsRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001/api/drone/ws/telemetry")
    wsRef.current = ws
    ws.onopen = () => setStatus("open")
    ws.onclose = () => setStatus("closed")
    ws.onmessage = (e) => setTelemetry(JSON.parse(e.data))
    return () => ws.close()
  }, [])

  return (
    <TelemetryContext.Provider value={{ telemetry, status }}>
      {children}
    </TelemetryContext.Provider>
  )
}
