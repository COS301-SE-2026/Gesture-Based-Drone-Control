import { ReactNode, useState } from "react"
import { Theme } from "../lib/motion"
import { ThemeContext } from "./ThemeContext"

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
