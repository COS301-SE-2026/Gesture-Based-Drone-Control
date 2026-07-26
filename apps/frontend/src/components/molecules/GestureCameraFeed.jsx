import { useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { useGestureStream } from "../../hooks/useGestureStream"

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

const SKELETON_COLOR = "#ef4444"
const LANDMARK_COLOR = "#ffffff"
const LABEL_BG = "rgba(11, 9, 10, 0.75)"
const LABEL_TEXT = "#ffffff"

const GestureCameraFeed = ({ className = "" }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const { frame, connected } = useGestureStream()

  useEffect(() => {
    let mediaStream
    navigator.mediaDevices
      .getUserMedia({ video: { ideal: 640 }, height: { ideal: 480 } })
      .then((stream) => {
        mediaStream = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })

      .catch((err) => {
        console.error("Couldn't access the webcam:", err)
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
    //faaah missing bracket
    const ctx = canvas.getContext("2d")
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

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

    const vw = video.videoWidth || canvas.width
    const vh = video.videoHeight || canvas.height
    const scale = Math.max(canvas.width / vw, canvas.height / vh)
    const drawW = vw * scale
    const drawH = vh * scale
    const offsetX = (canvas.width - drawW) / 2
    const offsetY = (canvas.height - drawH) / 2
    frame.hands.forEach((hand) => {
      const points = hand.landmarks.map((lm) => ({
        x: offsetX + lm.x * drawW,
        y: offsetY + lm.y * drawH,
      }))

      // bones
      ctx.strokeStyle = SKELETON_COLOR
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

      // joints
      ctx.fillStyle = LANDMARK_COLOR
      points.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

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
  }, [frame])

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
}

export default GestureCameraFeed
