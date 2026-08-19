import { useCameraConsent } from "../context/CameraConsentContext"
import { useFrameStream } from "./useFrameStream"

export function useGestureStream() {
  const { enabled } = useCameraConsent()
  return useFrameStream("/api/gestures/stream", { enabled })
}
