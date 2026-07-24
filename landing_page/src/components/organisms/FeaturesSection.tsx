import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import FeatureCard from "../molecules/FeatureCard"
import { FEATURES } from "../../constants/content"
import "./FeaturesSection.css"

export default function FeaturesSection() {
  return (
    <section className="md-sys" id="system">
      <span className="md-eyebrow">
        <Scramble text="WHY IT HOLDS UP" />
      </span>
      <Reveal as="h2">
        Built to be trusted
        <br />
        at altitude
      </Reveal>
      <div className="md-cards">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.t} title={f.t} body={f.d} delay={i * 90} />
        ))}
      </div>
    </section>
  )
}
