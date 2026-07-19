// page copy and structured content

export interface Gesture {
  name: string
  verb: string
  cmd: string
  desc: string
}

export const GESTURES: Gesture[] = [
  {
    name: "Open palm",
    verb: "Hover",
    cmd: "HOLD_POSITION",
    desc: "SHOW an open hand and the drone freezes in place. This is also the arming gesture - nothing flies until it sees your palm.",
  },
  {
    name: "Index up",
    verb: "Ascend",
    cmd: "ASCEND 0.5 M/S",
    desc: "Point at the sky to climb. Altitude tracks how long you hold the gesture, so a short point is a small hop.",
  },
  {
    name: "V sign",
    verb: "Orbit",
    cmd: "ORBIT_CW R=2M",
    desc: "Two fingers start a slow clockwise orbit around the current point of interest. Great for inspection passes.",
  },
  {
    name: "Fist",
    verb: "Land",
    cmd: "LAND",
    desc: "Close your fist and it comes home - a controlled descent to the pad, props off on touchdown.",
  },
]

export const STATS = [
  { to: 21, suffix: "", label: "HAND LANDMARKS" },
  { to: 60, suffix: "", label: "FRAMES PER SECOND" },
  { to: 4, suffix: "", label: "CORE GESTURES" },
  { to: 100, suffix: "%", label: "ON-DEVICE PROCESSING" },
]

export const STEPS = [
  {
    n: "01",
    t: "Capture",
    d: "Any webcam, 30 fps. No depth sensor, no gloves, no markers.",
  },
  {
    n: "02",
    t: "Landmarks",
    d: "MediaPipe finds 21 hand keypoints in every frame.",
  },
  {
    n: "03",
    t: "Classify",
    d: "Joint angles - not pixel positions.",
  },
  {
    n: "04",
    t: "Stabilize",
    d: "A majority vote over recent frames means one jitter never moves the drone.",
  },
  {
    n: "05",
    t: "Transmit",
    d: "The command streams over WebSocket to the flgiht controller in milliseconds.",
  },
]

export const FEATURES = [
  {
    t: "Reads the shape, not the angle",
    d: "Recognition runs on joint angles between landmarks.",
  },
  {
    t: "Too stubborn to twitch",
    d: "Commands only change when a majority of recent frames agree. Shaky hands and bad frames get outvoted before they reach the props",
  },
  {
    t: "Faster than a flinch",
    d: "Camera to command in under a frame's worth of time, streamed over a persistent WebSocket, the rone reacts while your gesutre is still forming.",
  },
  {
    t: "Hardware you already own",
    d: "A laptop webcam is the whole sensor suite.",
  },
]

export const BUILDS = [
  { os: "Windows", ext: ".EXE", req: "Windows 10 or later" },
  { os: "Linux", ext: ".APPIMAGE", req: "Ubuntu 22.04 or equivalent" },
]

export const FAQS = [
  {
    q: "a",
    a: "b",
  },
  {
    q: "a",
    a: "b",
  },
  {
    q: "a",
    a: "b",
  },
  {
    q: "a",
    a: "b",
  },
  {
    q: "a",
    a: "b",
  },
  {
    q: "a",
    a: "b",
  },
]
