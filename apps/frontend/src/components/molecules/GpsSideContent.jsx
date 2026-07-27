import { StatusDot, Card } from "../atoms"
import AccountActions from "./AccountActions"
import { useTelemetry } from "@/context/TelemetryContext"

export const GpsSideContent = () => {
  const { telemetry } = useTelemetry()
  const isFlying = telemetry?.is_flying ?? false

  const getMode = () => {
    if (!telemetry) return "No data"

    if (telemetry.source) {
      return (
        telemetry.source.charAt(0).toUpperCase() + telemetry.source.slice(1)
      )
    }

    if (
      telemetry.altitude_m !== undefined &&
      telemetry.x_displacement !== undefined
    ) {
      return "DroneSim"
    }
    return "Dummy"
  }

  const mode = getMode()

  return (
    <>
      <h2 className="text-lg font-bold text-Red dark:text-Red mb-2">
        Relative Path Tracking
      </h2>

      <Card variant="glass">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm text-OffBlack dark:text-OffWhite">
              Current Use Mode
            </p>
            <p className="text-lg text-OffBlack font-bold dark:text-OffWhite">
              {mode}
            </p>
            <p className="text-xs text-DarkGrey">
              {telemetry ? new Date().toLocaleTimeString() : "No data"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot variant={isFlying ? "connected" : "idle"} size="md" />
            <p className="text-sm font-semibold text-OffBlack dark:text-OffWhite">
              {isFlying ? "Airborne" : "Grounded"}
            </p>
          </div>

          <AccountActions />
        </div>
      </Card>
    </>
  )
}

export default GpsSideContent
