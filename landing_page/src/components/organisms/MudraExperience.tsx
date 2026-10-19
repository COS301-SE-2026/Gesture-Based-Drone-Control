import { CSSProperties, useEffect, useRef } from "react"
import useTheme from "../../hooks/useTheme"
import { createMudraExperience } from "../../experience/engine"
import {
  ABOUT,
  CHAP_P,
  FOOTER_LINKS,
  HERO,
  LINKS_P,
  PIPELINE,
  RELEASES,
  USES_P,
  USE_CASES,
  VENTURES,
  DOCS,
  REPO,
  YOUTUBE,
  EMAIL,
} from "../../experience/content"
import "../../experience/mudra.css"

const BASE = import.meta.env.BASE_URL
const ASSETS = { drone: `${BASE}models/drone.glb`, arm: `${BASE}models/arm.glb` }

type Delayed = CSSProperties & { "--d": string }
const delay = (s: number): Delayed => ({ "--d": `${s}s` })

const Close = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="5" y1="5" x2="19" y2="19" />
    <line x1="19" y1="5" x2="5" y2="19" />
  </svg>
)

export default function MudraExperience() {
  const { theme, setTheme } = useTheme()
  const rootRef = useRef<HTMLDivElement>(null)
  const engine = useRef<ReturnType<typeof createMudraExperience> | null>(null)
  const themeRef = useRef(theme)

  // keep the latest theme available to the mount effect without re-running it
  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    engine.current = createMudraExperience({
      root,
      assets: ASSETS,
      initialTheme: themeRef.current,
      onThemeChange: (t: "dark" | "light") => setTheme(t),
    })
    return () => {
      engine.current?.destroy()
      engine.current = null
    }
  }, [setTheme])

  useEffect(() => {
    engine.current?.setTheme(theme === "dark")
  }, [theme])

  return (
    <div className="mx" ref={rootRef} data-theme={theme}>
      <canvas id="gl" />
      <div id="track" />

      <div className="nowebgl" id="nowebgl">
        Mudra needs WebGL to render this page. Try a current browser with hardware acceleration enabled.
      </div>

      <div id="loader" aria-live="polite">
        <div className="box">
          <div className="mark">
            Mudra<small>by codex merchants</small>
          </div>
          <div className="pct" id="pct">00</div>
          <div className="status" id="status"><span /><span /><span /></div>
          <div className="bar"><b id="bar" /></div>
          <div className="scan" />
        </div>
      </div>

      <header className="ui nav" id="nav">
        <div style={{ display: "flex", alignItems: "center" }}>
          <a className="wordmark" href="#top" id="home"><i />Mudra<small>by codex merchants</small></a>
          <button className="burger" id="burger" type="button" aria-label="Open menu"><i /><span>Menu</span></button>
        </div>
        <div className="nav-right">
          <a className="navlink" href={RELEASES} target="_blank" rel="noopener">Download</a>
          <button className="toggle" id="theme" type="button" aria-label="Switch theme">
            <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="4.5" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <line key={a} x1="12" y1="2.4" x2="12" y2="5" transform={`rotate(${a} 12 12)`} />
              ))}
            </svg>
            <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M 20 14.5 A 8.5 8.5 0 1 1 9.5 4 A 7 7 0 0 0 20 14.5 Z" />
            </svg>
          </button>
          <button className="sound" id="sound" aria-pressed="false" aria-label="Toggle sound">
            <span className="bars"><b /><b /><b /><b /></span>
            <span id="soundLabel">Sound off</span>
          </button>
        </div>
      </header>

      <nav className="pill" id="pill" aria-label="Sections">
        <button data-p="0.02">Intro</button>
        <button data-p={CHAP_P[0]}>Project</button>
        <button data-p={USES_P}>Use cases</button>
        <button data-p={LINKS_P}>Links</button>
        <a className="dl" href={RELEASES} target="_blank" rel="noopener">Get the app</a>
      </nav>

      <div className="ui menu" id="menu" aria-hidden="true">
        <div className="veil" />
        <button className="mclose" id="mclose" type="button" aria-label="Close menu"><Close /></button>
        <div className="cols">
          <div className="big" id="mbig">
            <button data-p="0.02" style={delay(0.05)}><small>00</small>Fly by hand</button>
            {VENTURES.map((v, i) => (
              <button key={v.name} data-p={CHAP_P[i]} data-open={i} style={delay(0.1 + i * 0.04)}>
                <small>{String(i + 1).padStart(2, "0")}</small>{v.name}
              </button>
            ))}
            <button data-p={USES_P} style={delay(0.34)}><small>07</small>Use cases</button>
            <button data-p={LINKS_P} style={delay(0.38)}><small>08</small>See it fly</button>
          </div>
          <div className="side" id="mside">
            <p>{ABOUT}</p>
            <a href={DOCS} target="_blank" rel="noopener" style={delay(0.3)}>Documentation hub</a>
            <a href={REPO} target="_blank" rel="noopener" style={delay(0.36)}>GitHub repository</a>
            <a href={RELEASES} target="_blank" rel="noopener" style={delay(0.42)}>Download the app</a>
            <a href={YOUTUBE} target="_blank" rel="noopener" style={delay(0.48)}>Demo videos</a>
            <a href={EMAIL} style={delay(0.54)}>codexmerchants@gmail.com</a>
          </div>
        </div>
      </div>

      <section className="ui hero" id="hero">
        <span className="eyebrow">{HERO.eyebrow}</span>
        <h1>Fly by<br /><em>hand</em></h1>
        <p>{HERO.lead}</p>
        <div className="cta">
          <a className="btn" href={RELEASES} target="_blank" rel="noopener">Download for your desktop</a>
          <button className="btn ghost" id="toGestures" type="button">Explore the project</button>
        </div>
        <div className="stats">
          {HERO.stats.map(([n, l]) => (
            <div key={l}><b>{n}</b>{l}</div>
          ))}
        </div>
      </section>

      <aside className="ui hud" id="hud" aria-hidden="true">
        <span>ALT&nbsp;&nbsp;<b id="hudAlt">0.12</b> M</span>
        <span>VEL&nbsp;&nbsp;<b id="hudVel">0.00</b> M/S</span>
        <span><i className="dot" />LINK STABLE</span>
        <span id="hudMode">GESTURE&nbsp;&nbsp;TRACKING</span>
      </aside>

      <div className="ui cue" id="cue">
        <span>Drag to orbit · hover the drone or the hand for its skeleton · scroll to fly</span><i />
      </div>

      <aside className="ui venture" id="venture">
        <div className="num"><span id="vNum">01 / 06</span><i /></div>
        <div className="tag" id="vTag">{VENTURES[0].tag}</div>
        <h2 id="vName">{VENTURES[0].name}</h2>
        <p className="pitch" id="vDesc" />
        <button className="open" id="vOpen" type="button"><i /><span>Open this chapter</span></button>
        <div className="click">Or click the orb</div>
      </aside>

      <div className="ui detail" id="detail" role="dialog" aria-modal="true" aria-labelledby="dName">
        <button className="close" id="dClose" type="button" aria-label="Close"><Close /></button>
        <div className="panel">
          <div className="num"><span id="dNum">01 / 06</span><i /></div>
          <div className="tag" id="dTag" />
          <h2 id="dName" />
          <p className="lead" id="dLead" />
          <ul id="dList" />
          <div className="stat"><b id="dStatN" /><span id="dStatL" /></div>
          <div className="row">
            <a className="btn" id="dLink" href={DOCS} target="_blank" rel="noopener">Read more in the docs</a>
            <button className="btn ghost" id="dNext" type="button">Next chapter</button>
          </div>
        </div>
        <div className="esc">Esc to close</div>
      </div>

      <section className="ui uses" id="uses" aria-label="What Mudra does">
        <div className="head">
          <div>
            <div className="pipe">
              {PIPELINE.map((step, i) => (
                <span key={step} style={{ display: "contents" }}>
                  {i > 0 && <i />}
                  <span>{step}</span>
                </span>
              ))}
            </div>
            <h2>What Mudra <em>does</em></h2>
          </div>
          <p>{ABOUT}</p>
        </div>
        <div className="grid">
          {USE_CASES.map((u, i) => (
            <div className="card" key={u.id} style={delay(0.05 + i * 0.05)}>
              <b>{u.id}</b>
              <h3>{u.title}</h3>
              <p>{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="ui footer" id="footer">
        <div className="hint">Ready when your hands are · hover or select a link</div>
        <h2 className="fhead">See it fly</h2>
        <div className="links" id="links">
          {FOOTER_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener"
              data-shape={l.shape}
              data-desc={l.desc}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="info" id="linkInfo">
          <span id="linkDesc" />
          <a id="linkOpen" href={REPO} target="_blank" rel="noopener">Open</a>
        </div>
        <div className="bottom">
          <span>© 2026 Codex Merchants · Mudra (Sanskrit: मुद्रा, “hand gesture”)</span>
          <span>
            <span>COS301 · University of Pretoria · EPI-USE Africa</span>
            <a href="#top" id="toTop">Back to top</a>
          </span>
        </div>
      </footer>
    </div>
  )
}