import { DroneInfoCard } from "../molecules"
import { useDebug } from "@/context/DebugContext"
import { Toggle, Label } from "../atoms"
import CameraSettingsCard from "../molecules/CameraSettingsCard"

const Settings = () => {
  const { debugMode, toggle } = useDebug()

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-md ml-6">
        <DroneInfoCard
          connected={true}
          droneName="TELLO"
          model="DJI TELLO EDU"
          description="Professional educational drone with camera features"
        />
      </div>

      <div className="max-w-md ml-6 flex items-center justify-between">
        <div>
          <Label size="sm">DebugMode</Label>
          <p className="text-xs text-dim mt-1">
            Show live connection stats for drone, telem and commands.
          </p>
        </div>
        <Toggle checked={debugMode} onChange={toggle} />
      </div>

      <div className="max-w-md ml-6">
        <CameraSettingsCard />
      </div>
    </div>
  )
}

export default Settings
