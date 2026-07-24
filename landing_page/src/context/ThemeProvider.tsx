import { ReactNode, useMemo, useState } from "react"
import { Theme } from "../lib/motion"
import { ThemeContext } from "./ThemeContext"

export default function ThemeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [theme, setTheme] = useState<Theme>("dark")
  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
