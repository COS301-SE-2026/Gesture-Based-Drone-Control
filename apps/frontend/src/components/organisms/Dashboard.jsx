import { useState } from "react"
import { Battery, Mountain, Wifi, Gauge, Camera } from "lucide-react"
import { DroneModeCard, DroneInfoCard, GPSWidget } from "../molecules"
import { Card, Label } from "../atoms"

const Dashboard = () => {
  const [droneMode, setDroneMode] = useState("DroneSim")
  const [heading] = useState(90)

  //mock data for drone status
  const droneMetrics = {
    battery: 56,
    speed: 5.6,
    altitude: 72,
    signal: 71,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 ">
          <DroneModeCard currentMode={droneMode} onModeChange={setDroneMode} />
        </div>

        <div className="col-span-1">
          <DroneInfoCard
            connected={true}
            droneName="Phantom 4"
            model="DJI Phantom 4 pro"
            description="Professional drone with 4k camera"
          />
        </div>

        {/* status box */}
        <div className="col-span-1">
          <Card variant="glass" className="">
            <div className="flex flex-col gap-6">
              <Label size="md" className="dark:text-OffWhite">
                Stats
              </Label>
              <div className="grid grid-cols-2 gap-6">
                {/* battery */}
                <div className="flex flex-cols items-center gap-6">
                  <Battery className="w-8 h-8 text-Red" />
                  <div className="text-center">
                    <p className="text-xs text-OffBlack uppercase mb-1">
                      Battery
                    </p>
                    <p className="text-xl font-bold text-OffBlack dark:text-OffWhite">
                      {droneMetrics.battery}%
                    </p>
                  </div>
                </div>
                {/* signal */}
                <div className="flex flex-cols items-center gap-6">
                  <Wifi className="w-8 h-8 text-Red" />
                  <div className="text-center">
                    <p className="text-xs text-OffBlack uppercase mb-1">
                      Signal
                    </p>
                    <p className="text-xl font-bold text-OffBlack dark:text-OffWhite">
                      {droneMetrics.signal}%
                    </p>
                  </div>
                </div>
                {/* speed */}
                <div className="flex flex-cols items-center gap-6">
                  <Gauge className="w-8 h-8 text-Red" />
                  <div className="text-center">
                    <p className="text-xs text-OffBlack uppercase mb-1">
                      Speed
                    </p>
                    <p className="text-xl font-bold text-OffBlack dark:text-OffWhite">
                      {droneMetrics.speed} km/h
                    </p>
                  </div>
                </div>
                {/* altitude */}
                <div className="flex flex-cols items-center gap-6">
                  <Mountain className="w-8 h-8 text-Red" />
                  <div className="text-center">
                    <p className="text-xs text-OffBlack uppercase mb-1">
                      Altitude
                    </p>
                    <p className="text-xl font-bold text-OffBlack dark:text-OffWhite">
                      {droneMetrics.altitude}m
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      {/* camera feed -> to be implemented */}
      <Card variant="glass">
        <div className="relative w-full h-96 bg-OffBlack/50 rounded-lg border border-Grey/20 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-b from-OffBlack/30 to-OffBlack/50 flex items-center justify-center relative">
            <Camera className="w-8 h-8 text-DarkGrey" />
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-OffBlack/60 px-3 py-1 rounded text-xs text-OffWhite">
              <span className="w-2 h-2 bg-Red rounded-full animate-pulse" />
              02:12
            </div>
          </div>
        </div>
      </Card>
      <GPSWidget heading={heading} />
    </div>
  )
}

export default Dashboard
