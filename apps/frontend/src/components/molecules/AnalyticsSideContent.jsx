import { Card } from "../atoms"
import { useState, useEffect } from "react"
import AccountActions from "./AccountActions"
import { useTelemetry } from "@/context/TelemetryContext"

export const AnalyticsSideContent = () => {
  const { telemetry } = useTelemetry()

  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

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
          <p className="text-xs text-dim">{now.toLocaleTimeString()}</p>
        </div>

        <AccountActions />
      </div>
    </Card>
  )
}

export default AnalyticsSideContent
