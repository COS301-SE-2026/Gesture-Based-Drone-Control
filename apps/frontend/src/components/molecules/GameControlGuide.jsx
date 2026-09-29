import { memo, useState, useEffect } from "react"
import PropTypes from "prop-types"
import { Card, Label } from "../atoms"
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Keyboard,
  Gamepad2,
  Hand,
  RotateCcw,
  RotateCw,
} from "lucide-react"

const ACTIONS = [
  { icon: ArrowUp, label: "Forward" },
  { icon: ArrowDown, label: "Backward" },
  { icon: ArrowLeft, label: "Left" },
  { icon: ArrowRight, label: "Right" },
  { icon: ChevronUp, label: "Up" },
  { icon: ChevronDown, label: "Down" },
  { icon: RotateCw, label: "Clock wise" },
  { icon: RotateCcw, label: "Counter Clock wise" },
]

const METHODS = [
  {
    id: "keyboard",
    label: "Keyboard",
    icon: Keyboard,
    inputs: [
      "Up Arrow",
      "Down Arrow",
      "Left Arrow",
      "Right Arrow",
      "W",
      "S",
      "A",
      "D",
    ],
  },
  {
    id: "gamepad",
    label: "Gamepad",
    icon: Gamepad2,
    inputs: [
      "L Stick Up",
      "L Stick Down",
      "L Stick Left",
      "L Stick Right",
      "R Stick Up",
      "R Stick Down",
      "R Stick left",
      "R Stick Right",
    ],
  },
  {
    id: "gesture",
    label: "Gesture",
    icon: Hand,
    inputs: [
      "1 finger + 1 finger",
      "2 fingers + 2 fingers",
      "2 fingers + Palm",
      "Palm + 2 fingers",
      "Any 1 finger",
      "Any 2 fingers",
      "1 finger + Palm",
      "Palm + 1 finger",
    ],
  },
]

const GameControlGuide = memo(function GameControlGuide({
  activeInput,
  className = "",
}) {
  const [tab, setTab] = useState(activeInput)

  useEffect(() => {
    setTab(activeInput)
  }, [activeInput])

  const method = METHODS.find((m) => m.id === tab) ?? METHODS[0]
  return (
    <Card variant="glass" className={`min-w-0 !p-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-sm">
        <Label size="sm">Controls</Label>

        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-black/20 border border-glassBrd">
          {METHODS.map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200 ${
                tab === id
                  ? "bg-[var(--red)] text-white shadow-[0_0_10px_var(--glow)]"
                  : "text-dim hover:text-ink"
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
        {ACTIONS.map(({ icon: Icon, label: action }, i) => (
          <div
            key={action}
            className="flex flex-col justify-center gap-1 min-w-0 h-14 bg-glass backdrop-blur-sm rounded-md px-2.5 border border-glass"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-3.5 h-3.5 text-red shrink-0" />
              <span className="text-[11px] text-ink/70 truncate text-left">
                {action}
              </span>
            </div>
            <span
              title={method.inputs[i]}
              className="text-[11px] font-mono font-semibold text-ink truncate pl-[1.375rem]"
            >
              {method.inputs[i]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
})

GameControlGuide.propTypes = {
  activeInput: PropTypes.oneOf(["keyboard", "gamepad", "gesture"]),
  className: PropTypes.string,
}

export default GameControlGuide
