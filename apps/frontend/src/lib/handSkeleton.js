//shared hand skeleton cause sonarqube is being difficult
export const HAND_CONNECTIONS = [
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

export const LANDMARK_COLOR = "#ffffff"

//size to element box and clear it
export function prepareCanvas(canvas) {
  const ctx = canvas.getContext("2d")
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  return ctx
}

// math for hand skeleton
export function coverTransform(canvas, video) {
  const vw = video.videoWidth || canvas.width
  const vh = video.videoHeight || canvas.height
  const scale = Math.max(canvas.width / vw, canvas.height / vh)
  const drawW = vw * scale
  const drawH = vh * scale
  return {
    drawW,
    drawH,
    offsetX: (canvas.width - drawW) / 2,
    offsetY: (canvas.height - drawH) / 2,
  }
}

export function toCanvasPoints(landmarks, { offsetX, offsetY, drawW, drawH }) {
  return landmarks.map((lm) => ({
    x: offsetX + lm.x * drawW,
    y: offsetY + lm.y * drawH,
  }))
}

export function drawHand(ctx, points, boneColor) {
  ctx.strokeStyle = boneColor
  ctx.lineWidth = 2
  HAND_CONNECTIONS.forEach(([a, b]) => {
    const p1 = points[a]
    const p2 = points[b]
    if (!p1 || !p2) return
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
  })

  ctx.fillStyle = LANDMARK_COLOR
  points.forEach((p) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    ctx.fill()
  })
}

export function base64ToBlob(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: "image/jpeg" })
}

export async function decodeFrameBitmap(frame) {
  if (!frame?.frame_jpeg) return null
  try {
    return await createImageBitmap(base64ToBlob(frame.frame_jpeg))
  } catch {
    return null
  }
}
