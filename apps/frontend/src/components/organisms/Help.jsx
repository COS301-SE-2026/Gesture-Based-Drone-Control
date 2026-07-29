import {
  LogIn,
  Hand,
  Activity,
  MonitorPlay,
  LocateIcon,
  Wrench,
  Mail,
} from "lucide-react"
import {
  HelpTopBg,
  HelpResource,
  HelpTopCard,
  FaqItem,
  Contactcard,
} from "../molecules"
import { Login } from "."

const TOPICS = [
  {
    id: "setup",
    icon: LogIn,
    title: "Set up & sign in",
    description:
      "Create an account, sign in, and land on the Gestures Control Dashboard.",
  },
  {
    id: "fly",
    icon: Hand,
    title: "Fly with hand gestures",
    description:
      "Take off, hover, move, and land the drone using nothing but your hand.",
  },
  {
    id: "telemetry",
    icon: Activity,
    title: "Telemetry & live status",
    description:
      "Read altitude, battery, flight mode, and connection status while you fly.",
  },
  {
    id: "airsim",
    icon: MonitorPlay,
    title: "Practice in AirSim",
    description: "Fly a simulated drone before you risk a real one.",
  },
  {
    id: "track",
    icon: LocateIcon,
    title: "Track the drones movement",
    description: "Watch your drone in real time as it moves.",
  },
  {
    id: "troubleshooting",
    icon: Wrench,
    title: "Troubleshooting",
    description:
      "Fix hand-tracking via calibration, gesture recognition, and connection issues.",
  },
]

//Faq
const FAQS = [
  {
    id: 1,
    question: "The drone won't take off when I gesture - why?",
    answer:
      "The dashboard must say ACTIVE before takeoff works. The system also refuses to take off below the battery safety threshold, so check your telemetry panel first.",
  },
  {
    id: 2,
    question: "Why does the drone jsut hover on its own?",
    answer:
      "This is a built-in safety feature, not a bug. If you stop gesturing for 3 seconds, or the drone loses connection for some time, it automatically freezes in place until you take over again.",
  },
  {
    id: 3,
    question: "My hand isn't being tracked properly on screen",
    answer:
      "Check your camera permissions, improve your lighting, and move your hand to about one to two arm-lengths from the camera. Rings, watches, or sleeves near your finger joints can also confuse the tracker. Alternatively recalibrate your camera using the built in feature.",
  },
  {
    id: 4,
    question: "What happens if the battery gets low mid-flight?",
    answer:
      "Once the battery level drops below 20%, the drone lands itself automatically and gently on the spot.",
  },
  {
    id: 5,
    question: "Can I try this without an actual drone?",
    answer:
      "Yes - switch the Adapter to DroneSim before starting a session. It's the dashboard, same gestures, same safety features, just with a simulated drone instead of a real one.",
  },
  {
    id: 6,
    question: "How do I stop the drone immediately?",
    answer:
      "Click the red Emergency Stop on the dashboard, or press ESCAPE when connected to the keyboard adapter. The drone lands right away - all motors are stopped.",
  },
]

const SUGGESTIONS = [
  ...TOPICS.map((t) => ({
    id: `topic-${t.id}`,
    label: t.title,
    category: "Topic",
  })),
  ...FAQS.map((f) => ({
    id: `faq-${f.id}`,
    label: f.question,
    category: "FAQ",
  })),
]
