export default function Letters({
  text,
  base = 0,
}: {
  text: string
  base?: number
}) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className="md-ltr"
          style={{ animationDelay: base + i * 55 + "ms" }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </>
  )
}
