import PropTypes from "prop-types"
import { AlertTriangle, BatteryWarning, X } from "lucide-react"

const ICONS = {
  "battery-low": BatteryWarning,
  "speed-high": AlertTriangle,
  "altitude-high": AlertTriangle,
}

const SEVERITY_STYLES = {
  error: {
    border: "border-red/40",
    glow: "shadow-[0_0_32px_rgba(229,56,59,0.18)]",
    icon: "text-red",
    eyebrow: "text-red",
  },
  warning: {
    border: "border-warning/40",
    glow: "shadow-[0_0_32px_rgba(199,119,0,0.18)]",
    icon: "text-warning",
    eyebrow: "text-warning",
  },
}

export default function TelemetryAlerts({ alerts, onDismiss }) {
  if (!alerts.length) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-[300px] pointer-event-none">
      {alerts.map((alert) => {
        const Icon = ICONS[alert.id] ?? AlertTriangle
        const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.warning

        return (
          <div
            key={alert.key}
            className={`
                            pointer-events-auto
                            rounded-xl p-4
                            border ${style.border}
                            bg-[linear-gradient(160deg,var(--glass-2))]
                            backdrop-blur-md backdrop-saturate-150
                            shadow-glass-combo ${style.glow}
                            animate-rise
                        `}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.icon}`} />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[10px] uppercase tracking-[0.2em] ${style.eyebrow}`}
                >
                  Flight Alert
                </p>
                <p className="text-sm font-semibold text-ink mt-0.5">
                  {alert.title}
                </p>
                <p className="text-xs text-dim mt-1 leading-relaxed">
                  {alert.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(alert.key)}
                className="shrink-0 text-dim hover:text-ink transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

TelemetryAlerts.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      id: PropTypes.string.isRequired,
      severity: PropTypes.oneOf(["error", "warning"]).isRequired,
      title: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
    })
  ).isRequired,
  onDismiss: PropTypes.func.isRequired,
}
