import React, { useEffect, useRef, useState } from "react"

type RevealProps = {
  children?: React.ReactNode
  delay?: number
  as?: React.ElementType
  className?: string
} & Record<string, unknown>

export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={
        (className ? className + " " : "") +
        "md-reveal" +
        (seen ? " md-in" : "")
      }
      style={{ "--rd": delay + "ms" } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  )
}
