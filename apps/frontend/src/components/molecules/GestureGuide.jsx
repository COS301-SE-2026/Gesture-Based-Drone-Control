import { useState, memo } from "react"
import PropTypes from "prop-types"
import { Card, Label, Button, StatusDot } from "../atoms"
import {
  Monitor,
  Keyboard,
  Gamepad2,
  Hand,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  ChevronUp,
  ChevronDown,
  PlaneLanding,
  PlaneTakeoff,
  CircleDot,
  OctagonX,
} from "lucide-react"
import { useDroneControls } from "../../hooks/useDroneControls"
import { useKeyboardControl } from "@/hooks/useKeyboardControl"
import { useGamepadControl } from "@/hooks/useGamepadControl"
import { useGestureControl } from "@/hooks/useGestureControl"
import { useDebug } from "@/context/DebugContext"
import ControllerLayout from "./ControllerLayout" //visual part of the controller which will show when it is swutched to the controller tab

const tabs = [
  { id: "onscreen", label: "On Screen", icon: Monitor },
  { id: "gestures", label: "Gestures", icon: Hand },
  { id: "keyboard", label: "Keyboard", icon: Keyboard },
  { id: "controller", label: "Controller", icon: Gamepad2 },
]

const commonControls = [
  {
    icon: ArrowUp,
    label: "Move Forward",
    action: "moveForward",
  },
  {
    icon: ArrowDown,
    label: "Move Backward",
    action: "moveBackward",
  },
  {
    icon: ArrowLeft,
    label: "Move Left",
    action: "moveLeft",
  },
  {
    icon: ArrowRight,
    label: "Move Right",
    action: "moveRight",
  },
  {
    icon: ChevronUp,
    label: "Increase Altitude",
    action: "goUp",
  },
  {
    icon: ChevronDown,
    label: "Decrease Altitude",
    action: "goDown",
  },
  {
    icon: RotateCcw,
    label: "Rotate Left",
    action: "rotateLeft",
  },
  {
    icon: RotateCw,
    label: "Rotate Right",
    action: "rotateRight",
  },
  {
    icon: PlaneTakeoff,
    label: "Takeoff",
    action: "takeoff",
  },
  {
    icon: CircleDot,
    label: "Hover",
    action: "hover",
  },
  {
    icon: PlaneLanding,
    label: "Land",
    action: "land",
  },
  {
    icon: OctagonX,
    label: "Emergency Stop",
    action: "emergencyStop",
  },
]

const inputMapping = {
  onscreen: [
    "↑ Button",
    "↓ Button",
    "← Button",
    "→ Button",
    "▲ Button",
    "▼ Button",
    "⟲ Button",
    "⟳ Button",
    "T Button",
    "H Button",
    "L Button",
    "X Button",
  ],
  keyboard: [
    "Up Key",
    "Down Key",
    "Left key",
    "Right Key",
    "W",
    "S",
    "A",
    "D",
    "T",
    "Space Key",
    "L",
    "Escape Key",
  ],
  controller: [
    "L Stick Up",
    "L Stick Down",
    "L Stick Left",
    "L Stick Right",
    "R Stick Up",
    "R Stick Down",
    "R Stick Left",
    "R Stick Right",
    "Triangle",
    "Square",
    "Circle",
    "Cross",
  ],
  gestures: [
    "1 finger + 1 finger",
    "2 fingers + 2 fingers",
    "Palm + Right 2 fingers",
    "Palm + Left 2 fingers",
    "Any 1 finger",
    "Any 2 fingers",
    "Palm + Left 1 finger",
    "Palm + Right 1 finger",
    "3 fingers + 3 fingers",
    "Open palm",
    "Fist + Fist",
    "Palm + Palm",
  ],
}

const controls = {
  onscreen: commonControls.map((control, index) => ({
    ...control,
    input: inputMapping.onscreen[index] || "",
  })),
  keyboard: commonControls.map((control, index) => ({
    ...control,
    input: inputMapping.keyboard[index] || "",
  })),
  controller: commonControls.map((control, index) => ({
    ...control,
    input: inputMapping.controller[index] || "",
  })),
  gestures: commonControls.map((control, index) => ({
    ...control,
    input: inputMapping.gestures[index] || "",
  })),
}

const GestureGuide = memo(function GestureGuide({
  className = "",
  sendCommand,
  onKeyboardResp,
}) {
  const [activeTab, setActiveTab] = useState("onscreen")
  const { handleControlPress, isControlActive } = useDroneControls(sendCommand)
  const [isFlying, setIsFlying] = useState(false)
  const { debugMode } = useDebug()

  //wrap handlePress so takeoff/land/emergencyStop also toggle the isFlying
  const handlePress = (action, label) => {
    handleControlPress(action, label)
    if (action === "takeoff") setIsFlying(true)
    if (action === "land" || action === "emergencyStop") setIsFlying(false)
  }

  /**will only be active when the keyboard tab is selected and handles connecting  the backend keyboard input adapter,
    opening the /input/ws/keyboard/socket, and listening for real key events **/
  const { connected: keyboardConnected, status: keyboardStatus } =
    useKeyboardControl(activeTab === "keyboard", onKeyboardResp)

  const { connected: controllerConnected, status: controllerStatus } =
    useGamepadControl(activeTab === "controller")

  const {
    connected: gestureConnected,
    status: gestureStatus,
    wsStatus: gestureWsStatus,
  } = useGestureControl(activeTab === "gestures")

  const adapterInfo = {
    keyboard: {
      name: "Keyboard is active",
      connected: keyboardConnected,
      debugText: keyboardStatus,
    },
    controller: {
      name: "Controller is active",
      connected: controllerConnected,
      debugText: controllerStatus,
    },
    gestures: {
      name: "Gestures is active",
      connected: gestureConnected,
      debugText: `adapter: ${gestureConnected ? "connected" : "disconnected"}  status-ws: ${gestureWsStatus}`,
    },
  }[activeTab]

  const onScreenControls = () => (
    <div className="flex gap-6 py-4">
      <div className="flex flex-col items-center">
        <div className="grid grid-cols-3 gap-2 w-[240px]">
          <div> </div>
          {/* up button for d pad */}
          <Button
            variant={isControlActive("Move Forward") ? "default" : "secondary"}
            icon={ArrowUp}
            onClick={() => handlePress("moveForward", "Move Forward")}
            disabled={!isFlying}
            className="h-16 w-full rounded-lg"
            size="lg"
          />
          <div></div>

          {/* left, hover and right buttons on d pad  */}
          <Button
            variant={isControlActive("Move Left") ? "default" : "secondary"}
            icon={ArrowLeft}
            onClick={() => handlePress("moveLeft", "Move Left")}
            disabled={!isFlying}
            className="h-16 w-full rounded-lg"
            size="lg"
          />

          <Button
            variant={isControlActive("Hover") ? "default" : "secondary"}
            icon={CircleDot}
            onClick={() => handlePress("hover", "Hover")}
            disabled={!isFlying}
            className="h-16 w-full rounded-lg"
            size="lg"
          />

          <Button
            variant={isControlActive("Move Right") ? "default" : "secondary"}
            icon={ArrowRight}
            onClick={() => handlePress("moveRight", "Move Right")}
            disabled={!isFlying}
            className="h-16 w-full rounded-lg"
            size="lg"
          />

          <div></div>
          {/* down button on d pad */}
          <Button
            variant={isControlActive("Move Backward") ? "default" : "secondary"}
            icon={ArrowDown}
            onClick={() => handlePress("moveBackward", "Move Backward")}
            disabled={!isFlying}
            className="h-16 w-full rounded-lg"
            size="lg"
          />
          <div></div>
        </div>
      </div>

      {/* right col with other controls */}
      <div className="flex-1 flex flex-col gap-2">
        {/* altitude and rotation */}
        <div className="flex gap-2">
          <Button
            variant={
              isControlActive("Increase Altitude") ? "default" : "secondary"
            }
            icon={ChevronUp}
            onClick={() => handlePress("goUp", "Increase Altitude")}
            disabled={!isFlying}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />

          <Button
            variant={
              isControlActive("Decrease Altitude") ? "default" : "secondary"
            }
            icon={ChevronDown}
            onClick={() => handlePress("goDown", "Decrease Altitude")}
            disabled={!isFlying}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />

          <Button
            variant={isControlActive("Rotate Left") ? "default" : "secondary"}
            icon={RotateCcw}
            onClick={() => handlePress("rotateLeft", "Rotate Left")}
            disabled={!isFlying}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />

          <Button
            variant={isControlActive("Rotate Right") ? "default" : "secondary"}
            icon={RotateCw}
            onClick={() => handlePress("rotateRight", "Rotate Right")}
            disabled={!isFlying}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />
        </div>

        {/* takeoff and land */}
        <div className="flex gap-2">
          <Button
            variant={isControlActive("Take Off") ? "default" : "secondary"}
            icon={PlaneTakeoff}
            onClick={() => handlePress("takeoff", "Take Off")}
            disabled={isFlying}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />
          <Button
            variant={isControlActive("Land") ? "default" : "secondary"}
            icon={PlaneLanding}
            onClick={() => handlePress("land", "Land")}
            disabled={!isFlying}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />
        </div>

        {/* emergency stop */}
        <Button
          variant={isControlActive("Emergency Stop") ? "default" : "secondary"}
          icon={OctagonX}
          onClick={() => handlePress("emergencyStop", "Emergency Stop")}
          className="w-full h-16 rounded-lg text-sm font-bold"
          size="lg"
        >
          EMERGENCY STOP
        </Button>
      </div>
    </div>
  )

  const otherControls = () => (
    <div className="grid grid-cols-3 gap-3">
      {controls[activeTab].map(({ icon: Icon, label, input }) => (
        <div
          key={label}
          className="flex items-center gap-3 bg-glass backdrop-blur-sm rounded-lg px-3 py-2 border border-glass"
        >
          <Icon className="w-4 h-4 text-red shrink-0" />
          <span className="text-xs text-ink/70 flex-1 text-left">{label}</span>
          <span className="text-xs font-mono font-semibold text-ink bg-dim/20 px-2 py-0.5 rounded">
            {input || "Not Mapped"}
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Label size="md">Control Guide</Label>
          {adapterInfo && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-ink/70">{adapterInfo.name}</span>
              <StatusDot
                variant={adapterInfo.connected ? "connected" : "disconnected"}
              />
            </div>
          )}
        </div>

        {/* tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? "default" : "secondary"}
              size="sm"
              icon={Icon}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        {activeTab === "keyboard" && debugMode && (
          <div className="text-xs font-mono text-dim">
            [ws: {keyboardStatus}]
          </div>
        )}

        {activeTab === "controller" && debugMode && (
          <div className="text-xs font-mono text-dim">
            [ws: {controllerStatus}]
          </div>
        )}

        {activeTab === "gestures" && (
          <div className="flex items-center justify-between text-xs">
            {debugMode && (
              <span className="font-mono text-dim">
                {adapterInfo.debugText}
              </span>
            )}
            {gestureConnected && gestureStatus.active && (
              <span className="font-mono text-ink/60">
                {gestureStatus.lastGesture === "none"
                  ? "no gesture"
                  : gestureStatus.lastGesture.toLowerCase().replace(/_/g, " ")}
              </span>
            )}
          </div>
        )}

        {/* control the content being displayed */}
        {activeTab === "onscreen" ? (
          onScreenControls()
        ) : activeTab === "controller" ? (
          <ControllerLayout />
        ) : (
          otherControls()
        )}
      </div>
    </Card>
  )
})

GestureGuide.propTypes = {
  className: PropTypes.string,
  sendCommand: PropTypes.func,
  onKeyboardResp: PropTypes.func,
}

GestureGuide.defaultProps = {
  className: "",
  sendCommand: null,
  onKeyboardResp: null,
}

export default GestureGuide
