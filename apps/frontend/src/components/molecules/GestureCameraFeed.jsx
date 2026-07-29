import { useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { useGestureStream } from "../../hooks/useGestureStream"
import { useWebPreview } from "../../hooks/useWebcamPreview"
import {
  prepareCanvas,
  coverTransform,
  toCanvasPoints,
  drawHand,
} from "../../lib/handSkeleton"

const SKELETON_COLOR = "#ef4444"
const LABEL_BG = "rgba(11, 9, 10, 0.75)"
const LABEL_TEXT = "#ffffff"

const GestureCameraFeed = ({ className = "",onFrame=null, skeletonColor = SKELETON_COLOR, }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const { frame, connected } = useGestureStream()

  useWebPreview(videoRef)
  useEffect(() => {
    if (onFrame) onFrame(frame)
  },[frame, onFrame])

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) {
      return
    }
    //faaah missing bracket
    const ctx = prepareCanvas(canvas)
    if (!frame) {
      return
    }

    // fps reading, bottom left
    if (typeof frame.fps === "number") {
      drawLabel(ctx, `${frame.fps.toFixed(1)} FPS`, 8, canvas.height - 8)
    }

    if (!frame?.hands?.length) {
      return
    }

    const transform = coverTransform(canvas, video)
    frame.hands.forEach((hand) => {
      const points = toCanvasPoints(hand.landmarks, transform)
      drawHand(ctx, points, skeletonColor)

      //per-hand info label above wrist (landmark 0)
      const wrist = points[0]
      if (wrist) {
        const confidence = Math.round((hand.confidence ?? 0) * 100)
        const line1 = `${hand.handedness}: ${hand.gesture} (${hand.fingers})`
        const line2 = `${confidence}% spd ${(hand.speed ?? 0).toFixed(2)}`
        drawLabel(ctx, line1, wrist.x, wrist.y - 34, { clamp: true })
        drawLabel(ctx, line2, wrist.x, wrist.y - 14, { clamp: true })
      }
    })
  }, [frame,skeletonColor])

  return (
    <div
      className={`relative w-full h-full bg-OffBlack/50 rounded border border-Grey/20 overflow-hidden min-h-[400px] ${className}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover -scale-x-100"
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-OffBlack/60 px-3 py-1 rounded-full text-xs text-OffWhite">
        <span
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-Grey"}`}
        />
        <span>{connected ? "Active" : "Disconnected"}</span>
      </div>
    </div>
  )
}

//draws text with dark pill background
// clampp keeps label inside canvas when wrist is near an edge
function drawLabel(ctx, text, x, y, { clamp = false } = {}) {
  const paddingX = 6
  const paddingY = 4
  const fontSize = 13

  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`
  const textWidth = ctx.measureText(text).width
  const boxWidth = textWidth + paddingX * 2
  const boxHeight = fontSize + paddingY * 2

  let bx = x
  let by = y - fontSize - paddingY

  if (clamp) {
    bx = Math.min(Math.max(bx, 0), ctx.canvas.width - boxWidth)
    by = Math.min(Math.max(by, 0), ctx.canvas.height - boxHeight)
  }

  ctx.fillStyle = LABEL_BG
  ctx.fillRect(bx, by, boxWidth, boxHeight)

  ctx.fillStyle = LABEL_TEXT
  ctx.fillText(text, bx + paddingX, by + fontSize + paddingY / 2 - 1)
}

GestureCameraFeed.propTypes = {
  className: PropTypes.string,
  onFrame:PropTypes.func,
  skeletonColor:PropTypes.string,
}

export default GestureCameraFeed
