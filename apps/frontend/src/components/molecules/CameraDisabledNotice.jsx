import PropTypes from "prop-types"
import { useCameraConsent } from "../../context/CameraConsentContext"

const CameraDisabledNotice = ({
  message = "Gesture control needs your camera to read your hand",
  className = "",
}) => {
  const { enableCamera } = useCameraConsent()

  return (
    <div
      data-testid="camera-disabled-notice"
      className={`flex flex-col items-center justify-center gap-3 text-center px-6 ${className}`}
    >
      <p className="text-sm font-medium text-ink">Camera is off</p>
      <p className="text-xs text-dim max-w-xs">{message}</p>
      <button
        type="button"
        onClick={enableCamera}
        className="px-4 py-2 rounded bg-red text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Enable camera
      </button>
      <p className="text-[11px] text-dim max-w-xs">
        The camera is opened by the app not browser, and is released a few
        seconds after you leave this screen. You can turn it off again in
        settings.
      </p>
    </div>
  )
}

CameraDisabledNotice.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string,
}

export default CameraDisabledNotice
