import { useContext } from "react"
import { ThemeContext } from "../context/ThemeContext"

// Access the current theme and setter anywhere below <ThemeProvider>
export default function useTheme() {
    return useContext(ThemeContext)
}
