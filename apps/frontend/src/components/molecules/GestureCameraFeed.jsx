import { useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { useGestureStream } from "../../hooks/useGestureStream"
import {
  prepareCanvas,
  coverTransform,
  toCanvasPoints,
  drawHand,
} from "../../lib/handSkeleton"

const SKELETON_COLOR = "#ef4444"
const LABEL_BG = "rgba(11, 9, 10, 0.75)"
const LABEL_TEXT = "#ffffff"

const GestureCameraFeed = ({
  className = "",
  onFrame = null,
  skeletonColor = SKELETON_COLOR,
}) => {
  const canvasRef = useRef(null)
  const { frame, connected, error } = useGestureStream()

  useEffect(() => {
    if (onFrame) onFrame(frame)
  }, [frame, onFrame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame) return undefined

    let cancelled = false

    const render = async () => {
      let bitmap = null
      if (frame.frame_jpeg) {
        try {
          bitmap = await createImageBitmap(base64ToBlob(frame.frame_jpeg))
        } catch {
          bitmap = null
        }
      }
      if (cancelled) {
        bitmap?.close?.()
        return
      }
      drawFrame(canvas, bitmap, frame, skeletonColor)
      bitmap?.close?.()
    }

    render()
    return () => {
      cancelled = true
    }
  }, [frame, skeletonColor])

  const statusLabel = getStatusLabel(connected, error, frame)

  return (
    <div
      className={`relative w-full h-full bg-OffBlack/50 rounded border border-Grey/20 overflow-hidden min-h-[400px] ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {!frame && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-Grey">
          {error ?? "Waiting for camera..."}
        </div>
      )}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-OffBlack/60 px-3 py-1 rounded-full text-xs text-OffWhite">
        <span
          className={`w-2 h-2 rounded-full ${
            error
              ? "bg-red-500"
              : connected
                ? "bg-green-500 animate-pulse"
                : "bg-Grey"
          }`}
        />
        <span>{statusLabel}</span>
      </div>
    </div>
  )
}

function getStatusLabel(connected, error, frame) {
  if (error) return "Camera unavailable"
  if (!connected) return "Reconnecting..."
  if (!frame) return "Starting camera..."
  return "Active"
}

function base64ToBlob(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: "image/jpeg" })
}

function drawFrame(canvas, bitmap, frame, skeletonColor) {
  const ctx = prepareCanvas(canvas)

  const sourceWidth = frame.frame_width || bitmap?.width || canvas.width
  const sourceHeight = frame.frame_height || bitmap?.height || canvas.height
  const transform = coverTransform(canvas, {
    videoWidth: sourceWidth,
    videoHeight: sourceHeight,
  })

  if (bitmap) {
    ctx.drawImage(
      bitmap,
      transform.offsetX,
      transform.offsetY,
      transform.drawW,
      transform.drawH
    )
  }

  // fps reading, bottom left
  if (typeof frame.fps === "number") {
    drawLabel(ctx, `${frame.fps.toFixed(1)} FPS`, 8, canvas.height - 8)
  }

  if (!frame?.hands?.length) return

  frame.hands.forEach((hand) => {
    const points = toCanvasPoints(hand.landmarks, transform)
    drawHand(ctx, points, skeletonColor)

    // per-hand info label above wrist (landmark 0)
    const wrist = points[0]
    if (!wrist) return
    const confidence = Math.round((hand.confidence ?? 0) * 100)
    const line1 = `${hand.handedness}: ${hand.gesture} (${hand.fingers})`
    const line2 = `${confidence}% spd ${(hand.speed ?? 0).toFixed(2)}`
    drawLabel(ctx, line1, wrist.x, wrist.y - 34, { clamp: true })
    drawLabel(ctx, line2, wrist.x, wrist.y - 14, { clamp: true })
  })
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
  onFrame: PropTypes.func,
  skeletonColor: PropTypes.string,
}

export default GestureCameraFeed
