// hand skeleton

export type Vec2 = [number, number]
export interface Digit {
  c: number
  s: number
} // curl 0..1 splay
export interface FingerSpec {
  base: Vec2
  segs: number[]
}

export const WRIST: Vec2 = [110, 218]
export const FINGERS: FingerSpec[] = [
  { base: [64, 170], segs: [30, 26, 20] },
  { base: [78, 128], segs: [34, 27, 20] },
  { base: [103, 122], segs: [38, 30, 22] },
  { base: [128, 126], segs: [34, 28, 20] },
  { base: [150, 134], segs: [26, 20, 15] },
]

// one pose = [thumb, index, middle, ring, pinky]
export const POSES: Digit[][] = [
  //open palm - hover
  [
    { c: 0.12, s: -0.72 },
    { c: 0.0, s: 0.16 },
    { c: 0.0, s: -0.2 },
    { c: 0.0, s: 0.12 },
    { c: 0.0, s: 0.28 },
  ],
  //index up -second
  [
    { c: 0.85, s: -0.45 },
    { c: 0.0, s: 0.05 },
    { c: 1.0, s: 0.0 },
    { c: 1.0, s: 0.08 },
    { c: 1.0, s: 0.16 },
  ],
  //V sign - orbit
  [
    { c: 0.9, s: -0.4 },
    { c: 0.03, s: -0.26 },
    { c: 0.03, s: 0.14 },
    { c: 1.0, s: 0.1 },
    { c: 1.0, s: 0.18 },
  ],
  //fist - land
  [
    { c: 0.95, s: -0.35 },
    { c: 1.0, s: -0.08 },
    { c: 1.0, s: 0.0 },
    { c: 1.0, s: 0.08 },
    { c: 1.0, s: 0.16 },
  ],
]

export const smooth = (x: number): number => x * x * (3 - 2 * x)
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

export function digitJoints(spec: FingerSpec, d: Digit): Vec2[] {
  let dir = -Math.PI / 2 + d.s
  let [x, y] = spec.base
  const pts: Vec2[] = [[x, y]]
  for (let i = 0; i < spec.segs.length; i++) {
    dir += d.c * (i === 0 ? 0.85 : 1.05)
    const len = spec.segs[i] * (1 - d.c * 0.12)
    x += Math.cos(dir) * len
    y += Math.sin(dir) * len
    pts.push([x, y])
  }
  return pts
}

// each chpater holds its pose, then morphs fluidly into the next (looping)
export function poseAt(p: number): Digit[] {
  const seg = Math.min(3.999, p * 4)
  const i = Math.floor(seg)
  const t = seg - i
  const a = POSES[i]
  const b = POSES[(i + 1) % 4]
  const e = t < 0.62 ? 0 : smooth((t - 0.62) / 0.38)
  return a.map((d, k) => ({
    c: d.c + (b[k].c - d.c) * e,
    s: d.s + (b[k].s - d.s) * e,
  }))
}
