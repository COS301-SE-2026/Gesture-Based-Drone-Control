// \apps\frontend\src\hooks\useWebSocket.js

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * an abstraction allowing us to keep a generic websocket connection
 * that can be reused for useTelemetry, useCOmmands, and all other future
 * hooks (gamepad, keyboard, gesture, etc.) such that they do not have to
 * duplicate boilerplate connection management. All WS connections should be
 * handled the same anyways; persisting even when not necesarily active.
 *
 *  - automatic connection
 *  - automatic reconnection using exponential backoff
 *  - clean shutdown as endpoints expect
 *  - exposes the raw websocket if needed
 *  - exposes connection status for components that need it
 */

const MAX_RECONNECT_DELAY_MS = 10000

export function useWebSocket(wsUrl, { onMessage } = {}) {
  // Public connection status

  // connecting || open || closed || error
  const [status, setStatus] = useState("connecting")

  // references persist during rerenders
  const socketRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef(null)
  const isUnmountedRef = useRef(null)
  // store latest url so reconnects use the latest endpoint
  const wsUrlRef = useRef(wsUrl)
  // allows reconnect timers to call connect()
  const connectRef = useRef(null)

  // open a WS connection or reconnect to an existing one
  const connect = useCallback(() => {
    // dont reconnect if component is removed
    if (isUnmountedRef.current) return

    // if socket exists already, dispose and make new
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    // attempt connection
    setStatus("connecting")
    const socket = new WebSocket(wsUrlRef.current)
    socketRef.current = socket

    socket.onopen = () => {
      if (isUnmountedRef.current) return

      reconnectAttemptsRef.current = 0
      setStatus("open") // yay its connected now
    }

    // delegate message processing to the caller
    // this is the 'generic' part. this guy knows nothing. just like me fr
    socket.onmessage = (event) => {
      if (isUnmountedRef.current) return

      if (onMessage) {
        onMessage(event)
      }
    }

    // a socket level error. just log and chuck it.
    socket.onerror = (err) => {
      if (isUnmountedRef.current) return

      console.error("useWebSocket: websocket error", err)
      setStatus("error")
    }

    // connection closed
    // if component not destroyed, try connect again with exp. backoff
    socket.onclose = () => {
      socketRef.current = null

      if (isUnmountedRef.current) return

      setStatus("closed")

      //  backoff 2^current
      const delay = Math.min(
        MAX_RECONNECT_DELAY_MS,
        2 ** reconnectAttemptsRef.current
      )

      reconnectAttemptsRef.current += 1

      reconnectTimeoutRef.current = setTimeout(() => {
        // reconnect if possible (not deleted)
        if (!isUnmountedRef.current && connectRef.current) {
          connectRef.current()
        }
      }, delay) //ugly ahh js
    }
  }, [onMessage]) //ew

  // other stuff extracted from implementations

  // keep latest connect call available for the reconnect timer
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // if url changes, future reconnects use updated
  useEffect(() => {
    wsUrlRef.current = wsUrl
  }, [wsUrl])

  useEffect(() => {
    isUnmountedRef.current = false

    clearTimeout(reconnectTimeoutRef.current)

    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
  }, [])

  /**
   * return the socket reference
   * different hooks send different payloads
   * they implement whatever helper they want
   */
  return { socketRef, status }
}
