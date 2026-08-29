import { useCallback, useEffect, useState } from "react"
import { fetchRecognizerMode, updateRecognizerMode } from "../lib/api"

export function useRecognizerMode() {
  const [mode, setMode] = useState(null)
  const [available, setAvailable] = useState(["rule", "ml"])
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchRecognizerMode()
      .then((data) => {
        if (cancelled) return
        setMode(data.mode)
        if (Array.isArray(data.available)) setAvailable(data.available)
      })
      .catch(() => {
        if (cancelled) return
        setMode("rule")
        setNotice("Could not reach backend")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const switchMode = useCallback(async (next) => {
    setPending(true)
    setNotice(null)
    try {
      const data = await updateRecognizerMode(next)
      setMode(data.mode)
      if (data.mode !== data.requested) {
        setNotice("No trained model on server, staying on rules")
      }
    } catch {
      setNotice("Switch failed")
    } finally {
      setPending(false)
    }
  }, [])

  return { mode, available, pending, notice, switchMode }
}
