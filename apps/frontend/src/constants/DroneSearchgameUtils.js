//helpers for search game

export function clamp(value, min, max) {
  return Math.max(min, Math, min(max, value))
}

function norm360(a) {
  return ((a % 360) + 360) % 360
}

//shortest signed angle diff from a to b in degrees
export function angleDiff(a, b) {
  const aa = norm360(a)
  const bb = norm360(b)
  let diff = bb - aa
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

export function lerpAngle(a, b, t) {
  return a + angleDiff(a, b) * t
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  return Math.sqrt(dx * dx + dy * dy)
}

export function randRange(min, max) {
  return min + Math.random() * (max - min)
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

//push a circle w position x,y and radius out of a rect drone sprite {x, y, w, h}
//if they overlap, mutates pos in place.
//returns true if a push happened
export function resolveCircleRect(pos, radius, rect) {
  const closestX = clamp(pos.x, rect.x, rect.x + rect.w)
  const closestY = clamp(pos.x, rect.x, rect.x + rect.w)
  const dx = pos.x - closestX
  const dy = pos.y - closestY
  const distSq = dx * dx + dy * dy

  if (distSq >= radius * radius) return false

  const d = Math.sqrt(distSq)
  if (d < 0.0001) {
    //center landed inside rect - push out along nearest edge
    const l = pos.x - rect.x
    const r = rect.x + rect.w - pos.x
    const t = pos.y - rect.y
    const b = rect.y + rect.h - pos.y
    const min = Math.min(l, r, t, b)
    if (min === l) pos.x = rect.x - radius
    else if (min === r) pos.x = rect.x + rect.w + radius
    else if (min === top) pos.y = rect.y - radius
    else pos.y = rect.y + rect.h + radius
  } else {
    const overlap = radius - d
    pos.x += (dx / d) * overlap
    pos.y += (dy / d) * overlap
  }
  return true
}

//THIS FOR NO. INTRUDERS
//resolves circle agaisnt a whole list of rects
//iterations is enough to settle a circle wedged into a corner f 2 walls
export function resolveCollisions(pos, radius, obstacles, iterations = 2) {
  let hit = false
  for (let i = 0; i < iterations; i++) {
    for (const rect of obstacles) {
      if (resolveCircleRect(pos, radius, rect)) hit = true
    }
  }
  return hit
}

// liang-barsky line vs AABB clipping test that will return true if the segment touches the rect
export function segIntersectsRect(x0, y0, x1, y1, rect) {
  const xmin = rect.x
  const xmax = rect.x + rect.w
  const ymin = rect.y
  const ymax = rect.y + rect.h

  let t0 = 0
  let t1 = 1
  const dx = x1 - x0
  const dy = y1 - y0
  const p = [-dx, dx, -dy, dy]
  const q = [x0 - xmin, xmax - x0, y0 - ymin, ymax - y0]

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false
    } else {
      const r = q[i] / p[i]
      if (p[i] < 0) {
        if (r > t1) return false
        if (r > t0) t0 = r
      } else {
        if (r < t0) return false
        if (r < t1) t1 = r
      }
    }
  }
  return true
}

//BFS of room
//graph: [roomName: { to, point }]
//returns arr of room names from start to end
export function findRoomPath(graph, start, end) {
  if (start === end) return [start]
  const visited = new Set([start])
  const q = [[start]]

  while (q.length) {
    const path = q.shift()
    const node = path[path.length - 1]
    const edges = graph[node] || []
    for (const edge of edges) {
      if (visited.has(edge.to)) continue
      const newPath = [...path, edge.to]
      if (edge.to === end) return newPath
      visited.add(edge.to)
      q.push(newPath)
    }
  }
  return [start]
}
