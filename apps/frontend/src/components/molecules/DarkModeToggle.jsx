import { Toggle } from "../atoms"
import { useTheme } from "@/context/ThemeContext"
import { Sun, Moon } from "lucide-react"

const DarkModeToggle = () => {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center h-9 w-9 rounded-full bg-surface border border-line text-ink hover:border-red transition-colors"
    >
      {isDark ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5" /> }
    </button>
  )
}

export default DarkModeToggle
