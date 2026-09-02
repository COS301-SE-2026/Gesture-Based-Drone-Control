import { useEffect, useRef, useState } from "react"

const MS_TO_KMH = 3.6

// how long a metric must stay past threshold before surfacing an alert
// and how long it must stay back within a safe margin before we clear it.
// this stops a single noisy telemetry frame from popping/dismissing alerts
const TRIGGER_HOLD_MS = 1200
const CLEAR_HOLD_MS = 1500

const THRESHOLDS = {
  battery: {
    id: "battery-low",
    severity: "error",
    title: "Battery low",
    check: (t) => typeof t.battery_pct === "number" && t.battery_pct < 30,
    clear: (t) => typeof t.battery_pct === "number" && t.battery_pct >= 33, //small hysteresis buffer
    message: (t) =>
      `Battery at ${t.battery_pct.toFixed(0)}%. Please Land soon.`,
  },
  speed: {
    id: "speed-high",
    severity: "warning",
    title: "Speed High",
    check: (t) =>
      typeof t.speed_ms === "number" && t.speed_ms * MS_TO_KMH > 100,
    clear: (t) =>
      typeof t.speed_ms === "number" && t.speed_ms * MS_TO_KMH <= 95,
    message: (t) =>
      `${(t.speed_ms * MS_TO_KMH).toFixed(0)} km/h - consider slowing down.`,
  },
  altitude: {
    id: "altitude-high",
    severity: "warning",
    title: "Altitude High",
    check: (t) => typeof t.altitude_m === "number" && t.altitude_m > 10,
    clear: (t) => typeof t.altitude_m === "number" && t.altitude_m <= 9.5,
    message: (t) =>
      `${t.altitude_m.toFixed(1)}m - You are above the safety height.`,
  },
}

/**
 * watches telem for unsafe conditions and returns a debounced lsit of active alerts
 *
 * debouncing: a cond must hold continuously for that const TRIGGER_HOLD_MS before
 * it becomes an alert, and must stay within the CLEAR_HOLD_MS before the alert goes
 * away. this hopefully avoids the flicker at the threshold boundary.
 */

export function useTelemetryAlerts(telemetry) {
  const [alerts, setAlerts] = useState([])
  const timerRef = useRef({}) // { [key]: { pendingTimeout, clearTimeout }}

  useEffect(() => {
    if (!telemetry) return

    Object.entries(THRESHOLDS).forEach(([key, def]) => {
      const timers = timerRef.current[key] ?? {}
      timerRef.current[key] = timers

      const isActive = alerts.some((a) => a.key === key)
      const triggered = def.check(telemetry)
      const cleared = def.clear(telemetry)

      if (triggered && !isActive) {
        //start the trigger hold ms timer
        if (!timers.pendingTimeout) {
          timers.pendingTimeout = setTimeout(() => {
            setAlerts((prev) =>
              prev.some((a) => a.key === key)
                ? prev
                : [
                    ...prev,
                    {
                      key,
                      id: def.id,
                      severity: def.severity,
                      title: def.title,
                      message: def.message(telemetry),
                    },
                  ]
            )
            timers.pendingTimeout = null
          }, TRIGGER_HOLD_MS)
        }
        //cond still bad cancel clear
        if (timers.clearTimeout) {
          clearTimeout(timers.clearTimeout)
          timers.clearTimeout = null
        }
      } else if (!triggered && timers.pendingTimeout) {
        //cond went await before hold elasped - cancel the pending alert
        clearTimeout(timers.pendingTimeout)
        timers.pendingTimeout = null
      }

      if (isActive) {
        //keep the message fresh while alert is up
        setAlerts((prev) =>
          prev.map((a) =>
            a.key === key ? { ...a, message: def.message(telemetry) } : a
          )
        )

        if (cleared && !timers.clearTimeout) {
          timers.clearTimeout = setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.key !== key))
            timers.clearTimeout = null
          }, CLEAR_HOLD_MS)
        } else if (!cleared && timers.clearTimeout) {
          clearTimeout(timers.clearTimeout)
          timers.clearTimeout = null
        }
      }
    })
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry])

  useEffect(() => {
    const timers = timerRef.current
    return () => {
      Object.values(timers).forEach((t) => {
        if (t.pendingTimeout) clearTimeout(t.pendingTimeout)
        if (t.clearTimeout) clearTimeout(t.clearTimeout)
      })
    }
  }, [])

  const dismiss = (key) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key))
    const timers = timerRef.current[key]
    if (timers?.clearTimeout) clearTimeout(timers.clearTimeout)
    if (timers?.pendingTimeout) clearTimeout(timers.pendingTimeout)
  }

  return { alerts, dismiss }
}
