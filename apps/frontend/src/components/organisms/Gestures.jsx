import { useState, useEffect, useRef } from "react"
import {
  CommandHistory,
  GestureGuide,
  DroneModeCard,
  GestureCameraFeed,
  GestureCalibration,
} from "../molecules"
import { Card, Label } from "../atoms"
import { Battery, Mountain, Wifi, Gauge } from "lucide-react"
import { useTelemetry } from "@/context/TelemetryContext"
import { useCommands } from "@/context/CommandsContext"
import { fetchCalibrationStatus } from "@/hooks/useCalibrationStream"

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

  //from gesture guide molecule to backend commandType name
  const ACTION_TO_COMMAND = {
    moveForward: "MOVE_FORWARD",
    moveBackward: "MOVE_BACKWARD",
    moveLeft: "MOVE_LEFT",
    moveRight: "MOVE_RIGHT",
    goUp: "MOVE_UP",
    goDown: "MOVE_DOWN",
    rotateLeft: "ROTATE_CCW",
    rotateRight: "ROTATE_CW",
    takeoff: "TAKEOFF",
    land: "LAND",
    hover: "HOVER",
    emergencyStop: "EMERGENCY_STOP",
  }

  const { telemetry, status } = useTelemetry()
  const { sendCommand, status: commandStatus, lastResp } = useCommands()

  const handleControlAcion = (action) => {
    const commandName = ACTION_TO_COMMAND[action]
    if (!commandName) {
      console.warn(
        "GestureControl: no command mapping for this action: ",
        action
      )
      return
    }
    sendCommand(commandName, { source: "onscreen" })
  }

  // //mock data for drone status
  // const droneMetrics = {
  //   battery: 56,
  //   speed: 5.6,
  //   altitude: 72,
  //   signal: 71,
  // }

  const [droneMode, setDroneMode] = useState("DroneSim")
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [connectionError, setConnectionError] = useState("")

  //calibration gate for camera card
  // null = still checking, false = calibration UI, true = normal detection feed
  const [calibrated, setCalibrated] = useState(null)
  // bumping this remounts GestureCalibration, which starts a fresh backend run
  const [calRunKey, setCalRunKey] = useState(0)

  useEffect(() => {
    fetchCalibrationStatus()
      .then((s) => setCalibrated(Boolean(s.is_calibrated)))
      .catch((err) => {
        console.warn("couldnt fetch calibration status:", err)
        //backend unreachable: show the normal feed rather then blowing up the page
        setCalibrated(true)
      })
  }, [])

  const handleRecalibrate = () => {
    setCalRunKey((k) => k + 1)
    setCalibrated(false)
  }

  //hardware isnt wired for now so we dont want to show the stale sim data
  const displayTelem = droneMode === "Hardware" ? null : telemetry

  //auto connect to airsim when the component is mounted

  const connectToDrone = async (adapterType) => {
    setIsConnecting(true)
    setConnectionError("")
    try {
      let requestBody = {
        adapter: adapterType,
        host: "127.0.0.1",
      }

      if (adapterType === "projectairsim") {
        requestBody = {
          ...requestBody,
          vehicle_name: "Drone1",
          topics_port: 8989,
          services_port: 8990,
        }
      } else if (adapterType === "dummy") {
        requestBody = {
          ...requestBody,
          vehicle_name: "Drone-1",
        }
      }
      //add xfly adapter later here

      const response = await fetch("http://localhost:3001/api/drone/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
      const data = await response.json()
      // setConnectionStatus(data.connected ? "connected" : "failed")
      console.log("drone connection: ", data)

      if (data.connected) {
        setConnectionStatus("connected")
        console.log(`connected to ${adapterType} adapter`)
      } else {
        setConnectionStatus("failed")
        setConnectionError(data.message || "connection failed")
        console.error("connection failed: ", data.message)
      }
    } catch (error) {
      console.error("failed to connect to drone:", error)
      setConnectionStatus("failed")
    } finally {
      setIsConnecting(false)
    }
  }

  //handle mode changes
  const handleModeChange = async (mode) => {
    setDroneMode(mode)

    //disconnec curr adapter
    try {
      await fetch("http://localhost:3001/api/drone/disconnect", {
        method: "POST",
      })
      console.log("disconnected from current adapter")
    } catch (error) {
      console.warn("error disconnecting:", error)
    }

    if (mode === "DroneSim") {
      await connectToDrone("projectairsim")
    } else if (mode === "Manual" || mode === "Autonomous") {
      await connectToDrone("dummy")
    }
  }
  //add hardware mode when drone works

  const hasConnected = useRef(false)
  useEffect(() => {
    if (hasConnected.current) return
    //initially connect to dummy for testing
    hasConnected.current = true
    connectToDrone("dummy")
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-DarkGrey">Drone status:</span>
        <span
          className={`font-semibold ${
            connectionStatus === "connected"
              ? "text-green-500"
              : connectionStatus === "failed"
                ? "text-red-500"
                : "text-yellow-500"
          }`}
        >
          {isConnecting ? "connecting..." : connectionStatus}
        </span>
        {connectionError && (
          <span className="text-red-500 text-xs">{connectionError}</span>
        )}
        <span className="text-DarkGrey">Telemetry:</span>
        <span
          className={`font-semibold ${
            status === "open" ? "text-green-500" : "text-yellow-500"
          }`}
        >
          {status}
        </span>
        <span className="text-DarkGrey">Commands:</span>
        <span
          className={`font-semibold ${
            commandStatus === "open" ? "text-green-500" : "text-yellow-500"
          }`}
        >
          {commandStatus}
        </span>
        <span className="text-DarkGrey">Mode:</span>
        <span className="font-semibold text-blue-500">{droneMode}</span>
        {lastResp?.error && (
          <span className="text-semibold text-blue-500">{lastResp.error}</span>
        )}
        <span className="text-DarkGrey">Calibration:</span>
        <span
          className={`font-semibold ${
            calibrated ? "text-green-500" : "text-yellow-500"
          }`}
        >
          {calibrated === null
            ? "checking..."
            : calibrated
              ? "calibrated"
              : "required"}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-6 items-stretch">
        <Card variant="glass">
          <div className="flex items-center justify-between">
            <Label size="md" className="shrink-0">
              {" "}
              Stats{" "}
            </Label>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap h-full">
            <div className="flex items-center gap-3">
              <Battery className="w-6 h-6 text-Red" />
              <div>
                <p className=" text-xs text-OffBlack dark:text-Grey uppercase">
                  Battery
                </p>
                <p className="text-lg font-bold text-OffBlack dark:text-OffWhite">
                  {fmt(displayTelem?.battery_pct)}%
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
                  100%
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
                    typeof displayTelem?.speed_ms === "number"
                      ? displayTelem.speed_ms * MS_TO_KMH
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
                  {fmt(displayTelem?.altitude_m, 1)}m
                </p>
              </div>
            </div>
          </div>
        </Card>

        <DroneModeCard
          currentMode={droneMode}
          onModeChange={handleModeChange}
          className="w-72"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {calibrated === false ? (
          <GestureCalibration
            key={calRunKey}
            className="h-full"
            onComplete={() => setCalibrated(true)}
            onRestart={handleRecalibrate}
          />
        ) : (
          <Card variant="glass" className="h-full flex flex-col">
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">
                  Gesture Detection
                </Label>
                {calibrated && (
                  <button
                    type="button"
                    onClick={handleRecalibrate}
                    className="text-xs text-DarkGrey hover:text-OffBlack dark:hover:text-OffWhite underline underline-offset-2 transition-colors"
                  >
                    Recalibrate
                  </button>
                )}
              </div>

              {calibrated === null ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px] bg-OffBlack/50 rounded border border-Grey/20">
                  <p className="text-sm text-DarkGrey">
                    Checking calibration...
                  </p>
                </div>
              ) : (
                <GestureCameraFeed className="flex-1" />
              )}
            </div>
          </Card>
        )}
        <GestureGuide className="h-full" onControlAction={handleControlAcion} />
      </div>

      <CommandHistory commands={commands} />
    </div>
  )
}

export default GestureControl
