import { useState } from "react"
import { CommandHistory, GestureGuide, DroneModeCard, GestureCameraFeed } from "../molecules"
import { Card, Label } from "../atoms"
import { Battery, Mountain, Wifi, Gauge } from "lucide-react"

const GestureControl = () => {
  const [commands] = useState([
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe right - move right", timestamp: "18:50:43" },
    { action: "swipe down - move down", timestamp: "18:50:43" },
    { action: "swipe left - move left", timestamp: "18:50:42" },
  ])

  //mock data for drone status
  const droneMetrics = {
    battery: 56,
    speed: 5.6,
    altitude: 72,
    signal: 71,
  }

  const [droneMode, setDroneMode] = useState("DroneSim")

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-[1fr_auto] gap-6 items-stretch">
        <Card variant="glass">
          <Label size="md" className="shrink-0">
            {" "}
            Stats{" "}
          </Label>
          <div className="flex items-center justify-between gap-4 flex-wrap h-full">
            <div className="flex items-center gap-3">
              <Battery className="w-6 h-6 text-Red" />
              <div>
                <p className=" text-xs text-OffBlack dark:text-Grey uppercase">
                  Battery
                </p>
                <p className="text-lg font-bold text-OffBlack dark:text-OffWhite">
                  {droneMetrics.battery}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Wifi className="w-6 h-6 text-Red" />
              <div>
                <p className=" text-xs text-OffBlack dark:text-Grey uppercase">
                  Signal
                </p>
                <p className="text-lg font-bold text-OffBlack dark:text-OffWhite">
                  {droneMetrics.signal}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Gauge className="w-6 h-6 text-Red" />
              <div>
                <p className=" text-xs text-OffBlack dark:text-Grey uppercase">
                  Speed
                </p>
                <p className="text-lg font-bold text-OffBlack dark:text-OffWhite">
                  {droneMetrics.speed} km/h
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mountain className="w-6 h-6 text-Red" />
              <div>
                <p className=" text-xs text-OffBlack dark:text-Grey uppercase">
                  Altitude
                </p>
                <p className="text-lg font-bold text-OffBlack dark:text-OffWhite">
                  {droneMetrics.altitude}m
                </p>
              </div>
            </div>
          </div>
        </Card>

        <DroneModeCard
          currentMode={droneMode}
          onModeChange={setDroneMode}
          className="w-72"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <Card variant="glass" className="h-full flex flex-col">
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Gesture Detection</Label>
            </div>

            <GestureCameraFeed className ="flex-1"/>
          </div>
        </Card>

        <GestureGuide className="h-full" />
      </div>

      <CommandHistory commands={commands} />
    </div>
  )
}

export default GestureControl
