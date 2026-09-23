import { createContext, useContext } from "react"
export const RecognizerContext = createContext()

export const useRecognizerMode = () => {
    const context = useContext(RecognizerContext)
    if (!context) {
        throw new Error("useRecognizerMode must be used in a RecognizerProvider")
    }

    return context
}
