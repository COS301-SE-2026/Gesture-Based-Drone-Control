import { createContext } from "react"
import { Theme } from "../lib/motion"

export interface ThemeContextValue {
    theme: Theme
    setTheme: (t: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
    theme: "dark",
    setTheme: () => {},
})