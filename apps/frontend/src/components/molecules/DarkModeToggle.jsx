import { useTheme } from "@/context/ThemeContext"
import { Sun, Moon } from "lucide-react"
import PropTypes from "prop-types"

const DarkModeToggle = ({ collasped = false }) => {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "relative flex items-center justify-center rounded-full",
        "bg-surface border border-line text-ink",
        "transition-all duration-200 ease-out",
        "hover:border-red hover:-translate-y-0.5 hover:shadow-glass-hover",
        "active:scale-90",
        collasped ? "h-8 w-8" : "h-9 w-9",
      ].join(" ")}
    >
      <Sun
        className={[
          "absolute w-5 h-5 transition-all duration-300 ease-out",
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-50",
        ].join(" ")}
      />
      <Moon
        className={[
          "absolute w-5 h-5 transition-all duration-300 ease-out",
          isDark
            ? "opacity-0 rotate-90 scale-50"
            : "opacity-100 -rotate-0 scale-100",
        ].join(" ")}
      />
    </button>
  )
}

DarkModeToggle.propTypes = {
  collasped: PropTypes.bool,
}

DarkModeToggle.defaultProps = {
  collasped: false,
}

export default DarkModeToggle
