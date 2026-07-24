import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import "./WhySection.css"

export default function WhySection() {
  return (
    <section className="md-why" id="why">
      <Reveal className="md-whycol">
        <span className="md-eyebrow">
          <Scramble text="THE PROBLEM" />
        </span>
        <h2>The controller is the barrier</h2>
        <p>
          Learning a twin-stick radio takes hours of practice before the first
          stable hover. That wall keeps drones out of the classrooms, labs and
          live demos where they're most useful.
        </p>
      </Reveal>
      <Reveal className="md-whycol" delay={140}>
        <span className="md-eyebrow">
          <Scramble text="THE ANSWER" />
        </span>
        <h2>You already own the interface</h2>
        <p>
          Mudra removes the translation layer. Holding up a palm or pointing at
          the sky is something you've known since you were two, so that's the
          whole learning curve.
        </p>
        <ul className="md-chips">
          <li>First-time pilots</li>
          <li>Live demos</li>
          <li>Teaching &amp; research</li>
        </ul>
      </Reveal>
    </section>
  )
}
