import { Toggle } from "../atoms"
import { useTheme } from "@/context/ThemeContext"
import { Sun, Moon } from "lucide-react"

const DarkModeToggle = () => {
  const { isDark, toggleTheme } = useTheme()
  return (
    <div className="flex items-center gap-2">
      <Sun className="w-6 h-6 text-OffBlack dark:text-OffWhite" />
      <Toggle checked={isDark} onChange={toggleTheme} />
      <Moon className="w-6 h-6 text-OffBlack dark:text-OffWhite" />
    </div>
  )
}

export default DarkModeToggle
