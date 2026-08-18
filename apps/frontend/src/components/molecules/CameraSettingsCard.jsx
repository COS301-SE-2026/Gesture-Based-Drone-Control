import PropTypes from "prop-types"
import Card from "../atoms/Card"
import Label from "../atoms/Label"
import { useCameraConsent } from "../context/CameraConsentContext"

//camera on/off for whole app

const CameraSettingsCard = ({ className = "" }) => {
  const { enabled, setCameraEnabled } = useCameraConsent()

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label size="md">Camera</Label>
            <p className="text-xs text-DarkGrey max-w-sm">
              Gesture control needs the camera. It is opened by the app rather
              than the browser, only while a gesture or calibration screen is
              open, and released a few seconds after you leave.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Camera"
            onClick={() => setCameraEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
                            duration-200 ${
                              enabled ? "bg-green-500" : "bg-Grey/40"
                            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-OffWhite transition-transform 
                        duration-200 ${
                          enabled ? "translate-x-6" : "translate-x-1"
                        }`}
            />
          </button>
        </div>

        <p className="text-xs text-DarkGrey">
          Status:{" "}
          <span
            className={
              enabled ? "text-green-500" : "text-OffBlack dark:text-OffWhite"
            }
          >
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
