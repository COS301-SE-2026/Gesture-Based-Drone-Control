import PropTypes from "prop-types"
import { Card, Label, Toggle } from "../atoms"
import { useOverlays } from "../../context/OverlayContext"

const OverlaySettingsCard = ({ className = "" }) => {
  const { skeleton, motionGuide, setSkeleton, setMotionGuide } = useOverlays()

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label size="md">Hand skeleton</Label>
            <p className="text-sm text-dim max-w-sm">
              Draws the tracked landmarks over the camera feed so you can see
              what the recognizer is picking up.
            </p>
          </div>
          <Toggle
            checked={skeleton}
            onChange={setSkeleton}
            aria-label="Hand skeleton"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label size="md">Motion guide</Label>
            <p className="text-sm text-dim max-w-sm">
              Rings and a crosshair around your palm showing how far you have
              moved from neutral. Motion recognizer only.
            </p>
          </div>
          <Toggle
            checked={motionGuide}
            onChange={setMotionGuide}
            aria-label="Motion guide"
          />
        </div>
      </div>
    </Card>
  )
}

OverlaySettingsCard.propTypes = {
  className: PropTypes.string,
}

export default OverlaySettingsCard
