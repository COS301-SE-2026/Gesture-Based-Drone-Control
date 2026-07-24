import "./FaqItem.css"

interface Props {
  q: string
  a: string
  open: boolean
  onToggle: () => void
}

export default function FaqItem({ q, a, open, onToggle }: Readonly<Props>) {
  return (
    <div className={"md-qa" + (open ? " md-openqa" : "")}>
      <button type="button" onClick={onToggle} aria-expanded={open}>
        <span>{q}</span>
        <i aria-hidden="true">{open ? "-" : "+"}</i>
      </button>
      <div className="md-a">
        <p>{a}</p>
      </div>
    </div>
  )
}
