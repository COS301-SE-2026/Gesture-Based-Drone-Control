import { createContext, useContext, useState, useCallback } from "react"

const TourContext = createContext(null)

const STORAGE_KEY_FULL = "tour_seen_full"
const storageKeyForPage = (page) => `tour_seen_${page}`

export function TourProvider({ children }) {
  const [activeSteps, setActiveSteps] = useState(null) //so the tour wont be ruuning if its null.. i think
  const [tourKey, setTourKey] = useState(0) //remounts the joyride between runs...um

  const hasSeenFullTour = () =>
    localStorage.getItem(STORAGE_KEY_FULL) === "true"
  const hasSeenPageTour = (page) =>
    localStorage.getItem(storageKeyForPage(page)) === "true"

  const startFullTour = useCallback((allSteps) => {
    setActiveSteps(allSteps)
    setTourKey((k) => k + 1)
  }, [])

  const startPageTour = useCallback((_page, pageSteps) => {
    setActiveSteps(pageSteps)
    setTourKey((k) => k + 1)
  }, [])

  const endTour = useCallback((page) => {
    if (page) localStorage.setItem(storageKeyForPage(page), "true")
    else localStorage.setItem(STORAGE_KEY_FULL, "true")
    setActiveSteps(null)
  }, [])

  return (
    <TourContext.Provider
      value={{
        activeSteps,
        tourKey,
        hasSeenFullTour,
        hasSeenPageTour,
        startFullTour,
        startPageTour,
        endTour,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error("useTour must be used inside TourProvider")
  return ctx
}
