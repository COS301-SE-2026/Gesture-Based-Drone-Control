import { Card } from "../atoms"
import AccountActions from "./AccountActions"
export const AnalyticsSideContent = () => {
  return (
    <>
      <h2 className="text-lg font-bold text-Red dark:text-Red mb-2">
        Telemetry Analytics
      </h2>

      <Card variant="glass">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm text-OffBlack dark:text-OffWhite">
              Current Use Mode
            </p>
            {/* mocked this for demo 1 */}
            <p className="text-lg text-OffBlack font-bold dark:text-OffWhite">
              Hardware
            </p>
            <p className="text-xs text-DarkGrey">Today, 14:44</p>
          </div>

          <AccountActions />
        </div>
      </Card>
    </>
  )
}

export default AnalyticsSideContent
