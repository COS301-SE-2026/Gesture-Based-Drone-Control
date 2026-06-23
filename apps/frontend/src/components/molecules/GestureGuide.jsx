import { useState } from "react"
import PropTypes from "prop-types"
import { Card, Label, Button } from "../atoms"
import { Monitor, Keyboard, Gamepad2, Hand, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, RotateCw, ChevronUp, ChevronDown, PlaneLanding, PlaneTakeoff, CircleDot, OctagonX} from "lucide-react"
import  { useDroneControls } from "../../hooks/useDroneControls"

const tabs = [
  { id : "onscreen", label: "On Screen", icon: Monitor },
  { id : "gestures", label: "Gestures", icon: Hand },
  { id : "keyboard", label: "Keyboard", icon: Keyboard },
  { id : "controller", label: "Controller", icon: Gamepad2 },
]

const controls = {
  onscreen: [
    { icon: ArrowUp, label: "Move Forward", input:"↑ Button", action: "moveForward" },
    { icon: ArrowDown, label: "Move Backward", input:"↓ Button", action: "moveBackward" },
    { icon: ArrowLeft, label: "Move Left", input:"← Button", action: "moveLeft" },
    { icon: ArrowRight, label: "Move Right", input:"→ Button", action: "moveRight"},
    { icon: ChevronUp, label: "Increase Altitude", input:"▲ Button", action: "goUp" },
    { icon: ChevronDown, label: "Decrease Altitude", input:"▼ Button", action: "goDown" },
    { icon: RotateCcw, label: "Rotate Left", input:"⟲ Button", action: "rotateLeft" },
    { icon: RotateCw, label: "Rotate Right", input:"⟳ Button", action: "rotateRight" },
    { icon: PlaneTakeoff, label: "Takeoff", input:"T Button", action: "takeoff" },
    { icon: CircleDot, label: "Hover", input:"H Button", action: "hover" },
    { icon: PlaneLanding, label: "Land", input:"L Button", action: "land" },
    { icon: OctagonX, label: "Emergency Stop", input:"X Button", action: "emergencyStop" },
  ],
  keyboard: [
    { icon: ArrowUp, label: "Move Forward", input:"Up key" },
    { icon: ArrowDown, label: "Move Backward", input:"Down Key" },
    { icon: ArrowLeft, label: "Move Left", input:"Left Key" },
    { icon: ArrowRight, label: "Move Right", input:"Right Key" },
    { icon: ChevronUp, label: "Increase Altitude", input:"W" },
    { icon: ChevronDown, label: "Decrease Altitude", input:"S" },
    { icon: RotateCcw, label: "Rotate Left", input:"A" },
    { icon: RotateCw, label: "Rotate Right", input:"D" },
    { icon: PlaneTakeoff, label: "Takeoff", input:"T" },
    { icon: CircleDot, label: "Hover", input:"Space Key" },
    { icon: PlaneLanding, label: "Land", input:"L" },
    { icon: OctagonX, label: "Emergency Stop", input:"Escape Key" },
  ],
  controller: [
    { icon: ArrowUp, label: "Move Forward", input:"L Stick Up" },
    { icon: ArrowDown, label: "Move Backward", input:"L Stick Down" },
    { icon: ArrowLeft, label: "Move Left", input:"L Stick Left" },
    { icon: ArrowRight, label: "Move Right", input:"L Stick Right" },
    { icon: ChevronUp, label: "Increase Altitude", input:"R Stick Up" },
    { icon: ChevronDown, label: "Decrease Altitude", input:"R Stick Down" },
    { icon: RotateCcw, label: "Rotate Left", input:"R Stick Left" },
    { icon: RotateCw, label: "Rotate Right", input:"R Stick Right" },
    { icon: PlaneTakeoff, label: "Takeoff", input:"Y/triangle" },
    { icon: CircleDot, label: "Hover", input:"X/square" },
    { icon: PlaneLanding, label: "Land", input:"B/circle" },
    { icon: OctagonX, label: "Emergency Stop", input:"A/X" },
  ],
  gestures: [ //come back and fill in inputs once gestures have been mapped to inputs
    { icon: ArrowUp, label: "Move Forward", input:"" },
    { icon: ArrowDown, label: "Move Backward", input:"" },
    { icon: ArrowLeft, label: "Move Left", input:"" },
    { icon: ArrowRight, label: "Move Right", input:"" },
    { icon: ChevronUp, label: "Increase Altitude", input:"" },
    { icon: ChevronDown, label: "Decrease Altitude", input:"" },
    { icon: RotateCcw, label: "Rotate Left", input:"" },
    { icon: RotateCw, label: "Rotate Right", input:"" },
    { icon: PlaneTakeoff, label: "Takeoff", input:"" },
    { icon: CircleDot, label: "Hover", input: "" },
    { icon: PlaneLanding, label: "Land", input:"" },
    { icon: OctagonX, label: "Emergency Stop", input:"" },
  ],
}

const GestureGuide = ({ className = "", onControlAction }) => {
  const [activeTab, setActiveTab] = useState("onscreen")
  const { handleControlPress, isControlActive } = useDroneControls(onControlAction)

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

        {/* control guide list */}
        <div className="grid grid-cols-3 gap-3">
        {controls[activeTab].map(({ icon: Icon, label, input, action }) => (
          <button
            key={label}
            onClick={() => activeTab === "onscreen" && action && handleControlPress(action, label)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 border border-Grey/10 transition-all duration-150 ${
              activeTab === "onscreen" ? "hover:border-Grey/30 hover:bg-OffBlack/5 dark:hover:bg-OffWhite/5 cursor-pointer active:scale-95" : "cursor-default"}
              $ { isControlActive(label) ? "bg-OffBlack/20 dark:bg-OffWhite/20" : "bg-OffBlack/10 dark:bg-OffWhite/5"
              }`
            }
          >
            <Icon className="w-4 h-4 text-Red shrink-0" />
            <span className="text-xs text-OffBlack/70 dark:text-OffWhite/70 flex-1 text-left">
              {label}
            </span>
            <span className="text-xs font-mono font-semibold text-OffBlack dark:text-OffWhite bg-Grey/20 dark:bd-DarkGrey/40 px-2 py-0.5 rounded">
              {input || "Not Mapped"}
            </span>
          </button>
        ))}
      </div>
      </div>
    </Card>
  )
}

GestureGuide.PropTypes = {
  className: PropTypes.string,
  onControlAction: PropTypes.func,
}

GestureGuide.defaultProps = {
  className: "",
  onControlAction: null,
}

export default GestureGuide