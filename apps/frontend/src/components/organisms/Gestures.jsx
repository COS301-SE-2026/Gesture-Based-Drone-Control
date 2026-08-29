import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  CommandHistory,
  GestureGuide,
  DroneModeCard,
  GestureCameraFeed,
  GestureCalibration,
  DroneFeedPanel,
} from "../molecules"
import { Card, Label } from "../atoms"
import { Battery, Mountain, Wifi, Gauge } from "lucide-react"
import { useTelemetry } from "@/context/TelemetryContext"
import { useCommands } from "@/context/CommandsContext"
import { useDebug } from "@/context/DebugContext"
import { fetchCalibrationStatus } from "@/hooks/useCalibrationStream"
import { useGestureCommandLog } from "@/hooks/useGestureCommandLog"

const MS_TO_KMH = 3.6
const MAX_HISTORY = 50

function fmt(value, digits = 0) {
  return typeof value === "number" ? value.toFixed(digits) : "--"
}

function calibrationLabel(calibrated) {
  if (calibrated === null) return "checking..."
  return calibrated ? "calibrated" : "required"
}

//TODO: this is still mocked for now
const GestureControl = () => {
  const [commands, setCommands] = useState([])
  const manualIdRef = useRef(0)

  const { telemetry, status } = useTelemetry()
  const { sendCommand, status: commandStatus, lastResp } = useCommands()

  // one entry per gesture change, straight from gesture adapter
  const { entries: gestureCommands } = useGestureCommandLog()

  const pushManualCommand = useCallback((action, source) => {
    manualIdRef.current += 1
    const at = Date.now()
    const entry = {
      id: `manual-${manualIdRef.current}`,
      action,
      timestamp: new Date(at).toLocaleTimeString("en-ZA", { hour12: false }),
      at,
      source,
    }
    setCommands((prev) => [entry, ...prev].slice(0, MAX_HISTORY))
  }, [])

  const handleControlAction = useCallback(
    (command) => {
      sendCommand(command, { source: "onscreen" })
    },
    [sendCommand]
  )

  const handleKeyboardResp = (resp) => {
    pushManualCommand(resp.key, "keyboard")
  }

  const commandHistory = useMemo(
    () =>
      [...gestureCommands, ...commands]
        .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
        .slice(0, MAX_HISTORY),
    [gestureCommands, commands]
  )

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
    hasConnected.current = true
    //connectToDrone("dummy")
  }, [])

  //so the way the command history would work is when a backend confirms a command executed, it logs it, not just when a button is pressed
  useEffect(() => {
    if (lastResp?.ok && lastResp.command) {
      // setStae has to be called in use effect here because lastResp is not in this component
      //its basically coming from useCommands in the websocket, so that whenever there is a new response its added to the local log.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      pushManualCommand(lastResp.command, lastResp.source ?? "onscreen")
    }
  }, [lastResp, pushManualCommand])

  const { debugMode } = useDebug()

  return (
    <div className="p-6 space-y-6">
      {debugMode && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-dim">Drone status:</span>
          <span
            className={`font-semibold ${
              connectionStatus === "connected"
                ? "text-success"
                : connectionStatus === "failed"
                  ? "text-error"
                  : "text-warning"
            }`}
          >
            {isConnecting ? "connecting..." : connectionStatus}
          </span>
          {connectionError && (
            <span className="text-error text-xs">{connectionError}</span>
          )}
          <span className="text-dim">Telemetry:</span>
          <span
            className={`font-semibold ${
              status === "open" ? "text-success" : "text-warning"
            }`}
          >
            {status}
          </span>
          <span className="text-dim">Commands:</span>
          <span
            className={`font-semibold ${
              commandStatus === "open" ? "text-success" : "text-warning"
            }`}
          >
            {commandStatus}
          </span>
          <span className="text-dim">Mode:</span>
          <span className="font-semibold text-info">{droneMode}</span>
          {lastResp?.error && (
            <span className="text-semibold text-info">{lastResp.error}</span>
          )}
          <span className="text-dim">Calibration:</span>
          <span
            className={`font-semibold ${
              calibrated ? "text-success" : "text-warning"
            }`}
          >
            {calibrationLabel(calibrated)}
          </span>
        </div>
      )}
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
              <Battery className="w-6 h-6 text-red" />
              <div>
                <p className=" text-xs text-ink uppercase">Battery</p>
                <p className="text-lg font-bold text-ink">
                  {fmt(displayTelem?.battery_pct)}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Wifi className="w-6 h-6 text-red" />
              <div>
                <p className=" text-xs text-ink uppercase">Signal</p>
                <p className="text-lg font-bold text-ink">
                  {/* TODO: this is still mocked for now - theres no signl_pct field on the telem return yet */}
                  100%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Gauge className="w-6 h-6 text-red" />
              <div>
                <p className=" text-xs text-ink uppercase">Speed</p>
                <p className="text-lg font-bold text-ink">
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
              <Mountain className="w-6 h-6 text-red" />
              <div>
                <p className=" text-xs text-ink uppercase">Altitude</p>
                <p className="text-lg font-bold text-ink">
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
                    className="text-xs text-dim hover:text-ink underline underline-offset-2 transition-colors"
                  >
                    Recalibrate
                  </button>
                )}
              </div>

              <GestureCameraFeed className="flex-1" />
            </div>
          </Card>
        )}
        <div className="flex flex-col gap-6 h-full">
          <GestureGuide
            className="flex-1"
            sendCommand={handleControlAction}
            onKeyboardResp={handleKeyboardResp}
          />
          <DroneFeedPanel
            droneMode={droneMode}
            connectionStatus={connectionStatus}
          />
        </div>
      </div>

      <CommandHistory commands={commandHistory} />
    </div>
  )
}

export default GestureControl
