import { useState } from "react"
import { CommandHistory, GestureGuide, DroneModeCard } from "../molecules"
import { Card, Label } from "../atoms"
import { Battery, Mountain, Wifi, Gauge, Camera } from "lucide-react"

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
    <div className ="p-6 space-y-6">
      <div className ='grid grid-cols-[1fr_auto] gap-6 items-stretch'>
        <Card variant ="glass">
          <div className ="flex items-center gap-8 flex-wrap h-full">
            <div className = "flex items-center gap-3">
              <Battery className = "w-6 h-6 text-Red"/>
              <div>
                <p className = " text-xs text-OffBlack dark:text-Grey uppercase">Battery</p>
                <p className ="text-lg font-bold text-OffBlack dark:text-OffWhite">{droneMetrics.battery}%</p>
              </div>
            </div>

            <div className = "flex items-center gap-3">
              <Wifi className = "w-6 h-6 text-Red"/>
              <div>
                <p className = " text-xs text-OffBlack dark:text-Grey uppercase">Signal</p>
                <p className ="text-lg font-bold text-OffBlack dark:text-OffWhite">{droneMetrics.signal}%</p>
              </div>
            </div>

            <div className = "flex items-center gap-3">
              <Gauge className = "w-6 h-6 text-Red"/>
              <div>
                <p className = " text-xs text-OffBlack dark:text-Grey uppercase">Speed</p>
                <p className ="text-lg font-bold text-OffBlack dark:text-OffWhite">{droneMetrics.speed}%</p>
              </div>
            </div>

            <div className = "flex items-center gap-3">
              <Mountain className = "w-6 h-6 text-Red"/>
              <div>
                <p className = " text-xs text-OffBlack dark:text-Grey uppercase">Altitude</p>
                <p className ="text-lg font-bold text-OffBlack dark:text-OffWhite">{droneMetrics.altitude}%</p>
              </div>
            </div>

          </div>
        </Card>
        
        <DroneModeCard
        currentMode ={droneMode}
        
      </div>
    </div>
  )
    
}

export default GestureControl
