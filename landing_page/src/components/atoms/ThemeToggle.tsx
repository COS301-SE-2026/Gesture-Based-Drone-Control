import useTheme from "../../hooks/useTheme"
import { Theme } from "../../lib/motion"
import "./ThemeToggle.css"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next: Theme = theme === "dark" ? "light" : "dark"
  return (
    <button
      type="button"
      className="md-toggle"
      onClick={() => setTheme(next)}
      aria-label={"Switch to " + next + " mode"}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" width="16" height="16">
          <circle
            cx="12"
            cy="12"
            r="4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line
              key={a}
              x1="12"
              y1="2.4"
              x2="12"
              y2="5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={"rotate(" + a + " 12 12)"}
            />
          ))}
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            d="M 20 14.5 A 8.5 8.5 0 1 1 9.5 4 A 7 7 0 0 0 20 14.5 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
