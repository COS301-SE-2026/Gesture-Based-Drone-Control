import PropTypes from "prop-types"
import { Card, Button, Label } from "../atoms"
import { useRecognizerMode } from "@/context/RecognizerContext"
import { useDebug } from "@/context/DebugContext"

//switches backend between rule based and ml recognizers
export default function RecognizerToggle({ className = "" }) {
  const { mode, available, pending, notice, switchMode } = useRecognizerMode()
  const { debugMode } = useDebug()

  const loading = mode === null

  const modes = [
    {
      id: "rule",
      label: "Rule",
      blurb: "counts finger using fixed landmark rules. always available"
    },
    {
      id: "ml",
      label: "ML",
      blurb: "adapts better to varied hand shapes, needs a trained model",
    },
    {
      id: "motion",
      label: "Motion",
      blurb: "reads hand movement, swipes and circles instead of poses",
    },
  ]

  const active = modes.find((m) => m.id === mode)

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label size="md">Recognizer</Label>
            <p className="text-sm text-dim max-w-sm">
              {active
                ? active.blurb
                : "how the backend turns your hands into commands."}
            </p>
          </div>
          <div className="=flex gap-3">
          {mode.map((m) => (
            <Button
              key={m.id}
              variant={mode === m.id ? "default" : "secondary"}
              disabled={loading || pending || !available.includes(m.id)}
              onClick={() => switchMode(m.id)}
              className="flex-1 h-10"
              aria-pressed={mode === m.id}
            >
              {m.label}
            </Button>
          ))}
        </div>

        {notice && debugMode && <p className="text-xs text-error">{notice}</p>}
      </div>
    </Card>
  )
}

RecognizerToggle.propTypes = {
  className: PropTypes.string,
}
