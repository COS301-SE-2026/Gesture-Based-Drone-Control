import PropTypes from "prop-types"
import { Modal, Button } from "../atoms"
import { useState } from "react"
import BasicManeuversSim from "./BasicManeuversSim"
import ObstacleBlocksSim from "./ObstacleBlocksSim"
import GestureCameraFeed from "./GestureCameraFeed"
import FigureEightSim from "./FigureEightSim"

const SIMULATIONS = {
  "basic-maneuvers": BasicManeuversSim,
  "obstacle-blocks": ObstacleBlocksSim,
  "figure-8":FigureEightSim,
}
export default function ExerciseModal({ open, onClose, module, onComplete }) {
  const Simulation = module?.id ? SIMULATIONS[module.id] : undefined
  const [runId, setRunId] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  const resetKey = `${open}:${module?.id}`
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setRunning(false)
    setFinished(false)
    setRunId((r) => r + 1)
  }

  const handleStart = () => {
    setFinished(false)
    setRunning(true)
    setRunId((r) => r + 1)
  }

  const handleFinish = () => {
    setFinished(true)
    onComplete?.()
  }

  const buttonLabel = finished
    ? "Replay Exercise"
    : running
      ? "Restart Exercise"
      : "Start Exercise"

  return (
    <Modal open={open} onClose={onClose} title={module?.title} size="full">
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <span className="eyebrow">{module?.difficulty}</span>
        <p className="text-sm text-dim">{module?.description}</p>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 min-h-0">
            <p className="text-xs text-dim uppercase tracking-widest">
              Gesture Camera
            </p>
            <GestureCameraFeed className="flex-1" />
          </div>

          <div className="flex flex-col gap-2 min-h-0">
            <p className="text-xs text-dim uppercase trackingn-widest">
              Simulation
            </p>
            {Simulation ? (
              open && (
                <Simulation
                  key={runId}
                  running={running}
                  onComplete={handleFinish}
                />
              )
            ) : (
              <div className="flex-1 min-h-0 rounded-lg border border-dashed border-glassBrd bg-surface flex flex-col items-center justify-center gap-3">
                <p className="text-sm font-semibold text-ink">
                  AirSim environment in progress
                </p>
                <p className="text-xs text-dim text-center max-w-xs">
                  lets hope we can get this simulation wired up....faaah
                </p>
                <div className="w-2/3 h-1.5 rounded-full bg-glass overflow-hidden">
                  <div className="h-full w-1/3 bg-[linear-gradient(90deg,var(--red),var(--red-deep))] animate-pulse rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          variant="default"
          disabled={!Simulation}
          onClick={handleStart}
          className="w-full shrink-0"
        >
          {buttonLabel}
        </Button>
      </div>
    </Modal>
  )
}

ExerciseModal.PropTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onComplete: PropTypes.func,
  module: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    difficulty: PropTypes.string,
  }),
}

ExerciseModal.defaultProps = {
  open: false,
  onClose: undefined,
  onComplete: undefined,
  module: null,
}
