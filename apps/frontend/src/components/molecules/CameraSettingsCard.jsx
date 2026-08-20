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
            <p className="text-xs text-dim max-w-sm">
              Gesture control needs the camera. It is opened by the app rather
              than the browser, only while a gesture or calibration screen is
              open, and released a few seconds after you leave.
            </p>
          </div>
          <Toggle
            checked={enabled}
            onChange={setCameraEnabled}
            aria-label="Camera"
          />
        </div>

        <p className="text-xs text-dim">
          Status:{" "}
          <span className={enabled ? "text-success" : "text-ink"}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
          {!enabled && " - gesture control is unavailable while camera is off."}
        </p>
      </div>
    </Card>
  )
}

CameraSettingsCard.propTypes = {
  className: PropTypes.string,
}

export default CameraSettingsCard
