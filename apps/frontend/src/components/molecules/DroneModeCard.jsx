import Button from "../atoms/Button"
import Card from "../atoms/Card"
import Label from "../atoms/Label"

const DroneModeCard = ({
  currentMode = "DroneSim",
  onModeChange = null,
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

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-4 ">
        <Label size="md">Select Drone Mode</Label>

        <div className="grid grid-cols-2 gap-3">
          {modes.map((mode) => (
            <Button
              key={mode.id}
              variant={currentMode === mode.id ? "default" : "secondary"}
              onClick={() => onModeChange && onModeChange(mode.id)}
              className="w-full"
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default DroneModeCard
