import { useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "../lib/api"

export function buildWsUrl(path) {
  const wsBase = API_BASE_URL.replace(/^http/, "ws")
  return `${wsBase}${path}`
}

export function useFrameStream(path) {
  const [frame, setFrame] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const ws = new WebSocket(buildWsUrl(path))
    wsRef.current = ws

    ws.onopen = () => {
      if (!cancelled) setConnected(true)
    }
    ws.onclose = () => {
      if (!cancelled) setConnected(false)
    }
    ws.onerror = () => {
      if (!cancelled) setConnected(false)
    }

    ws.onmessage = (event) => {
      if (cancelled) return
      try {
        setFrame(JSON.parse(event.data))
      } catch {
        //ignore wierd frames
      }
    }

    return () => {
      cancelled = true
      wsRef.current = null
      //never close socket still handshaking
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener("open", () => ws.close(), { once: true })
      }
    }
  }, [path])

  return { frame, connected }
}
