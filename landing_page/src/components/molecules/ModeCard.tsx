import React from "react"
import Reveal from "../atoms/Reveal"
import { spotlight } from "../../lib/motion"
import "./ModeCard.css"

interface Props {
  icon: React.ReactNode
  chip: string
  title: string
  body: string
  delay?: number
}

export default function ModeCard({
  icon,
  chip,
  title,
  body,
  delay = 0,
}: Props) {
  return (
    <Reveal
      as="article"
      className="md-mode md-spot"
      delay={delay}
      onMouseMove={spotlight}
    >
      {icon}
      <span className="md-modechip">{chip}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </Reveal>
  )
}
