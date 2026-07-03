import { StatusDot, Card } from "../atoms"
import AccountActions from "./AccountActions"

export const GpsSideContent = () => {
  // TODO:swap for real telemetry once gps page is wired to live data
  const isFlying = true

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
            {/* TODO:make this actually return mode selected */}
            <p className="text-lg text-OffBlack font-bold dark:text-OffWhite">
              Hardware
            </p>
            <p className="text-xs text-DarkGrey">Today, 14:44</p>
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
