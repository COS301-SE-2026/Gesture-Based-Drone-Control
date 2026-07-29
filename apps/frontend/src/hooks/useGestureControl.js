// apps/frontend/src/hooks/useGestureControl.js

import { useState, useEffect, useCallback } from "react"
import { API_BASE_URL, getWsUrl } from "@/lib/api"
import { useWebSocket } from "./useWebSocket"

const DEFAULT_STATUS = {
  active: false,
  lastGesture: "none",
  lastConfidence: 0,
  idleTimeoutS: 3.0,
  minConfidence: 0.85,
}

/**
 * Allows for gesture based control via the GestureAdapter
 *
 * Unlike keyboard and gamepad controls no websocket is wired up from the frontend. This
 * is because CV runs entirely server side. The hook only needs to:
 * POST /api/input/connect
 * poll GET /api/input/gesture/status for dashboard info
 * POST /api/input/disconnect on disable
 */

export function useGestureControl(enabled) {
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState(DEFAULT_STATUS)

  // connection handling

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    fetch(`${API_BASE_URL}/api/input/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adapter: "gesture" }),
    })
      .then((res) => {
        if (!cancelled && res.ok) {
          setConnected(true)
        }
      })
      .catch((err) => {
        console.error("UseGestureControl: failed to connect adapter ", err)
      })

    // disconnect
    return () => {
      cancelled = true
      setConnected(false)
      setStatus(DEFAULT_STATUS)

      // sendBeacon should survive the page unload whereas fetch would be cancelled
      // fallback to fetch
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${API_BASE_URL}/api/input/disconnect`)
      } else {
        fetch(`${API_BASE_URL}/api/input/disconnect`, {
          method: "POST",
        }).catch(() => {})
      }
    }
  }, [enabled])

  // websocket polling
  const { status: wsStatus } = useWebSocket( // NOSONAR
    getWsUrl("api/input/ws/gesture/status"),
    {
      onMessage(event) {
        const data = JSON.parse(event.data)

        if (!data.active) {
          setStatus(DEFAULT_STATUS)
          return
        }

        setStatus({
          active: data.active,
          lastGesture: data.last_gesture,
          lastConfidence: data.last_confidence,
          idleTimeoutS: data.idle_timeout_s,
          minConfidence: data.min_confidence,
        })
      },
    }
  )

  // runtime config to let UI tune the adapter parameters without reconnecting

  const configure = useCallback((params) => {
    fetch(`${API_BASE_URL}/api/input/gesture/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).catch((err) =>
      console.error("useGestureControl: failed to configure adapter ", err)
    )
  }, [])

  return { connected, status, configure, wsStatus }
}
