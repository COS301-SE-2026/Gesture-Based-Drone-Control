import PropTypes from "prop-types"
import { Card, Toggle, Label } from "../atoms"
import { useRecognizerMode } from "../../hooks/useRecognizerMode"
import { useDebug } from "@/context/DebugContext"

//switches backend between rule based and ml recognizers
export default function RecognizerToggle({ className = "" }) {
  const { mode, available, pending, notice, switchMode } = useRecognizerMode()
  const { debugMode } = useDebug()

  const mlAvailable = available.includes("ml")
  const isMl = mode === "ml"
  const loading = mode === null

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label size="md">Recognizer</Label>
            <p className="text-sm text-dim max-w-sm">
              enabling this for machine learning adapts better to varied hand
              shapes but needs the ML service running. Disabled uses rule-based
              gesture detection.
            </p>
          </div>

          <Toggle
            key={mode ?? "loading"}
            checked={isMl}
            disabled={loading || pending || !mlAvailable}
            onChange={(next) => switchMode(next ? "ml" : "rule")}
            aria-label="Use machine learning gesture recognizer"
          />
        </div>
        {notice && debugMode && <p className="text-xs text-error">{notice}</p>}
      </div>
    </Card>
  )
}

RecognizerToggle.propTypes = {
  className: PropTypes.string,
}
