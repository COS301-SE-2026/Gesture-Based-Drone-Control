import PropTypes from "prop-types"
import { Card, Label, Toggle } from "../atoms"
import { useCameraConsent } from "../../context/CameraConsentContext"

//camera on/off for whole app

const CameraSettingsCard = ({ className = "" }) => {
  const { enabled, setCameraEnabled } = useCameraConsent()

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label size="md">Camera</Label>
            <p className="text-sm text-dim max-w-sm">
              Gesture control needs the camera. It is opened by the app rather
              than the browser. Please enable it for camera access to the
              gesture controls.
            </p>
          </div>
          <Toggle
            checked={enabled}
            onChange={setCameraEnabled}
            aria-label="Camera"
          />
        </div>
      </div>
    </Card>
  )
}

CameraSettingsCard.propTypes = {
  className: PropTypes.string,
}

export default CameraSettingsCard
