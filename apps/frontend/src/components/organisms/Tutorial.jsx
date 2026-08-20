import { Label } from "../atoms"
import { GestureTutorialCarousel, TutorialVideoCard } from "../molecules"
import { POSES } from "../../lib/hand"

const ASSETBASE = `${import.meta.env.BASE_URL}assets/`

const gestureTutorials = [
  //get commands from shav
  {
    id: "open-palm",
    name: "Open-Palm - Hover",
    instructions: "Show an open palm to hold the drone's current position.",
    pose: POSES[0],
    droneVideo: `${ASSETBASE}hover.mp4`,
    expectedGesture: "OPEN_PALM",
  },

  {
    id: "index-up",
    name: "Index Up - Move Up",
    instructions: "Hold up one finger to move the drone",
    pose: POSES[1],
    droneVideo: `${ASSETBASE}move-up.mp4`,
    expectedGesture: "ONE_FINGER",
  },

  {
    id: "v-sign",
    name: "Two Fingers - Move Down",
    instructions: "Hold two fingers up to move down the drone",
    pose: POSES[2],
    droneVideo: `${ASSETBASE}move-down.mp4`,
    expectedGesture: "TWO_FINGERS",
  },

  // the two hands ones noww fah

  {
    id: "both-open-palm",
    name: "Both Palms - Emergency Stop",
    instructions: "Show both palms open to trigger an emergency stop.",
    pose: { left: POSES[0], right: POSES[0] },
    droneVideo: `${ASSETBASE}emergency-stop.mp4`,
    expectedGesture: { left: "OPEN_PALM", right: "OPEN_PALM" },
  },

  {
    id: "both-three-fingers",
    name: "Both Three Fingers - Takeoff",
    instructions: "Hold up three fingers in both hands to take off.",
    pose: { left: POSES[4], right: POSES[4] },
    droneVideo: `${ASSETBASE}takeoff.mp4`,
    expectedGesture: { left: "THREE_FINGERS", right: "THREE_FINGERS" },
  },

  {
    id: "both-fist",
    name: "Both Fists - Land",
    instructions: "make a fist with both hands to land",
    pose: { left: POSES[3], right: POSES[3] },
    droneVideo: `${ASSETBASE}land.mp4`,
    expectedGesture: { left: "FIST", right: "FIST" },
  },

  {
    id: "one-finger-one-finger",
    name: "Two one fingers - Move Forward",
    instructions: "raise your pointer fingers on both hands to move forward",
    pose: { left: POSES[1], right: POSES[1] },
    droneVideo: `${ASSETBASE}move-forward.mp4`,
    expectedGesture: { left: "ONE_FINGER", right: "ONE_FINGER" },
  },

  {
    id: "two-finger-two-finger",
    name: "Two two fingers - Move Backward",
    instructions:
      "raise your two fingers on both hands to move forward, like a peace sign in two hands",
    pose: { left: POSES[2], right: POSES[2] },
    droneVideo: `${ASSETBASE}move-backward.mp4`,
    expectedGesture: { left: "TWO_FINGERS", right: "TWO_FINGERS" },
  },

  // NOW DA ASYSMMETRICAL ONES

  {
    id: "one-finger-one-palm",
    name: "One Finger One Palm - Rotate Clockwise",
    instructions:
      "Raise one finger up on one hand and open your palm on the other",
    pose: { left: POSES[1], right: POSES[0] },
    droneVideo: `${ASSETBASE}clockwise.mp4`,
    expectedGesture: { left: "ONE_FINGER", right: "OPEN_PALM" },
  },

  {
    id: "one-palm-one-finger",
    name: "One Palm One Finger - Rotate Counter Clockwise",
    instructions:
      "Open your palm on one hand and point a finger up on the other",
    pose: { left: POSES[0], right: POSES[1] },
    droneVideo: `${ASSETBASE}counterclockwise.mp4`,
    expectedGesture: { left: "OPEN_PALM", right: "ONE_FINGER" },
  },

  {
    id: "one-palm-two-fingers",
    name: "One Palm One Finger - Move Left",
    instructions:
      "Open your palm on one hand and point two fingers up on the other",
    pose: { left: POSES[0], right: POSES[2] },
    droneVideo: `${ASSETBASE}move-left.mp4`,
    expectedGesture: { left: "OPEN_PALM", right: "TWO_FINGERS" },
  },

  {
    id: "Two-fingers-one-palm",
    name: "Two Fingers One Palm - Move Right",
    instructions:
      "Raise two fingers up on one hand and open your palm on the other",
    pose: { left: POSES[2], right: POSES[0] },
    droneVideo: `${ASSETBASE}move-right.mp4`,
    expectedGesture: { left: "TWO_FINGERS", right: "OPEN_PALM" },
  },
]

const tutorialVideos = [
  {
    id: "gesture",
    title: "Flying with theh Gesture Adapter",
    src: "6yFvCRma6E4",
    description: "Same flight, controlled entirely by hand gestures.",
  },
]

const Tutorial = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Gesture Controls</Label>
        <GestureTutorialCarousel gestures={gestureTutorials} />
      </div>

      <div className="space-y-4">
        <Label className="text-lg font-semibold">Tutorial Videos</Label>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tutorialVideos.map((v) => (
            <TutorialVideoCard key={v.id} {...v} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Tutorial
