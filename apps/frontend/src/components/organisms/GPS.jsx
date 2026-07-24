import { useEffect, useState, useRef } from "react"
import { Card, Label } from "../atoms"
import { DisplacementStat, DroneMap } from "../molecules"
import { useTelemetry } from "@/context/TelemetryContext"

const DIRECTION = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

const MAX_PATH_POINTS = 200
const MIN_UPDATE_MS = 200

function headingToCardinal(headingDeg) {
  const index = Math.round(headingDeg / 45) % 8
  return DIRECTION[index]
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

  useEffect(() => {
    if (!telemetry) return

    if (
      typeof telemetry.x_displacement !== "number" ||
      typeof telemetry.y_displacement !== "number" ||
      typeof telemetry.altitude_m !== "number"
    ) {
      return
    }

    const now = Date.now()
    if (now - lastUpdateRef.current < MIN_UPDATE_MS) return
    lastUpdateRef.current = now

    setPath((prev) => {
      const next = [
        ...prev,
        {
          x_displacement: telemetry.x_displacement,
          y_displacement: telemetry.y_displacement,
          altitude_m: telemetry.altitude_m,
        },
      ]
      return next.length > MAX_PATH_POINTS ? next.slice(-MAX_PATH_POINTS) : next
    })
  }, [telemetry])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-DarkGrey">Telemetry:</span>
        <span
          className={`font-semibold ${
            status === "open" ? "text-green-500" : "text-yellow-500"
          }`}
        >
          {status}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="glass" className="h-full flex flex-col">
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Flight Path</Label>
              </div>

              <DroneMap
                pathPoints={path}
                headingDeg={telemetry?.heading_deg ?? 0}
                height="600px"
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <DisplacementStat
            label="Altitude"
            value={telemetry?.altitude_m}
            unit=" m"
          />
          <DisplacementStat
            label="X Displacement"
            value={telemetry?.x_displacement}
            unit=" m"
          />
          <DisplacementStat
            label="Y Displacement"
            value={telemetry?.y_displacement}
            unit=" m"
          />
          <DisplacementStat
            label="Speed"
            value={telemetry?.speed_ms}
            unit=" m/s"
          />
          <DisplacementStat
            label="Heading"
            value={telemetry?.heading_deg}
            unit=" °"
            decimals={1}
          />
          <DisplacementStat
            label="Direction"
            value={
              typeof telemetry?.heading_deg === "number"
                ? headingToCardinal(telemetry.heading_deg)
                : undefined
            }
            unit=""
            decimals={0}
          />
        </div>
      </div>
    </div>
  )
}

export default GPS
