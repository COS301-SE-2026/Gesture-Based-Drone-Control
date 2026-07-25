import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import Card from "../atoms/Card"
import Label from "../atoms/Label"
import {
  useCalibrationStream,
  skipCalibration,
  fetchCalibrationStatus,
} from "../../hooks/useCalibrationStream"

//live gesture calibration UI with ws /api/calibration/stream

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
]

const MATCHED_COLOR = "#22c55e"
const LANDMARK_COLOR = "#ffffff"
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
    const ctx = canvas.getContext("2d")
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!frame?.hands?.length) {
      return
    }

    const vw = video.videoWidth || canvas.width
    const vh = video.videoHeight || canvas.height
    const scale = Math.max(canvas.width / vw, canvas.height / vh)
    const drawW = vw * scale
    const drawH = vh * scale
    const offsetX = (canvas.width - drawW) / 2
    const offsetY = (canvas.height - drawH) / 2

    const passState = frame.phase === "success_display" || frame.matched
    const boneColor = passState ? MATCHED_COLOR : UNMATCHED_COLOR

    frame.hands.forEach((hand) => {
      const points = hand.landmarks.map((lm) => ({
        x: offsetX + lm.x * drawW,
        y: offsetY + lm.y * drawH,
      }))

      //bones
      ctx.strokeStyle = boneColor
      ctx.lineWidth = 2
      HAND_CONNECTIONS.forEach(([a, b]) => {
        const p1 = points[a]
        const p2 = points[b]
        if (!p1 || !p2) {
          return
        }

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      })

      //joints
      ctx.fillStyle = LANDMARK_COLOR
      points.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })
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

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label size="md">Gesture Calibration</Label>
          <div className="flex items-center gap-2 text-xs text-DarkGrey">
            <span
              className={`w-2 h-2 rounded-full ${
                connected
                  ? "bg-green-500 animate-pulse"
                  : finished
                    ? "bg-green-500"
                    : "bg-Grey"
              }`}
            />
            <span>
              {finished ? "Complete" : connected ? "Live" : "Connecting..."}
            </span>
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
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isDone
                      ? "bg-green-500/15 border-green-500/40 text-green-500"
                      : isCurrent
                        ? "bg-Red/15 border-Red/50 text-Red"
                        : "bg-Grey/10 border-Grey/20 text-DarkGrey"
                  }`}
                >
                  {/* ✓ pasted */}
                  {isDone ? "✓ " : ""}
                  {prettyGesture(gesture)}
                </span>
              )
            })}
          </div>
        )}
        {/* instruction, state area */}
        {finished ? (
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
        ) : phase === "success_display" ? (
          <p className="text-sm font-medium text-green-500">
            ✓ {prettyGesture(lastPassed)} passed!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-OffBlack/80 dark:text-OffWhite">
                {target ? (
                  <>
                    Show:{" "}
                    <span className="font-semibold">
                      {prettyGesture(target)}
                    </span>
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
              Hold the gesture steady, {Math.round(requiredRatio * 100)}% of
              recent frames must match to pass
            </p>
          </div>
        )}

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
