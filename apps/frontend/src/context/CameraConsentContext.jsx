import { createContext, useContext } from "react"
export const CameraConsentContext = createContext()

export const useCameraConsent = () => {
  const context = useContext(CameraConsentContext)
  if (!context) {
    throw new Error("useCameraConsent must be used in a CameraConsentProvider")
  }

  return context
}
