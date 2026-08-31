import PropTypes from "prop-types"
import { Card, Toggle } from "../atoms"
import { useRecognizerMode } from "../../hooks/useRecognizerMode"

//switches backend between rule based and ml recognizers
export default function RecognizerToggle({ className = "" }) {
  const { mode, available, pending, notice, switchMode } = useRecognizerMode()

  const mlAvailable = available.includes("ml")
  const isMl = mode === "ml"
  const loading = mode === null

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
              <p className="text-sm text-ink">Recognizer</p>
              <p className="text-xs text-dim">
                {loading ? "checking..." : isMl ? "Machine learning" : "Rule-based"}
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
        {notice && <p className="text-xs text-error">{notice}</p>}
      </div>
    </Card>

  )
}

RecognizerToggle.propTypes = {
  className: PropTypes.string,
}
