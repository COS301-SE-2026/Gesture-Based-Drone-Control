import { useCallback, useState } from "react"
import { getWsUrl } from "@/lib/api"
import { useWebSocket } from "./useWebSocket"
import {
  formatGestureEvent,
  formatClockTime,
} from "@/constants/GestureCommands"

/**
 * Livve log of gesture -> command transitions from api/input/ws/gesture/events
 *
 * The backend already does de-duplication, it records one event when a
 * gesture starts being held, not one per frame. So a gesture helf for five
 * seconds is a single entry here and switching to another gesture adds
 * exactly one more
 *
 * newest first entries
 */

const MAX_ENTRIES = 50

function toEntry(event) {
  const seconds = typeof event.timestamp === "number" ? event.timestamp : null

  return {
    id: `gesture-${event.id}`,
    action: formatGestureEvent(event),
    timestamp: formatClockTime(seconds),
    at: seconds !== null ? seconds * 1000 : Date.now(),
    source: event.source ?? "gesture",
    command: event.command,
    confidence: event.confidence,
  }
}

export function useGestureCommandLog(
  wsUrl = getWsUrl("/api/input/ws/gesture/events")
) {
  const [entries, setEntries] = useState([])

  const onMessage = useCallback((message) => {
    let payload
    try {
      payload = JSON.parse(message.data)
    } catch (err) {
      console.error("useGestureCommandLog: failed to parse event", err)
      return
    }

    if (payload?.type === "gesture_event_history") {
      const backlog = Array.isArray(payload.events) ? payload.events : []
      setEntries(backlog.map(toEntry).reverse().slice(0, MAX_ENTRIES))
      return
    }

    if (payload?.type !== "gesture_event") return

    setEntries((prev) => {
      const entry = toEntry(payload)
      // reconnects replay the history, so guard against double inserts
      if (prev.some((existing) => existing.id === entry.id)) return prev
      return [entry, ...prev].slice(0, MAX_ENTRIES)
    })
  }, [])

  const { status } = useWebSocket(wsUrl, { onMessage })

  return { entries, status }
}
