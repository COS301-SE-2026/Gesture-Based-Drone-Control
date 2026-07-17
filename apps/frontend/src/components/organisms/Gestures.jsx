import { useState, useEffect } from "react"
import { CommandHistory, GestureGuide, DroneModeCard } from "../molecules"
import { Card, Label } from "../atoms"
import { Battery, Mountain, Wifi, Gauge, Camera } from "lucide-react"
import { useTelemetry } from "@/hooks/useTelemetry"

const MS_TO_KMH = 3.6

function fmt(value, digits = 0) {
  return typeof value === "number" ? value.toFixed(digits) : "--"
}

//TODO: this is still mocked for now
const GestureControl = () => {
  const [commands] = useState([
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe right - move right", timestamp: "18:50:43" },
    { action: "swipe down - move down", timestamp: "18:50:43" },
    { action: "swipe left - move left", timestamp: "18:50:42" },
  ])

  const { telemetry, status } = useTelemetry()

  // //mock data for drone status
  // const droneMetrics = {
  //   battery: 56,
  //   speed: 5.6,
  //   altitude: 72,
  //   signal: 71,
  // }

  const [droneMode, setDroneMode] = useState("DroneSim")
  const [setIsConnecting] = useState(false)
  const [setConnectionStatus] = useState("disconnected")

  //auto connect to airsim when the component is mounted
  useEffect(() => {
    const connectToDrone = async () => {
      setIsConnecting(true)
      try {
        const response = await fetch(
          "http://localhost:3001/api/drone/connect",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adapter: "projectairsim",
              host: "127.0.0.1",
              vehicle_name: "Drone1",
              topics_port: 8989,
              services_port: 8990,
            }),
          }
        )
        const data = await response.json()
        setConnectionStatus(data.connected ? "connected" : "failed")
        console.log("drone connection: ", data)
      } catch (error) {
        console.error("failed to connect to drone:", error)
        setConnectionStatus("failed")
      } finally {
        setIsConnecting(false)
      }
    }

    connectToDrone()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-[1fr_auto] gap-6 items-stretch">
        <Card variant="glass">
          <div className="flex items-center justify-between">
            <Label size="md" className="shrink-0">
              {" "}
              Stats{" "}
            </Label>
            <span className="text-xs text-DarkGrey">telemetry: {status}</span>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap h-full">
            <div className="flex items-center gap-3">
              <Battery className="w-6 h-6 text-Red" />
              <div>
                <p className=" text-xs text-OffBlack dark:text-Grey uppercase">
                  Battery
                </p>
                <p className="text-lg font-bold text-OffBlack dark:text-OffWhite">
                  {fmt(telemetry?.battery_pct)}%
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
                  {/* TODO: this is still mocked for now - theres no signl_pct field on the telem return yet */}
                  71%
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
                  {fmt(
                    typeof telemetry?.speed_ms === "number"
                      ? telemetry.speed_ms * MS_TO_KMH
                      : undefined,
                    1
                  )}{" "}
                  km/h
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
                  {fmt(telemetry?.altitude_m, 1)}m
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

            <div className="relative w-full flex-1 bg-OffBlack/50 rounded border border-Grey/20 overflow-hidden min-h-[400px] flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-OffBlack/40 to-OffBlack/60 flex flex-col items-center justify-center relative">
                <Camera className="w-16 h-16 text-DarkGrey mb-3" />
              </div>
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-OffBlack/60 px-3 py-1 rounded-full text-xs text-OffWhite">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Active</span>
              </div>
            </div>
          </div>
        </Card>

        <GestureGuide className="h-full" />
      </div>

      <CommandHistory commands={commands} />
    </div>
  )
}

export default GestureControl
