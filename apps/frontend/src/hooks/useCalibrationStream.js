import { useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "../lib/api"

/* 
WS client for /api/calibration/stream plus REST helpers for skip/status

Connecting to the WebSocket starts a fresh calibration run on the backend
*any prev result is discarded, so mounting a component that use this hook
is starting calibration
To restart a run, remount the comopnent

Does not auto-reconnect on purpose because the backedn restarts the run
on every new connection, so a reconnect loop would reset the user's progress
forever
Server closes the socket itself once the run is done whoch must not be treated 
as a failure, finished letts the 2 apart
*/

function buildWsUrl(path) {
  const wsBase = API_BASE_URL.replace(/^http/, "ws")
  return `${wsBase}${path}`
}

export async function skipCalibration() {
  const response = await fetch(`${API_BASE_URL}/api/calibration/skip`, {
    method: "POST",
  })
  return response.json()
}

export async function fetchCalibrationStatus() {
  const response = await fetch(`${API_BASE_URL}/api/calibration/status`)
  return response.json()
}

export function useCalibrationStream() {
  //latest CalibrationFramePayload from the server
  const [frame, setFrame] = useState(null)
  const [connected, setConnected] = useState(false)
  //true once a fraame with phase "done" arrives; the server closes right after
  const [finished, setFinished] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const ws = new WebSocket(buildWsUrl("/api/calibration/stream"))
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
        const payload = JSON.parse(event.data)
        setFrame(payload)
        if (payload.phase === "done") setFinished(true)
      } catch {
        // wonky framy just ignore it
      }
    }

    return () => {
      cancelled = true
      wsRef.current = null
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener("open", () => ws.close(), { once: true })
      }
    }
  }, [])
  return { frame, connected, finished }
}
