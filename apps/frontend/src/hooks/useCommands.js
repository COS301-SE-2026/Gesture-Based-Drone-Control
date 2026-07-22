import { useCallback, useState } from "react"
import { getWsUrl } from "@/lib/api"
import { useWebSocket, } from "./useWebSocket"

export function useCommands(wsUrl = getWsUrl("/api/drone/ws/commands")) {
  const [lastResp, setLastResp] = useState(null)

  const { socketRef, status } = useWebSocket(wsUrl, {
    onmessage(event) {
      try {
        setLastResp(JSON.parse(event.data))
      } catch (err) {
        console.error("useCommands: fail to parse response ", err)
      }
    },
  })

  /**
   * send a command to the backend. return false if
   * socket is unavailable. up to callers to notify the user or not
   */
  const sendCommand = useCallback((commandName, extra = {}) => {
    const socket = socketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn(
        "useCommands: socket not open, dropping command",
        commandName
      )
      return false
    }

    socket.send(
      JSON.stringify({
        command: commandName,
        ...extra,
      })
    )
    return true
  }, [socketRef])

  return {
    sendCommand,
    status,
    lastResp,
  }
}
