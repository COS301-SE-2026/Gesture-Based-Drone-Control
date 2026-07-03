import { useState } from "react"
import { Card, Label } from "../atoms"
import { DisplacementStat, DroneMap } from "../molecules"

const DIRECTION = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

function headingToCardinal(headingDeg) {
  const index = Math.round(headingDeg / 45) % 8
  return DIRECTION[index]
}

const GPS = () => {
  //mock flight path for now ill slot in real data once websocket is wired for telem for adapters
  const [pathPoints] = useState([
    { x_displacement: 0.0, y_displacement: 0.0, altitude_m: 1.5 }, //take off
    { x_displacement: 1.0, y_displacement: 0.0, altitude_m: 1.5 }, //move right
    { x_displacement: 1.9, y_displacement: 0.9, altitude_m: 2.0 },
    { x_displacement: 2.5, y_displacement: 1.8, altitude_m: 3.0 },
    { x_displacement: -5, y_displacement: 3.6, altitude_m: 2.5 }, //seeing if it works for left movements
    { x_displacement: 1.4, y_displacement: 3.9, altitude_m: 1.2 },
  ])

  //mock telem - matches shavs read_telemetry shape
  const [telemetry] = useState({
    altitude_m: 1.2,
    x_displacement: 1.4,
    y_displacement: 3.9,
    speed_ms: 1.4,
    heading_deg: 220,
    battery_pct: 67,
    is_flying: true,
    source: "dummy",
  })

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="glass" className="h-full flex flex-col">
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Flight Path</Label>
              </div>

              <DroneMap
                pathPoints={pathPoints}
                headingDeg={telemetry.heading_deg}
                height="600px"
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <DisplacementStat
            label="Altitude"
            value={telemetry.altitude_m}
            unit=" m"
          />
          <DisplacementStat
            label="X Displacement"
            value={telemetry.x_displacement}
            unit=" m"
          />
          <DisplacementStat
            label="Y Displacement"
            value={telemetry.y_displacement}
            unit=" m"
          />
          <DisplacementStat
            label="Speed"
            value={telemetry.speed_ms}
            unit=" m/s"
          />
          <DisplacementStat
            label="Heading"
            value={telemetry.heading_deg}
            unit=" °"
            decimals={1}
          />
          <DisplacementStat
            label="Direction"
            value={headingToCardinal(telemetry.heading_deg)}
            unit=""
            decimals={0}
          />
        </div>
      </div>
    </div>
  )
}

export default GPS
