import {useState,useCallback} from "react"
import {TourContext} from "./TourContext"

const STORAGE_KEY_FULL = "tour_seen_full"
const storageKeyForPage = (page) => `tour_seen_${page}`

export function TourProvider ({children}) {
    const [activeSteps, setActiveSteps] = useState(null)
    const [tourKey, setTourkey] = useState(0)

    const hasSeenFullTour = useCallback(
        () => localStorage.getItem(STORAGE_KEY_FULL) === "true",
        []
    )

    const hasSeenPageTour = useCallback(
        (page) => localStorage.getItem(storageKeyForPage(page)) === "true",
        []
    )

    const startFullTour = useCallback((allSteps) => {
        setActiveSteps(allSteps)
        setTourkey((k) => k + 1)
    },[])

    const startPageTour = useCallback((_page,pageSteps) => {
        setActiveSteps(pageSteps)
        setTourkey((k) => k + 1)
    },[])

    const endTour = useCallback((page) => {
        if (page) localStorage.setItem(storageKeyForPage(page), "true")
            else localStorage.setItem(STORAGE_KEY_FULL, "true")
        setActiveSteps(null)
    },[])

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