import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import Card from "../atoms/Card"
import Label from "../atoms/Label"
import {
  useCalibrationStream,
  skipCalibration,
  fetchCalibrationStatus,
} from "../../hooks/useCalibrationStream"
import {
  prepareCanvas,
  coverTransform,
  toCanvasPoints,
  drawHand,
} from "../../lib/handSkeleton"

//live gesture calibration UI with ws /api/calibration/stream

const MATCHED_COLOR = "#22c55e"
const UNMATCHED_COLOR = "#ef4444"

// open palm
function prettyGesture(name) {
  if (!name) return ""
  return name
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function connectionDotClass(connected, finished) {
  if (connected) return "bg-green-500 animate-pulse"
  if (finished) return "bg-green-500"
  return "bg-Grey"
}

function connectionLabel(connected, finished) {
  if (finished) return "Complete"
  if (connected) return "Live"
  return "Connecting..."
}

function chipClass(isDone, isCurrent) {
  if (isDone) return "bg-green-500/15 border-green-500/40 text-green-500"
  if (isCurrent) return "bg-Red/15 border-Red/50 text-Red"
  return "bg-Grey/10 border-Grey/20 text-DarkGrey"
}

const GestureCalibration = ({ onComplete, onRestart, className = "" }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const { frame, connected, finished } = useCalibrationStream()

  // full ordered gesture list, from GET /status (not part of the frame payload)
  const [sequence, setSequence] = useState([])
  const [skipping, setSkipping] = useState(false)

  useEffect(() => {
    fetchCalibrationStatus()
      .then((status) => setSequence(status.sequence ?? []))
      .catch(() => {
        //wont render until a frame gives us progress totals
      })
  }, [])

  useEffect(() => {
    let mediaStream
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      })
      .then((stream) => {
        mediaStream = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch((err) => {
        console.error("Couldnt access the wbcam:", err)
      })

    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) {
      return
    }
    const ctx = prepareCanvas(canvas)
    if (!frame?.hands?.length) {
      return
    }

    const transform = coverTransform(canvas, video)
    const passState = frame.phase === "success_display" || frame.matched
    const boneColor = passState ? MATCHED_COLOR : UNMATCHED_COLOR

    frame.hands.forEach((hand) => {
      drawHand(ctx, toCanvasPoints(hand.landmarks, transform), boneColor)
    })
  }, [frame])

  const handleSkip = async () => {
    setSkipping(true)
    try {
      await skipCalibration()
      //backend ends the WS run cleanly oon skip, no cleanup needed in frontend
      onComplete?.("skipped")
    } catch (err) {
      console.error("failed to skip calibration:", err)
      setSkipping(false)
    }
  }

  const phase = frame?.phase
  const windowStats = frame?.window
  const completed = frame?.progress?.completed ?? []
  const total = frame?.progress?.total ?? sequence.length
  const target = frame?.target_gesture
  // gesture just passed shown during 2s success display
  const lastPassed = completed.length ? completed[completed.length - 1] : null

  const ratio = windowStats?.ratio ?? 0
  const requiredRatio = windowStats?.required_ratio ?? 0.8
  const chips = sequence.length ? sequence : completed

  let statusArea
  if (finished) {
    statusArea = (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-green-500">
          ✓ Calibration complete, all {total || completed.length} gestures
          passed. Flight commands are now unlocked.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onComplete?.("completed")}
            className="px-4 py-2 rounded bg-Red text-OffWhite text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="px-4 py-2 rounded border border-Grey/30 text-sm text-OffBlack dark:text-OffWhite hover:bg-Grey/10 transition-colors"
            >
              Recalibrate
            </button>
          )}
        </div>
      </div>
    )
  } else if (phase === "success_display") {
    statusArea = (
      <p className="text-sm font-medium text-green-500">
        ✓ {prettyGesture(lastPassed)} passed!
      </p>
    )
  } else {
    statusArea = (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-OffBlack/80 dark:text-OffWhite">
            {target ? (
              <>
                Show:{" "}
                <span className="font-semibold">{prettyGesture(target)}</span>
              </>
            ) : (
              "Waiting for camera stream..."
            )}
          </p>
          {windowStats && (
            <span className="text-xs text-DarkGrey">
              {windowStats.frames}/{windowStats.min_frames} frames
            </span>
          )}
        </div>

        {/* rolling window match ratio, threshold marker at required ratio */}
        <div className="relative w-full bg-Grey/20 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-200"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor:
                ratio >= requiredRatio ? MATCHED_COLOR : "#eab308",
            }}
          />
          <div
            className="absolute -top-0.5 h-3 w-0.5 bg-OffBlack/60 dark:bg-OffWhite/60"
            style={{ left: `${requiredRatio * 100}%` }}
          />
        </div>
        <p className="text-xs text-DarkGrey">
          Hold the gesture steady, {Math.round(requiredRatio * 100)}% of recent
          frames must match to pass
        </p>
      </div>
    )
  }
  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label size="md">Gesture Calibration</Label>
          <div className="flex items-center gap-2 text-xs text-DarkGrey">
            <span
              className={`w-2 h-2 rounded-full ${connectionDotClass(connected, finished)}`}
            />
            <span>{connectionLabel(connected, finished)}</span>
          </div>
        </div>

        {/* camera and skeleton overlay */}
        <div className="relative w-full bg-OffBlack/50 rounded border border-Grey/20 overflow-hidden min-h-[400px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>
        {/* sequnce chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((gesture) => {
              const isDone = completed.includes(gesture)
              const isCurrent = gesture === target && !finished
              return (
                <span
                  key={gesture}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${chipClass(isDone, isCurrent)}`}
                >
                  {/* ✓ pasted */}
                  {isDone ? "✓ " : ""}
                  {prettyGesture(gesture)}
                </span>
              )
            })}
          </div>
        )}
        {statusArea}
        {/* skip */}
        {!finished && (
          <div className="border-t border-Grey/20 pt-3 flex justify-end">
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="text-xs text-DarkGrey hover:text-OffBlack dark:hover:text-OffWhite underline underline-offset-2 disabled:opacity-50 transition-colors"
            >
              {skipping ? "Skipping..." : "Skip calibration"}
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

GestureCalibration.propTypes = {
  //caled with completed or skipped when user can move on
  onComplete: PropTypes.func,
  // if provided, shows a recalibrate button on the drone screen
  onRestart: PropTypes.func,
  className: PropTypes.string,
}

export default GestureCalibration
