import { createContext, useContext } from "react"
export const OverlayContext = createContext()

export const useOverlays = () => {
    const context = useContext(OverlayContext)
    if (!context) {
        throw new Error("useOverlays must be used in an OverlayProvider")
    }

    return context
}