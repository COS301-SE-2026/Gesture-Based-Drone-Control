import { useEffect, useRef, useState, useCallback } from "react"
import { getWsUrl } from "../lib/api"

const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 10000

/**
 * opens a websocket to drone/ws/commands and keeps it alive
 * with a reconnect and a backoff
 * exposes sendCommand(name) to send a command at the connected adapter +
 * connection status and the last resp/err received back from the backend
 */

export function useCommands(wsUrl = getWsUrl("/api/drone/ws/commands")) {
  const [status, setStatus] = useState("connecting")
  //connecting | open | closed | error
  const [lastResp, setLastResp] = useState(null)

  //i hope and pray sonar doesnt say dupe code
  const socketRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef(null)
  const isUnmountedRef = useRef(false)
  const wsUrlRef = useRef(wsUrl)
  const connectRef = useRef(null)

  const connec = useCallback(() => {
    if (isUnmountedRef.current) return

    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    setStatus("connecting")
    const socket = new WebSocket(wsUrlRef.current)
    socketRef.current = socket

    socket.onopen = () => {
      if (isUnmountedRef.current) return
      reconnectAttemptsRef.current = 0
      setStatus("open")
    }

    socket.onmessage = (event) => {
      if (isUnmountedRef.current) return
      try {
        setLastResp(JSON.parse(event.data))
      } catch (error) {
        console.error("useCommands: failed to parse a response", error)
      }
    }

    socket.onerror = (err) => {
      if (isUnmountedRef.current) return
      console.error("useCommands: websokcet error", err)
      setStatus("error")
    }

    socket.onclose = () => {
      socketRef.current = null
      if (isUnmountedRef.current) return
      setStatus("closed")

      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttemptsRef.current,
        MAX_RECONNECT_DELAY_MS
      )
      reconnectAttemptsRef.current += 1
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current && connectRef.current) {
          connectRef.current()
        }
      }, delay)
    }
  }, [])

  const sendCommand = useCallback((commandName, extra = {}) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn(
        "useCommands: socket not open, dropping command",
        commandName
      )
      return false
    }
    socket.send(JSON.stringify({ command: commandName, ...extra }))
    return true
  }, [])

  useEffect(() => {
    connectRef.current = connec
  }, [connec])

  useEffect(() => {
    wsUrlRef.current = wsUrl
  }, [wsUrl])

  useEffect(() => {
    isUnmountedRef.current = false
    connectRef.current()

    return () => {
      isUnmountedRef.current = true
      clearTimeout(reconnectTimeoutRef.current)
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [])

  return { sendCommand, status, lastResp }
}
