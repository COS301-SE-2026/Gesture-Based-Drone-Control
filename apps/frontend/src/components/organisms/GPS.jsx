import { useEffect, useState, useRef, useMemo } from "react"
import { Card, Label } from "../atoms"
import { DisplacementStat, DroneMap } from "../molecules"
import { useTelemetry } from "@/context/TelemetryContext"
import { useDebug } from "@/context/DebugContext"

const DIRECTION = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

const MAX_PATH_POINTS = 200
const MIN_UPDATE_MS = 200

function headingToCardinal(headingDeg) {
  const index = Math.round(headingDeg / 45) % 8
  const result = DIRECTION[index]
  return result
}

const GPS = () => {
  //mock flight path for now ill slot in real data once websocket is wired for telem for adapters
  // const [pathPoints] = useState([
  //   { x_displacement: 0.0, y_displacement: 0.0, altitude_m: 1.5 }, //take off
  //   { x_displacement: 1.0, y_displacement: 0.0, altitude_m: 1.5 }, //move right
  //   { x_displacement: 1.9, y_displacement: 0.9, altitude_m: 2.0 },
  //   { x_displacement: 2.5, y_displacement: 1.8, altitude_m: 3.0 },
  //   { x_displacement: -5.0, y_displacement: 3.6, altitude_m: 2.5 }, //seeing if it works for left movements
  //   { x_displacement: 1.4, y_displacement: 3.9, altitude_m: 1.2 },
  // ])

  //mock telem - matches shavs read_telemetry shape
  // const [telemetry] = useState({
  //   altitude_m: 1.2,
  //   x_displacement: 1.4,
  //   y_displacement: 3.9,
  //   speed_ms: 1.4,
  //   heading_deg: 220,
  //   battery_pct: 67,
  //   is_flying: true,
  //   source: "dummy",
  // })
  const { telemetry, status } = useTelemetry()

  //live fliht path build on the client side from websocket
  const [path, setPath] = useState([])
  const lastUpdateRef = useRef(0)
  const headingDeg = telemetry?.heading_deg
  const mountedRef = useRef(true)

  const telemData = useMemo(() => telemetry, [telemetry])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!telemData || !mountedRef.current) return

    const { x_displacement, y_displacement, altitude_m } = telemData

    if (
      x_displacement === undefined ||
      y_displacement === undefined ||
      altitude_m === undefined ||
      !Number.isFinite(x_displacement) ||
      !Number.isFinite(y_displacement) ||
      !Number.isFinite(altitude_m)
    ) {
      return
    }

    const now = Date.now()
    const timeSince = now - lastUpdateRef.current
    if (timeSince < MIN_UPDATE_MS) return
    lastUpdateRef.current = now

    setPath((prevPath) => {
      const newPoint = {
        x_displacement: x_displacement,
        y_displacement: y_displacement,
        altitude_m: altitude_m,
      }

      //only add if diff from last point to avoid duplicates
      const lastPoint = prevPath[prevPath.length - 1]
      if (
        lastPoint &&
        lastPoint.x_displacement === newPoint.x_displacement &&
        lastPoint.y_displacement === newPoint.y_displacement &&
        lastPoint.altitude_m === newPoint.altitude_m
      ) {
        return prevPath
      }

      let newPath = [...prevPath, newPoint]

      if (newPath.length > MAX_PATH_POINTS) {
        newPath = newPath.slice(-MAX_PATH_POINTS)
      }
      return newPath
    })
  }, [telemData])

  //mem direction calc to prevent rerender
  const direction = useMemo(() => {
    if (typeof headingDeg === "number") {
      return headingToCardinal(headingDeg)
    }
    return undefined
  }, [headingDeg])

  const stats = useMemo(
    () => ({
      altitude: telemetry?.altitude_m,
      xDisplacement: telemetry?.x_displacement,
      yDisplacement: telemetry?.y_displacement,
      speed: telemetry?.speed_ms,
      heading: telemetry?.heading_deg,
    }),
    [
      telemetry?.altitude_m,
      telemetry?.x_displacement,
      telemetry?.y_displacement,
      telemetry?.speed_ms,
      telemetry?.heading_deg,
    ]
  )

  const { debugMode } = useDebug()

  return (
    <div className="p-6 space-y-6">
      {debugMode && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-DarkGrey">Telemetry:</span>
          <span
            className={`font-semibold ${
              status === "open" ? "text-green-500" : "text-yellow-500"
            }`}
          >
            {status}
          </span>
          <span className="text-DarkGrey">Path: {path.length} points</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="glass" className="h-full flex flex-col">
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Flight Path</Label>
              </div>

              <DroneMap
                key={`map-${path.length}`} //force re render on path change
                pathPoints={path}
                headingDeg={headingDeg ?? 0}
                height="600px"
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <DisplacementStat label="Altitude" value={stats.altitude} unit=" m" />
          <DisplacementStat
            label="X Displacement"
            value={stats.xDisplacement}
            unit=" m"
          />
          <DisplacementStat
            label="Y Displacement"
            value={stats.yDisplacement}
            unit=" m"
          />
          <DisplacementStat label="Speed" value={stats.speed} unit=" m/s" />
          <DisplacementStat
            label="Heading"
            value={stats.heading}
            unit=" °"
            decimals={1}
          />
          <DisplacementStat
            label="Direction"
            value={direction}
            unit=""
            decimals={0}
          />
        </div>
      </div>
    </div>
  )
}

export default GPS
