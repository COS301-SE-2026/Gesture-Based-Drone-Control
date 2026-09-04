/*
Display labels for gesture pipeline

if either changes update these files:
Gestures -> services/cv_pipeline/gestures/recognizers.gesture_recognizer.py
CommandType -> services/commands/command.py

The actual gesture -> command mapping is not duplicated on purpose
resolution happens once in services/input/sources/gesture_adapter.py
*/

//services/cv_pipeline+gestures/recognizers/gesture_recognizer.py Gesture
export const GESTURE_LABELS = {
  FIST: "fist",
  OPEN_PALM: "open palm",
  ONE_FINGER: "one finger",
  TWO_FINGERS: "two fingers",
  THREE_FINGERS: "three fingers",
  FOUR_FINGERS: "four fingers",
  UNKNOWN: "unknown",
}

//services/commands/command.py commandType
export const COMMAND_LABELS = {
  TAKEOFF: "take off",
  LAND: "land",
  MOVE_UP: "move up",
  MOVE_DOWN: "move down",
  MOVE_LEFT: "move left",
  MOVE_RIGHT: "move right",
  MOVE_FORWARD: "move forward",
  MOVE_BACKWARD: "move backward",
  ROTATE_CW: "rotate cw",
  ROTATE_CCW: "rotate ccw",
  HOVER: "hover",
  EMERGENCY_STOP: "emergency stop",
  ANALOG: "analog input",
}

const HAND_ORDER = { RIGHT: 0, LEFT: 1 }

//fallback for anything not in maps
function humanise(name) {
  if (!name) return ""
  return String(name).toLowerCase().replace(/_/g, " ")
}

export function gestureLabel(name) {
  return GESTURE_LABELS[name] ?? humanise(name)
}

export function commandLabel(name) {
  return COMMAND_LABELS[name] ?? humanise(name)
}

export function describeHands(hands) {
  const entries = Object.entries(hands ?? {})
  if (entries.length === 0) return null

  entries.sort(([a], [b]) => (HAND_ORDER[a] ?? 9) - (HAND_ORDER[b] ?? 9))

  if (entries.length === 1) return gestureLabel(entries[0][1])

  const [[sideA, gestureA], [sideB, gestureB]] = entries
  if (gestureA === gestureB) return `both hands ${gestureLabel(gestureA)}`

  return `${sideA.toLowerCase()} ${gestureLabel(gestureA)} + ${sideB.toLowerCase()} ${gestureLabel(gestureB)}`
}

export function formatGestureEvent(event) {
  const command = commandLabel(event?.command)
  if (event?.source === "gesture-idling") return `idle - ${command}`

  const hands = describeHands(event?.hands)
  return hands ? `${hands} - ${command}` : command
}

export function formatClockTime(unixSeconds) {
  const date =
    typeof unixSeconds === "number" ? new Date(unixSeconds * 1000) : new Date()
  return date.toLocaleTimeString("en-ZA", { hour12: false })
}
