import { useState, useEffect, useRef, useCallback } from "react"
import { CommandsContext } from "./CommandsContext"

export function CommandsProvider({ children }) {
  const [status, setStatus] = useState("closed")
  const [lastResp, setLastResp] = useState(null)

  const wsRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001/api/drone/ws/commands")
    wsRef.current = ws
    ws.onopen = () => setStatus("open")
    ws.onclose = () => setStatus("closed")
    ws.onmessage = (e) => setLastResp(JSON.parse(e.data))
    return () => ws.close()
  }, [])

  const sendCommand = useCallback((commandName, extra = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: commandName, ...extra }))
    }
  }, [])

  return (
    <CommandsContext.Provider value={{ sendCommand, status, lastResp }}>
      {children}
    </CommandsContext.Provider>
  )
}
