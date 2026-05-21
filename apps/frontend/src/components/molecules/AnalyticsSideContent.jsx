import { Card, Button } from "../atoms"

export const AnalyticsSideContent = () => {
  return (
    <>
      <h2 className="text-lg font-bold text-Red dark:text-Red mb-2">
        Telemetry Analytics
      </h2>

      <Card variant="glass">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm text-OffBlack dark:text-OffWhite">Current Use Mode</p>
            {/* mocked this for demo 1 */}
            <p className="text-lg text-OffBlack font-bold dark:text-OffWhite">Hardware</p>
            <p className="text-xs text-DarkGrey">Today, 14:44</p>
          </div>

          <div className="flex gap-2 mt-2 pt-2 border-t border-Grey/20">
            <Button variant="secondary">Switch Profile</Button>
            <Button>Logout</Button>
          </div>
        </div>
      </Card>
    </>
  )
}

export default AnalyticsSideContent
