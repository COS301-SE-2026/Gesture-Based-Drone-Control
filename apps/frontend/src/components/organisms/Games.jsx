import { DroneInfoCard } from "../molecules"

const Games = () => {
  return (
    <div classsName="p-6 space-y-6">
      <div className="max-w-md ml-6">
        <DroneInfoCard
          connected={true}
          droneName="Phantom 4"
          model="DJI PHANTOM 4 PRO"
          description="Professional drone with 4k camera"
        />
      </div>
    </div>
  )
}

export default Games