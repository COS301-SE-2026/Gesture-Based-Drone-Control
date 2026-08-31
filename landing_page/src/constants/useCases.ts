export interface UseCase {
  n: string
  phase: string
  icon: string
  t: string
  d: string
  href?: string
  hrefLabel?: string
}

export const PHASES = [
  { key: "setup", label: "SET UP", note: "Once, before your first flight" },
  { key: "air", label: "IN THE AIR", note: "Hands up, sticks down" },
  { key: "ground", label: "ON THE GROUND", note: "No drone required" },
]

export const USE_CASES: UseCase[] = [
  {
    n: "01",
    phase: "setup",
    icon: "account",
    t: "Create an account",
    d: "Sign up once. Your calibration, drones and flight log follow you to any machine.",
  },
  {
    n: "02",
    phase: "setup",
    icon: "signin",
    t: "Sign in",
    d: "Come back to your own profile. Sessions are token-backed and expire on their own.",
  },
  {
    n: "03",
    phase: "setup",
    icon: "calibrate",
    t: "Calibrate your hand",
    d: "Hold each gesture for a few seconds. The app learns your hand, not an average one.",
  },
  {
    n: "04",
    phase: "air",
    icon: "gesture",
    t: "Fly with gestures",
    d: "Four signs, arm to landing. Your webcam is the only controller.",
    href: "#gestures",
    hrefLabel: "See the vocabulary",
  },
  {
    n: "05",
    phase: "air",
    icon: "controller",
    t: "Take the sticks",
    d: "Switch to a conventional controller, gamepad, a controller or even a keyboard.",
    href: "#sim",
    hrefLabel: "See both modes",
  },
  {
    n: "06",
    phase: "air",
    icon: "telemetry",
    t: "Watch live telemetry",
    d: "Altitude, speed, battery, link health, streaming beside the camera feed.",
  },
  {
    n: "07",
    phase: "ground",
    icon: "simulator",
    t: "Fly the simulator",
    d: "Rehearse the whole gesture set against a simulated drone. Crash it for free.",
  },
  {
    n: "08",
    phase: "ground",
    icon: "history",
    t: "Review your flights",
    d: "Every flight is logged. Replay the path, the gestures you sent and how long you flew with the analytics page",
  },
]
