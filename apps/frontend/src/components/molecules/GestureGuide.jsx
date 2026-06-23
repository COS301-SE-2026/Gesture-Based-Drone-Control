import { useState } from "react"
import PropTypes from "prop-types"
import { Card, Label, Button } from "../atoms"
import { Monitor, Keyboard, Gamepad2, Hand, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, RotateCw, ChevronUp, ChevronDown, PlaneLanding, PlaneTakeoff, CircleDot, OctagonX} from "lucide-react"

const tabs = [
  { id : "onscreen", label: "On Screen", icon: Monitor },
  { id : "gestures", label: "Gestures", icon: Hand },
  { id : "keyboard", label: "Keyboard", icon: Keyboard },
  { id : "controller", label: "Controller", icon: Gamepad2 },
]

const controls = {
  onscreen: [
    { icon: ArrowUp, label: "Move Forward", input:"↑ Button" },
    { icon: ArrowDown, label: "Move Backward", input:"↓ Button" },
    { icon: ArrowLeft, label: "Move Left", input:"← Button" },
    { icon: ArrowRight, label: "Move Right", input:"→ Button" },
    { icon: ChevronUp, label: "Increase Altitude", input:"▲ Button" },
    { icon: ChevronDown, label: "Decrease Altitude", input:"▼ Button" },
    { icon: RotateCcw, label: "Rotate Left", input:"⟲ Button" },
    { icon: RotateCw, label: "Rotate Right", input:"⟳ Button" },
    { icon: PlaneTakeoff, label: "Takeoff", input:"T Button" },
    { icon: CircleDot, label: "Hover", input:"H Button" },
    { icon: PlaneLanding, label: "Land", input:"L Button" },
    { icon: OctagonX, label: "Emergency Stop", input:"X Button" },
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

const GestureGuide = ({ className = "" }) => {
  const [activeTab, setActiveTab] = useState("onscreen")

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
        {controls[activeTab].map(({ icon: Icon, label, input }) => (
          <div
            key={label}
            className="flex items-center gap-3 bg-OffBlack/10 dark:bg-OffWhite/5 rounded-lg px-3 py-2 boarder boarder-Grey/10"
          >
            <Icon className="w-4 h-4 text-Red shrink-0" />
            <span className="text-xs text-OffBlack/70 dark:text-OffWhite/70 flex-1">
              {label}
            </span>
            <span className="text-xs font-mono font-semibold text-OffBlack dark:text-OffWhite bg-Grey/20 dark:bd-DarkGrey/40 px-2 py-0.5 rounded">
              {input}
            </span>
          </div>
        ))}
      </div>
      </div>
    </Card>
  )
}

GestureGuide.PropTypes = {
  className: PropTypes.string,
}

GestureGuide.defaultProps = {
  className: "",
}

export default GestureGuide