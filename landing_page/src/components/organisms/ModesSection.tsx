import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import ModeCard from "../molecules/ModeCard"
import "./ModesSection.css"

const SimIcon = (
  <svg className="md-modeicon" viewBox="0 0 48 48" aria-hidden="true">
    <rect
      x="6"
      y="9"
      width="36"
      height="24"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <line
      x1="18"
      y1="39"
      x2="30"
      y2="39"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="24"
      y1="33"
      x2="24"
      y2="39"
      stroke="currentColor"
      strokeWidth="2"
    />
    <rect
      x="20"
      y="19"
      width="8"
      height="4"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <line
      x1="20"
      y1="20"
      x2="14"
      y2="17"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line
      x1="28"
      y1="20"
      x2="34"
      y2="17"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <ellipse
      cx="13"
      cy="16"
      rx="4"
      ry="1.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <ellipse
      cx="35"
      cy="16"
      rx="4"
      ry="1.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    />
  </svg>
)

const PadIcon = (
  <svg className="md-modeicon" viewBox="0 0 48 48" aria-hidden="true">
    <path
      d="M 14 16 H 34 C 40 16 43 22 42 29 C 41.4 34 37 35 34.5 31.5 L 32 28 H 16 L 13.5 31.5 C 11 35 6.6 34 6 29 C 5 22 8 16 14 16 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <line
      x1="15"
      y1="20"
      x2="15"
      y2="26"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="23"
      x2="18"
      y2="23"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="32" cy="21" r="1.6" fill="currentColor" />
    <circle cx="36" cy="24" r="1.6" fill="currentColor" />
  </svg>
)

export default function ModesSection() {
  return (
    <section className="md-modes" id="sim">
      <span className="md-eyebrow">
        <Scramble text="LOW-STAKES BY DESIGN" />
      </span>
      <Reveal as="h2">
        Crash in the sim,
        <br />
        not in the lab
      </Reveal>
      <div className="md-modegrid">
        <ModeCard
          icon={SimIcon}
          chip="SHIPS WITH EVERY BUILD"
          title="Practice on pixels first"
          body="A full flight simulator is built into the app. Rehearse the gesture vocabulary, test gestures of your own, and crash as often as it takes; nothing hits the ground but pixels, and the sky cost nothing to reset."
        />
        <ModeCard
          icon={PadIcon}
          // · pasted special floating dot
          chip="GESTURE · CONTROLLER"
          title="Not a gesture purist"
          body="Gestures are the headline, not a lock-in. Mudra also flies with a conventional controller, start on sticks while you learn the signs, switch to your hand when you're ready, or mix the two."
          delay={140}
        />
      </div>
    </section>
  )
}
