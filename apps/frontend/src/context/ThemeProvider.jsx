import { useEffect, useState, useMemo } from "react"
import PropTypes from "prop-types"
import { ThemeContext } from "./ThemeContext"

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    //initialize from system pref or localStorage
    const stored = localStorage.getItem("theme")
    if (stored) {
      return stored === "dark"
    }
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
  })

  //sync dom and localStorage when the theme changes
  useEffect(() => {
    const htmlElement = document.documentElement
    if (isDark) {
      htmlElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      htmlElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  //this is for when the user changes system changes
  useEffect(() => {
    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)")
    const handle = (e) => {
      if (!localStorage.getItem("theme")) {
        setIsDark(e.matches)
      }
    }

    mediaQuery.addEventListener("change", handle)
    return () => mediaQuery.removeEventListener("change", handle)
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => !prev)
  }

  const value = useMemo(
    () => ({
      isDark,
      setIsDark,
      toggleTheme,
      theme: isDark ? "dark" : "light",
    }),
    [isDark]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
