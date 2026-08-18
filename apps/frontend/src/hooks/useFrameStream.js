import { useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "../lib/api"

export function buildWsUrl(path) {
  const wsBase = API_BASE_URL.replace(/^http/, "ws")
  return `${wsBase}${path}`
}

const BASE_RECONNECT_MS = 500
const MAX_RECONNECT_MS = 5000

export function useFrameStream(
  path,
  { autoReconnect = true, enabled = true } = {}
) {
  const [frame, setFrame] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let cancelled = false
    let attempts = 0
    let retryTimer = null

    const scheduleReconnect = () => {
      if (cancelled || !autoReconnect) return
      const delay = Math.min(
        MAX_RECONNECT_MS,
        BASE_RECONNECT_MS * 2 ** attempts
      )
      attempts += 1
      // NOSONAR
      retryTimer = setTimeout(connect, delay + Math.random() * 250)
    }

    const connect = () => {
      if (cancelled) return

      const ws = new WebSocket(buildWsUrl(path))
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) return
        attempts = 0
        setConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }
        if (message?.type === "error") {
          setError(message.message || "Camera unavailable")
          return
        }
        setFrame(message)
      }
      ws.onerror = () => {
        if (cancelled) return
        setConnected(false)
      }

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        if (cancelled) return
        setConnected(false)
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      const ws = wsRef.current
      wsRef.current = null
      if (!ws) return
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      } else if (ws.readyState === WebSocket.CONNECTING) {
        // never close a socket mid-handshake, wait for it to open first
        ws.addEventListener("open", () => ws.close(), { once: true })
      }
      setFrame(null)
      setConnected(false)
      setError(null)
    }
  }, [path, autoReconnect, enabled])

  if (!enabled) {
    return { frame: null, connected: false, error: null }
  }

  return { frame, connected, error }
}
