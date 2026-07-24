import Reveal from "../atoms/Reveal"
import { spotlight } from "../../lib/motion"
import "./PipelineNode.css"

interface Props {
  n: string
  title: string
  body: string
  delay?: number
}

export default function PipelineNode({
  n,
  title,
  body,
  delay = 0,
}: Readonly<Props>) {
  return (
    <Reveal
      as="article"
      className="md-node md-spot"
      delay={delay}
      onMouseMove={spotlight}
    >
      <span className="md-noden">{n}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </Reveal>
  )
}
