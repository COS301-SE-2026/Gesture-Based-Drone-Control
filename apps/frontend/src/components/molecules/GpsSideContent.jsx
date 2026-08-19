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
    <Card variant="glass">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm text-ink">Current Use Mode</p>
          <p className="text-lg text-ink font-bold">{mode}</p>
          <p className="text-xs text-DarkGrey">
            {telemetry ? new Date().toLocaleTimeString() : "No data"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot variant={isFlying ? "connected" : "idle"} size="sm" />
          <p className="text-sm font-semibold text-ink">
            {isFlying ? "Airborne" : "Grounded"}
          </p>
        </div>

        <AccountActions />
      </div>
    </Card>
  )
}

export default GpsSideContent
