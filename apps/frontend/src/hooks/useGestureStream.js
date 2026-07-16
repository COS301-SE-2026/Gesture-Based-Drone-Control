import { useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "../lib/api"

function buildWsUrl(path) {
  const wsBase = API_BASE_URL.replace(/^http/, "ws")
  return `${wsBase}${path}`
}

export function useGestureStream() {
  const [frame, setFrame] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(buildWsUrl("/api/gestures/stream"))
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    ws.onmessage = (event) => {
      try {
        setFrame(JSON.parse(event.data))
      } catch {
        //well if the frame is wonky then just ignore it man...
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  return { frame, connected }
}
