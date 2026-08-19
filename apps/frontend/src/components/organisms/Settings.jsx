import { DroneInfoCard } from "../molecules"
import CameraSettingsCard from "../molecules/CameraSettingsCard"

const Settings = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="max-w-md ml-6">
        <DroneInfoCard
          connected={true}
          droneName="Phantom 4"
          model="DJI PHANTOM 4 PRO"
          description="Professional drone with 4k camera"
        />
      </div>
      <div className="max-w-md ml-6">
        <CameraSettingsCard />
      </div>
    </div>
  )
}

export default Settings
