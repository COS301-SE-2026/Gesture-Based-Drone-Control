import { useState, useRef, useMemo, useCallback } from "react"
import { TelemetryContext } from "./TelemetryContext"
import { useWebSocket } from "@/hooks/useWebSocket"
import { getWsUrl } from "@/lib/api"

const MAX_PATH_POINTS = 200
const PATH_MIN_MS = 200
const MAX_SERIES_POINTS = 60
const SERIES_MIN_MS = 1000
const MIN_STEP_M = 0.05
const MS_TO_KMH = 3.6

export function TelemetryProvider({ children }) {
  const [telemetry, setTelemetry] = useState(null)

  //session data needs to survive the page switches
  const [path, setPath] = useState([])
  const [speedSeries, setSpeedSeries] = useState([])
  const [batterySeries, setBatterySeries] = useState([])
  const [maxAltitude, setMaxAltitude] = useState(0)
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0)
  const [totalDistanceM, setTotalDistanceM] = useState(0)

  const startRef = useRef(null)
  const lastPathRef = useRef(0)
  const lastSeriesRef = useRef(0)
  const lastDistRef = useRef(null)

  const processFrame = (frame) => {
    const now = Date.now()
    if (startRef.current === null) startRef.current = now

    const { x_displacement: x, y_displacement: y, altitude_m: alt } = frame
    const speed = frame.speed_ms
    const battery = frame.battery_pct

    if (Number.isFinite(alt)) setMaxAltitude((p) => Math.max(p, alt))
    if (Number.isFinite(speed)) setMaxSpeedKmh((p) => Math.max(p, speed * MS_TO_KMH))

    if (Number.isFinite(x) && Number.isFinite(y)) {
      const last = lastDistRef.current
      if (last) {
        const d = Math.hypot(x - last.x, y - last.y)
        if (d > MIN_STEP_M) setTotalDistanceM((p) => p + d)
      }
    lastDistRef.current = { x, y }
    }

    if (
      Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(alt) &&
      now - lastPathRef.current >= PATH_MIN_MS
    ) {
      lastPathRef.current = now
      setPath((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.x_displacement === x && last.y_displacement === y && last.altitude_m === alt) {
          return prev
        }
        const next = [...prev, { x_displacement: x, y_displacement: y, altitude_m: alt }]
        return next.length > MAX_PATH_POINTS ? next.slice(-MAX_PATH_POINTS) : next
      })
    }

    if (now - lastSeriesRef.current >= SERIES_MIN_MS) {
      lastSeriesRef.current = now
      const label = `${((now - startRef.current) / 1000).toFixed(1)}s`
      setSpeedSeries((p) => [...p, { time: label, value: speed ?? 0}].slice(-MAX_SERIES_POINTS))
      setBatterySeries((p) => [...p, { time: label, health: battery ?? 0}].slice(-MAX_SERIES_POINTS))
    }
  }

  const { status } = useWebSocket(getWsUrl("/api/drone/ws/telemetry"), {
    onMessage(event) {
      try {
        const frame = JSON.parse(event.data)
        setTelemetry(frame)
        processFrame(frame)
      } catch (err) {
        console.error("TelemetryProvider: failed to parse frame", err)
      }
    },
  })

  const resetSession = useCallback(() => {
    setPath([]); setSpeedSeries([]); setBatterySeries([])
    setMaxAltitude(0); setMaxSpeedKmh(0); setTotalDistanceM(0)
    startRef.current = null
    lastDistRef.current = null
  }, [])

  const value = useMemo(
    () => ({
      telemetry, status,
      path, speedSeries, batterySeries,
      maxAltitude, maxSpeedKmh, totalDistanceM, resetSession
    }),
    [telemetry, status, path, speedSeries, batterySeries,
      maxAltitude, maxSpeedKmh, totalDistanceM, resetSession
    ]
  )

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  )
}
