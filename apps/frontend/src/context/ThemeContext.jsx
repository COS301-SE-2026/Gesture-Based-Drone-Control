import { createContext, useContext } from "react"

export const ThemeContext = createContext()

// hook for theme
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used in a themeProvider")
  }
  return context
}
