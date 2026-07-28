import { useEffect, useState } from "react"
import useTheme from "../../hooks/useTheme"
import { REPO } from "../../constants/config"
import { SIDE_LINKS } from "../../constants/MenuItems"
import { GESTURES } from "../../constants/content"
import "./Sidebar.css"

export default function Sidebar() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className={"md-sbtab" + (open ? " md-sbtab-on" : "")}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="md-sidebar"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <span className="md-sbicon" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span className="md-sbtxt">{open ? "CLOSE" : "MENU"}</span>
      </button>

      <div
        className={"md-sboverlay" + (open ? " md-show" : "")}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="md-sidebar"
        className={"md-sidebar" + (open ? " md-sbopen" : "")}
        aria-hidden={!open}
      >
        <span className="md-eyebrow">NAVIGATION</span>
        <ul className="md-sblinks">
          {SIDE_LINKS.map((l, i) => (
            <li
              key={l.h}
              style={{ transitionDelay: open ? 120 + i * 55 + "ms" : "0ms" }}
            >
              <a href={l.h} onClick={() => setOpen(false)}>
                <em>{l.n}</em>
                {l.t}
              </a>
            </li>
          ))}
        </ul>

        <div className="md-sbref">
          <h5>GESTURE QUICK REFERENCE</h5>
          {GESTURES.map((g) => (
            <div key={g.cmd}>
              <span>{g.name.toUpperCase()}</span>
              <b>{g.verb.toUpperCase()}</b>
            </div>
          ))}
        </div>

        <div className="md-sbfoot">
          <button
            type="button"
            className="md-sbtheme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "SWITCH TO LIGHT MODE" : "SWITCH TO DARK MODE"}
          </button>
          <a
            className="md-btn md-sbdl"
            href="#download"
            onClick={() => setOpen(false)}
          >
            Download the app
          </a>
          <a className="md-sbgit" href={REPO}>
            {/* arrow icon pasted */}
            GitHub repository ↗
          </a>
        </div>
      </aside>
    </>
  )
}
