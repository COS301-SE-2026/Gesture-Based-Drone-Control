import Scramble from "../atoms/Scramble"
import Magnet from "../atoms/Magnet"
import Button from "../atoms/Button"
import { REPO, RELEASES, DOCS } from "../../constants/config"
import logo from "../../assets/codex_merchants_logo.png"
import "./Footer.css"

export default function Footer() {
  return (
    <footer className="md-cta">
      <span className="md-eyebrow">
        <Scramble text="READY WHEN YOUR HANDS ARE" />
      </span>
      <h2>SEE IT FLY</h2>
      <div className="md-ctarow md-center">
        <Magnet>
          <Button href="#download">Download the app</Button>
        </Magnet>
        <Magnet>
          <Button href={REPO} ghost>
            View on github
          </Button>
        </Magnet>
      </div>
      <div className="md-footlinks">
        <div>
          <h4>Product</h4>
          <a href="#gestures">Gestures</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#sim">Simulator</a>
          <a href="#download">Download</a>
          <a href="#faq">FAQ</a>
        </div>
        <div>
          <h4>Resources</h4>
          <a href={REPO}>GitHub repository</a>
          <a href={RELEASES}>Releases</a>
          <a href={DOCS}>Documentation</a>
        </div>
        <div>
          <h4>Team</h4>
          <img className="md-teamlogo" src={logo} alt="Codex Merchants" />
          <p>A Codex Merchants project - COS301 capstone, 2026.</p>
        </div>
      </div>
      {/* pasted footer text for the copyright symbol :O */}
      <p className="md-fine">
        © 2026 Codex Merchants. Mudra (Sanskrit: मुद्रा, “hand gesture”). Camera
        frames never leave your machine — recognition runs entirely on-device.
      </p>
    </footer>
  )
}
