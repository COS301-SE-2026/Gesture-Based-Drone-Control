import Card from "../atoms/Card"
import Label from "../atoms/Label"
import StatusDot from "../atoms/StatusDot"
import PropTypes from "prop-types"

const DroneInfoCard = ({
  connected = true,
  droneName = "DroneName",
  model = "DroneModel",
  description = "Professional drone with 4k camera",
  className = "",
}) => {
  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-4">
        <Label size="md">Drone Info</Label>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-DarkGrey uppercase">Status</p>
            <div className="flex items-center gap-2">
              <StatusDot
                variant={connected ? "connected" : "disconnected"}
                size="md"
              />
              <p
                className={`text-sm font-medium ${connected ? "text-green-500" : "text-Red"}`}
              >
                {connected ? "Connected" : "Disconnected"}
              </p>
            </div>
          </div>

          {/* drone info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-DarkGrey uppercase mb-1">Drone Name</p>
              <p className="text-base text-OffBlack dark:text-OffWhite">{droneName}</p>
            </div>

            <div>
              <p className="text-xs text-DarkGrey uppercase mb-1">Model</p>
              <p className="text-base text-OffBlack dark:text-OffWhite">{model}</p>
            </div>
          </div>

          {/* description */}
          <div>
            <p className="text-xs text-DarkGrey uppercase mb-1">Description</p>
            <p className="text-sm text-OffBlack/70 dark:text-OffWhite leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

DroneInfoCard.propTypes = {
  connected: PropTypes.bool,
  droneName: PropTypes.string,
  model: PropTypes.string,
  description: PropTypes.string,
  className: PropTypes.string,
}

DroneInfoCard.defaultProps = {
  connected: true,
  droneName: "DroneName",
  model: "DroneModel",
  description: "Professional drone with 4k camera",
  className: "",
}

export default DroneInfoCard
