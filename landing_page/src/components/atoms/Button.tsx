import React from "react"
import "./Button.css"

interface ButtonProps {
  href: string
  ghost?: boolean
  onClick?: () => void
  children: React.ReactNode
}

//CTA button, ghost renders glass
export default function Button({
  href,
  ghost = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <a
      className={"md-btn" + (ghost ? " md-ghost" : "")}
      href={href}
      onClick={onClick}
    >
      {children}
    </a>
  )
}
