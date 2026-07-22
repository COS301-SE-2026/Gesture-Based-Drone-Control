import { useState } from "react"
import { getWsUrl } from "@/lib/api"
import { useWebSocket } from "./useWebSocket"

/**
 * opens a websocket to /drone/ws/telemetry
 *
 * auto reconnects using useWebSocket
 *
 * exposes the latest telemetry frame and ws status
 */

export function useTelemetry(wsUrl = getWsUrl("/api/drone/ws/telemetry")) {
  const [telemetry, setTelemetry] = useState(null)

  const { status } = useWebSocket(wsUrl, {
    onMessage(event) {
      try {
        setTelemetry(JSON.parse(event.data))
      } catch (err) {
        console.error("useTelemetry: failed to parse telemetry frame", err)
      }
    },
  })

  return { telemetry, status }
}
