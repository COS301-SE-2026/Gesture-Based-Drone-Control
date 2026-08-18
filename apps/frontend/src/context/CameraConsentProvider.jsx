import { useCallback, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { CameraConsentContext } from "./CameraConsentContext"

const STORAGE_KEY = "camera-consent"

function readStoredConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "granted"
  } catch {
    return false
  }
}

export const CameraConsentProvider = ({ children }) => {
  const [enabled, setEnabled] = useState(readStoredConsent)

  const persist = useCallback((next) => {
    setEnabled(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? "granted" : "denied")
    } catch {
      //consent doesnt survive reload, safe failure
    }
  }, [])

  const value = useMemo(
    () => ({
      enabled,
      enableCamera: () => persist(true),
      disableCamera: () => persist(false),
      setCameraEnabled: persist,
    }),
    [enabled, persist]
  )

  return (
    <CameraConsentContext.Provider value={value}>
      {children}
    </CameraConsentContext.Provider>
  )
}

CameraConsentProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
