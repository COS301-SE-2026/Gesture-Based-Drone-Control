import { Card } from "../atoms"
import { Plane } from "lucide-react"
import AccountActions from "./AccountActions"

export const SettingsSideContent = () => {
  return (
    <Card variant="glass">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-red" />
          <p className="text-sm font-semibold text-ink">Your Drone</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <p className="text-xs text-dim uppercase mb-1">Drone Model</p>
          <p className="text-ink">DJI Tello Edu</p>
        </div>

        <div>
          <p className="text-sm text-dim leading-relaxed">
            Programmable educational drone with camera features
          </p>
        </div>

        <AccountActions />
      </div>
    </Card>
  )
}

export default SettingsSideContent
