import { LogIn, Hand, Activity, MonitorPlay, Wrench, Mail } from "lucide-react"
import {
  HelpTopBg,
  HelpResource,
  HelpTopCard,
  FaqItem,
  Contactcard,
} from "../molecules"
import { useNavigate } from "react-router-dom"
import { useTour } from "@/context/TourContext"
import { fullTourSteps } from "@/lib/tours/steps"

const MANUAL_BASE =
  "https://cos301-se-2026.github.io/Gesture-Based-Drone-Control/docs/MANUAL/"

const TOPICS = [
  {
    id: "2-set-up-sign-in",
    icon: LogIn,
    title: "Set up & sign in",
    description:
      "Create an account, sign in, and land on the Gestures Control Dashboard.",
  },
  {
    id: "3-fly-the-drone-with-your-hand-uc-1",
    icon: Hand,
    title: "Fly with hand gestures",
    description:
      "Take off, hover, move, and land the drone using nothing but your hand.",
  },
  {
    id: "4-watch-what-the-drone-is-doing-uc-2",
    icon: Activity,
    title: "Telemetry & live status",
    description:
      "Read altitude, battery, flight mode, and connection status while you fly.",
  },
  {
    id: "5-practise-with-the-airsim-simulator-uc-3",
    icon: MonitorPlay,
    title: "Practice in AirSim",
    description: "Fly a simulated drone before you risk a real one.",
  },
  {
    id: "7-the-gesture-vocabulary",
    icon: Hand,
    title: "Gesture Vocabulary",
    description:
      "A quick reference for every hand gesture the system understands.",
  },
  {
    id: "10-troubleshooting",
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
    defaultOpen: true,
  },
  {
    id: 2,
    question: "Why does the drone just hover on its own?",
    answer:
      "This is a built-in safety feature, not a bug. If you stop gesturing for 3 seconds, or the drone loses connection for some time, it automatically freezes in place until you take over again.",
    defaultOpen: false,
  },
  {
    id: 3,
    question: "My hand isn't being tracked properly on screen",
    answer:
      "Check your camera permissions, improve your lighting, and move your hand to about one to two arm-lengths from the camera. Rings, watches, or sleeves near your finger joints can also confuse the tracker. Alternatively recalibrate your camera using the built in feature.",
    defaultOpen: false,
  },
  {
    id: 4,
    question: "What happens if the battery gets low mid-flight?",
    answer:
      "Once the battery level drops below 20%, the drone lands itself automatically and gently on the spot.",
    defaultOpen: false,
  },
  {
    id: 5,
    question: "Can I try this without an actual drone?",
    answer:
      "Yes - switch the Adapter to DroneSim before starting a session. It's the dashboard, same gestures, same safety features, just with a simulated drone instead of a real one.",
    defaultOpen: false,
  },
  {
    id: 6,
    question: "How do I stop the drone immediately?",
    answer:
      "Click the red Emergency Stop on the dashboard, or press ESCAPE when connected to the keyboard adapter. The drone lands right away - all motors are stopped.",
    defaultOpen: false,
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

const openManual = (sectionId) => {
  const url = sectionId ? `${MANUAL_BASE}#${sectionId}` : MANUAL_BASE
  window.open(url, "_blank")
}

export default function Help() {
  const navigate = useNavigate()
  const { startFullTour } = useTour()

  const handleStartTour = () => {
    startFullTour(fullTourSteps)
  }

  return (
    <>
      <HelpTopBg
        suggestion={SUGGESTIONS}
        onSelect={(item) => console.log("selected", item)}
        onSearch={(q) => console.log("searching", q)}
      />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 flex flex-col gap-14">
        <HelpResource
          onOpenManual={() => openManual()}
          onOpenTut={() => navigate("/Tutorial")}
          onStartTour={handleStartTour}
        />

        <section>
          <h2 className="text-xl font-semibold text-ink mb-6">
            Browse by topic
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((t) => (
              <HelpTopCard
                key={t.id}
                icon={t.icon}
                title={t.title}
                description={t.description}
                onClick={() => openManual(t.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink mb-6">
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((f) => (
              <FaqItem
                key={f.id}
                question={f.question}
                answer={f.answer}
                defaultOpen={f.defaultOpen}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink mb-6">
            Still stuck? Talk to the team
          </h2>
          <Contactcard
            icon={Mail}
            title="Email support"
            description="For all your detailed or technical issues."
            actionLabel="codexmerchants@gmail.com"
            onAction={() => {
              window.location.href = "mailto:codexmerchants@gmail.com"
            }}
          />
        </section>
      </div>
    </>
  )
}
