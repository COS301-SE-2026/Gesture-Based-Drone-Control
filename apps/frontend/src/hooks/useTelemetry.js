import { useEffect, useRef, useState, useCallback } from "react"
import { API_BASE_URL } from "../lib/api"

const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 10000

function getDefaultWsUrl() {
  const url = new URL("/api/drone/ws/telemetry", API_BASE_URL)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  return url.toString()
}

/**
 * opens a websocket to /drone/ws/telemetry and keeps it alive w reconnect and backoff.
 * it exposes the latest telemetry frame
 *
 * quic note: the backend socket accepts the connection immediately and stays
 * silent until that POST /drone/connect has been called and an adapter is set
 * the "open" status with telemetry being null means no adapter is connected yet not that the socket is broken
 */

export function useTelemetry(wsUrl = getDefaultWsUrl) {
  const [telemetry, setTelemetry] = useState(null)
  const [status, setStatus] = useState("connecting")
  //connecting | open | closed | error

  const socketRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef(null)
  const isUnmountedRef = useRef(false)
  const wsUrlRef = useRef(wsUrl)
  const connectRef = useRef(null)

  const connect = useCallback(() => {
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
        setTelemetry(JSON.parse(event.data))
      } catch (err) {
        console.error("useTelemetry: failed to parse telemetry frame", err)
      }
    }

    socket.onerror = (err) => {
      if (isUnmountedRef.current) return
      console.error("useTelemetry: websoscket error", err)
      setStatus("error")
    }

    socket.onclose = () => {
      socketRef.current = null
      if (isUnmountedRef.current) return
      setStatus("closed")

      //exp backoff but its capped so if the backend is dead it wont spam to reconnect

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

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

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

  return { telemetry, status }
}
