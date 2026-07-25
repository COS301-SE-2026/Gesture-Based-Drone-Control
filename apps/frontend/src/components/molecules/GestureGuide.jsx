import { useState } from "react"
import PropTypes from "prop-types"
import { Card, Label, Button } from "../atoms"
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
import { useKeyboardControl } from "../../hooks/useKeyboardControl"

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
  gestures: ["", "", "", "", "", "", "", "", "", "", "", ""],
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

const GestureGuide = ({ className = "", sendCommand }) => {
  const [activeTab, setActiveTab] = useState("onscreen")
  const { handleControlPress, isControlActive } =
    useDroneControls(sendCommand)

  /**will only be active when the keyboard tab is selected and handles connecting  the backend keyboard input adapter,
    opening the /input/ws/keyboard/socket, and listening for real key events **/
  const { connected: keyboardConnected } = useKeyboardControl(
    activeTab === "keyboard"
  )

  const onScreenControls = () => (
    <div className="flex gap-6 py-4">
      <div className="flex flex-col items-center">
        <div className="grid grid-cols-3 gap-2 w-[240px]">
          <div> </div>
          {/* up button for d pad */}
          <Button
            variant={isControlActive("Move Forward") ? "default" : "secondary"}
            icon={ArrowUp}
            onClick={() => handleControlPress("moveForward", "Move Forward")}
            className="h-16 w-full rounded-lg"
            size="lg"
          />
          <div></div>

          {/* left, hover and right buttons on d pad  */}
          <Button
            variant={isControlActive("Move Left") ? "default" : "secondary"}
            icon={ArrowLeft}
            onClick={() => handleControlPress("moveLeft", "Move Left")}
            className="h-16 w-full rounded-lg"
            size="lg"
          />

          <Button
            variant={isControlActive("Hover") ? "default" : "secondary"}
            icon={CircleDot}
            onClick={() => handleControlPress("hover", "Hover")}
            className="h-16 w-full rounded-lg"
            size="lg"
          />

          <Button
            variant={isControlActive("Move Right") ? "default" : "secondary"}
            icon={ArrowRight}
            onClick={() => handleControlPress("moveRight", "Move Right")}
            className="h-16 w-full rounded-lg"
            size="lg"
          />

          <div></div>
          {/* down button on d pad */}
          <Button
            variant={isControlActive("Move Backward") ? "default" : "secondary"}
            icon={ArrowDown}
            onClick={() => handleControlPress("moveBackward", "Move Backward")}
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
            onClick={() => handleControlPress("goUp", "Increase Altitude")}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />

          <Button
            variant={
              isControlActive("Decrease Altitude") ? "default" : "secondary"
            }
            icon={ChevronDown}
            onClick={() => handleControlPress("goDown", "Decrease Altitude")}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />

          <Button
            variant={isControlActive("Rotate Left") ? "default" : "secondary"}
            icon={RotateCcw}
            onClick={() => handleControlPress("rotateLeft", "Rotate Left")}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />

          <Button
            variant={isControlActive("Rotate Right") ? "default" : "secondary"}
            icon={RotateCw}
            onClick={() => handleControlPress("rotateRight", "Rotate Right")}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />
        </div>

        {/* takeoff and land */}
        <div className="flex gap-2">
          <Button
            variant={isControlActive("Take Off") ? "default" : "secondary"}
            icon={PlaneTakeoff}
            onClick={() => handleControlPress("takeoff", "Take Off")}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />
          <Button
            variant={isControlActive("Land") ? "default" : "secondary"}
            icon={PlaneLanding}
            onClick={() => handleControlPress("land", "Land")}
            className="flex-1 h-12 rounded-lg"
            size="md"
          />
        </div>

        {/* emergency stop */}
        <Button
          variant={isControlActive("Emergency Stop") ? "default" : "secondary"}
          icon={OctagonX}
          onClick={() => handleControlPress("emergencyStop", "Emergency Stop")}
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
          className="flex items-center gap-3 bg-OffBlack/10 dark:bg-OffWhite/5 rounded-lg px-3 py-2 border border-Grey/10"
        >
          <Icon className="w-4 h-4 text-Red shrink-0" />
          <span className="text-xs text-OffBlack/70 dark:text-OffWhite/70 flex-1 text-left">
            {label}
          </span>
          <span className="text-xs font-mono font-semibold text-OffBlack dark:text-OffWhite bg-Grey/20 dark:bd-DarkGrey/40 px-2 py-0.5 rounded">
            {input || "Not Mapped"}
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-6">
        <Label size="md">Control Guide</Label>

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

        {activeTab === "keyboard" && (
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                keyboardConnected ? "bg-green-500 animate-pulse" : "bg-Grey/40"
              }`}
            />
            <span className="text-OffBlack/70 dark:text-OffWhite/70">
              {keyboardConnected
                ? "Kyeboard control active"
                : "Connecting keyboard control..."}
            </span>
          </div>
        )}

        {/* control the content being displayed */}
        {activeTab === "onscreen" ? onScreenControls() : otherControls()}
      </div>
    </Card>
  )
}

GestureGuide.propTypes = {
  className: PropTypes.string,
  sendCommand: PropTypes.func,
}

GestureGuide.defaultProps = {
  className: "",
  sendCommand: null,
}

export default GestureGuide
