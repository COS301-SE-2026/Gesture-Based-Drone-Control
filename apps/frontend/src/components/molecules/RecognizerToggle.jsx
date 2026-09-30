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
      blurb: "counts finger using fixed landmark rules. always available",
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label size="md">Recognizer</Label>
          <p className="text-sm text-dim min-h-[2.5rem] max-w-sm">
            {active
              ? active.blurb
              : "how the backend turns your hands into commands."}
          </p>
        </div>
        <div className="flex w-full gap-1 rounded-lg bg-white/5 p-1">
          {modes.map((m) => {
            const isActive = mode === m.id
            const isDisabled = loading || pending || !available.includes(m.id)

            return (
              <Button
                key={m.id}
                variant={isActive ? "default" : "ghost"}
                disabled={isDisabled}
                onClick={() => switchMode(m.id)}
                aria-pressed={isActive}
                title={isDisabled && !loading ? "not available" : m.blurb}
                className={`h-9 flex-1 text-sm transition-colors ${
                  isDisabled ? "opacity-40" : ""
                }`}
              >
                {m.label}
              </Button>
            )
          })}
        </div>

        {notice && debugMode && <p className="text-xs text-error">{notice}</p>}
      </div>
    </Card>
  )
}

RecognizerToggle.propTypes = {
  className: PropTypes.string,
}
