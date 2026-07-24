import { NAV_LINKS } from "../../constants/MenuItems"
import ThemeToggle from "../atoms/ThemeToggle"
import "./Navbar.css"

export default function Navbar() {
  return (
    <nav className="md-nav">
      <a className="md-mark" href="#top">
        MUDRA<small>by codex merchants</small>
      </a>
      <div className="md-navlinks">
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </div>
      <ThemeToggle />
    </nav>
  )
}
