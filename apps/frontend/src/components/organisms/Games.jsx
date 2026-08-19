import { DroneInfoCard } from "../molecules"
import FlappyDroneGame from "./FlappyDroneGame"

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

      <div className="max-w-4x1 ml-6">
        <FlappyDroneGame />
      </div>
    </div>
  )
}

export default Games
