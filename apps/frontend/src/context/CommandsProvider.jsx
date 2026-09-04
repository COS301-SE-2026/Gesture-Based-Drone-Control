import { useState, useCallback } from "react"
import { CommandsContext } from "./CommandsContext"
import { useWebSocket } from "@/hooks/useWebSocket"
import { getWsUrl } from "@/lib/api"

export function CommandsProvider({ children }) {
  const [lastResp, setLastResp] = useState(null)

  const { socketRef, status } = useWebSocket(
    getWsUrl("/api/drone/ws/commands"),
    {
      onMessage(event) {
        try {
          setLastResp(JSON.parse(event.data))
        } catch (err) {
          console.error("CommandsProvider: failed to parse response", err)
        }
      },
    }
  )

  const sendCommand = useCallback(
    (commandName, extra = {}) => {
      const socket = socketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("CommandsProvider: socket not open, dropping", commandName)
        return false
      }
      socket.send(JSON.stringify({ command: commandName, ...extra }))
      return true
    },
    [socketRef]
  )

  return (
    <CommandsContext.Provider value={{ sendCommand, status, lastResp }}>
      {children}
    </CommandsContext.Provider>
  )
}
