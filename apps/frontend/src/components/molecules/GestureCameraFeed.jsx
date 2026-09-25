import { useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { useGestureStream } from "../../hooks/useGestureStream"
import { useCameraConsent } from "../../context/CameraConsentContext"
import { useOverlays } from "../../context/OverlayContext"
import { gestureLabel } from "../../constants/GestureCommands"
import CameraDisabledNotice from "./CameraDisabledNotice"
import {
  prepareCanvas,
  coverTransform,
  toCanvasPoints,
  drawHand,
  decodeFrameBitmap,
} from "../../lib/handSkeleton"

const SKELETON_COLOR = "#ef4444"
const LABEL_BG = "rgba(11, 9, 10, 0.75)"
const LABEL_TEXT = "#ffffff"

const MOTION_COLOR = "rgba(239, 68, 68, 0.55)"
const MOTION_DOT = "#ef4444"

const MOTION_BANNER_HOLD_MS = 1500
const MOTION_DEADZONE_PALMS = 0.35
const MOTION_RANGE_PALMS = 2.0

const CONTAINER_GLASS =
  "relative w-full h-full bg-ink/50 rounded border border-dim overflow-hidden min-h-[16rem] aspect-video"

const GestureCameraFeed = ({
  className = "",
  onFrame = null,
  skeletonColor = SKELETON_COLOR,
}) => {
  const canvasRef = useRef(null)
  const lastMotionRef = useRef({ label: null, at: 0 })
  const { enabled } = useCameraConsent()
  const { skeleton, motionGuide } = useOverlays()
  const { frame, connected, error } = useGestureStream()

  useEffect(() => {
    if (onFrame) onFrame(frame)
  }, [frame, onFrame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame) return undefined

    let cancelled = false

    const render = async () => {
      const bitmap = await decodeFrameBitmap(frame)
      if (cancelled) {
        bitmap?.close?.()
        return
      }
      drawFrame(canvas, bitmap, frame, skeletonColor, {
        skeleton,
        motionGuide,
        motionBanner: readMotionBanner(frame, lastMotionRef),
      })
      bitmap?.close?.()
    }

    render()
    return () => {
      cancelled = true
    }
  }, [frame, skeletonColor, skeleton, motionGuide])

  if (!enabled) {
    return (
      <div
        data-testid="gesture-camera-feed"
        className={`${CONTAINER_GLASS} flex items-center justify-center ${className}`}
      >
        <CameraDisabledNotice />
      </div>
    )
  }
  const statusLabel = getStatusLabel(connected, error, frame)

  return (
    <div
      data-testid="gesture-camera-feed"
      className={`${CONTAINER_GLASS} ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {!frame && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-dim">
          {error ?? "Waiting for camera..."}
        </div>
      )}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-ink/60 px-3 py-1 rounded-full text-xs text-white">
        <span
          className={`w-2 h-2 rounded-full ${statusDotClass(connected, error)}`}
        />
        <span>{statusLabel}</span>
      </div>
    </div>
  )
}

function statusDotClass(connected, error) {
  if (error) return "bg-red-500"
  if (connected) return "bg-green-500 animate-pulse"
  return "bg-dim"
}

function getStatusLabel(connected, error, frame) {
  if (error) return "Camera unavailable"
  if (!connected) return "Reconnecting..."
  if (!frame) return "Starting camera..."
  return "Active"
}

function drawFrame(canvas, bitmap, frame, skeletonColor, overlays) {
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

  if (overlays.motionBanner) {
    drawLabel(ctx, overlays.motionBanner, 8, 26)
  }

  // fps reading, bottom left
  if (typeof frame.fps === "number") {
    drawLabel(ctx, `${frame.fps.toFixed(1)} FPS`, 8, canvas.height - 8)
  }

  if (!frame?.hands?.length) return

  frame.hands.forEach((hand) => {
    const points = toCanvasPoints(hand.landmarks, transform)
    if (overlays.skeleton) drawHand(ctx, points, skeletonColor)

    // per-hand info label above wrist (landmark 0)
    const wrist = points[0]
    if (!wrist) return
    const confidence = Math.round((hand.confidence ?? 0) * 100)
    const line1 = hand.motion
      ? `${hand.handedness}`
      : `${hand.handedness}: ${hand.gesture} (${hand.fingers})`
    const line2 = `${confidence}% spd ${(hand.speed ?? 0).toFixed(2)}`
    drawLabel(ctx, line1, wrist.x, wrist.y - 34, { clamp: true })
    drawLabel(ctx, line2, wrist.x, wrist.y - 14, { clamp: true })

    if (hand.motion && overlays.motionGuide) {
      drawMotionGuide(ctx, points, hand.motion)
    }
  })
}

function readMotionBanner(frame, ref) {
  const hands = frame?.hands ?? []
  if (hands.length && !hands.some((hand) => hand.motion)) {
    ref.current = { label: null, at: 0 }
    return null
  }

  const fired = hands.find((hand) => hand.gesture && hand.gesture !== "UNKNOWN")
  if (fired) {
    ref.current = { label: gestureLabel(fired.gesture), at: Date.now() }
  }

  const { label, at } = ref.current
  if (!label || Date.now() - at > MOTION_BANNER_HOLD_MS) return null
  return label
}

function drawMotionGuide(ctx, points, motion) {
  const wrist = points[0]
  const middleMcp = points[9]
  if (!wrist || !middleMcp) return

  const palm = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y)
  if (palm < 1) return

  const palmPoints = [0, 5, 9, 13, 17].map((i) => points[i]).filter(Boolean)
  if (palmPoints.length < 5) return
  const cx = palmPoints.reduce((sum, p) => sum + p.x, 0) / palmPoints.length
  const cy = palmPoints.reduce((sum, p) => sum + p.y, 0) / palmPoints.length

  const outer = palm * MOTION_RANGE_PALMS
  const inner = palm * MOTION_DEADZONE_PALMS

  ctx.save()
  ctx.strokeStyle = MOTION_COLOR
  ctx.lineWidth = 1.5

  ctx.beginPath()
  ctx.arc(cx, cy, outer, 0, Math.PI * 2)
  ctx.stroke()

  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.arc(cx, cy, inner, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.beginPath()
  ctx.moveTo(cx - outer, cy)
  ctx.lineTo(cx + outer, cy)
  ctx.moveTo(cx, cy - outer)
  ctx.lineTo(cx, cy + outer)
  ctx.stroke()

  const dotX = cx + motion.x * outer
  const dotY = cy + motion.y * outer
  ctx.fillStyle = MOTION_DOT
  ctx.beginPath()
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2)
  ctx.fill()

  if (motion.depth !== 0) {
    ctx.beginPath()
    ctx.arc(
      cx,
      cy,
      inner + Math.abs(motion.depth) * (outer - inner),
      0,
      Math.PI * 2
    )
    ctx.stroke()
  }

  ctx.restore()
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
