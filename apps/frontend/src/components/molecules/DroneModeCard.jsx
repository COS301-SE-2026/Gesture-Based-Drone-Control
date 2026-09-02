import Button from "../atoms/Button"
import Card from "../atoms/Card"
import Label from "../atoms/Label"
import PropTypes from "prop-types"
import { PowerOff } from "lucide-react"

const DroneModeCard = ({
  currentMode = "DroneSim",
  onModeChange = null,
  onDisconnect = null,
  className = "",
}) => {
  const modes = [
    {
      id: "DroneSim",
      label: "DroneSim",
    },
    {
      id: "Hardware",
      label: "Hardware",
    },
  ]

  const isConnected = currentMode !== "None"

  return (
    <Card variant="glass" className={`py-3 ${className}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label size="md">Select Drone Mode</Label>
          {isConnected && (
            <button
              type="button"
              onClick={() => onDisconnect?.()}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-dim hover:text-red hover:bg-red/10 transition-colors"
              aria-label="Disconnect drone"
              title="Disconnect"
            >
              <PowerOff className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {modes.map((mode) => (
            <Button
              key={mode.id}
              variant={currentMode === mode.id ? "default" : "secondary"}
              onClick={() => onModeChange?.(mode.id)}
              className="flex-1 h-10"
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  )
}

DroneModeCard.propTypes = {
  currentMode: PropTypes.oneOf(["None", "DroneSim", "Hardware"]),
  onModeChange: PropTypes.func,
  onDisconnect: PropTypes.func,
  className: PropTypes.string,
}

DroneModeCard.defaultProps = {
  currentMode: "DroneSim",
  onModeChange: null,
  onDisconnect: null,
  className: "",
}

export default DroneModeCard
