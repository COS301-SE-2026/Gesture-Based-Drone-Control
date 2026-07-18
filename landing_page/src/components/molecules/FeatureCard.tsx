import Reveal from "../atoms/Reveal"
import { spotlight } from "../../lib/motion"
import "./FeatureCard.css"

interface Props {
  title: string
  body: string
  delay?: number
}

export default function FeatureCard({ title, body, delay = 0 }: Props) {
  return (
    <Reveal
      as="article"
      className="md-card md-spot"
      delay={delay}
      onMouseMove={spotlight}
    >
      <h3>{title}</h3>
      <p>{body}</p>
    </Reveal>
  )
}
