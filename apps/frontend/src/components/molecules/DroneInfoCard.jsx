import Card from "../atoms/Card"
import Label from "../atoms/Label"
import PropTypes from "prop-types"

const DroneInfoCard = ({
  droneName = "DroneName",
  model = "DroneModel",
  description = "",
  className = "",
}) => {
  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-4">
        <Label size="md">Drone Info</Label>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            </div>
          </div>

          {/* drone info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-dim uppercase mb-1">Drone Name</p>
              <p className="text-ink">
                {droneName}
              </p>
            </div>

            <div>
              <p className="text-xs text-dim uppercase mb-1">Model</p>
              <p className="text-ink">
                {model}
              </p>
            </div>
          </div>

          {/* description */}
          <div>
            <p className="text-xs text-dim uppercase mb-1">Description</p>
            <p className="text-sm text-ink/70 leading-relaxed">
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
  description: "",
  className: "",
}

export default DroneInfoCard
