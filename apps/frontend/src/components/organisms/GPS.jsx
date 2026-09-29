import { useMemo } from "react"
import { Card, Label } from "../atoms"
import { DisplacementStat, DroneMap } from "../molecules"
import { useTelemetry } from "@/context/TelemetryContext"
import { useDebug } from "@/context/DebugContext"

const DIRECTION = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

function headingToCardinal(headingDeg) {
  const index = Math.round(headingDeg / 45) % 8
  const result = DIRECTION[index]
  return result
}

const GPS = () => {
  //path is accumulated in telemProvider so that it can survive page switches
  const { telemetry, status, path } = useTelemetry()
  const headingDeg = telemetry?.heading_deg

 //mem direction calculation to prevent rerender
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
    heading: telemetry?.heading_deg
  }),
  [
    telemetry?.altitude_m,
    telemetry?.x_displacement,
    telemetry?.y_displacement,
    telemetry?.speed_ms,
    telemetry?.heading_deg
  ]
 )

 const { debugMode } = useDebug()

  return (
    <div className="p-6 space-y-6">
      {debugMode && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-dim">Telemetry:</span>
          <span
            className={`font-semibold ${
              status === "open" ? "text-success" : "text-warning"
            }`}
          >
            {status}
          </span>
          <span className="text-dim">Path: {path.length} points</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" data-tour="flight-path-map">
          <Card variant="glass" className="h-full flex flex-col">
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Flight Path</Label>
              </div>

              <DroneMap
                // key={`map-${path.length}`} //force re render on path change
                pathPoints={path}
                headingDeg={headingDeg ?? 0}
                height="600px"
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4" data-tour="displacement-stats">
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
