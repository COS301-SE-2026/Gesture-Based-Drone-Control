import DroneScene from "../molecules/DroneScene"
import Letters from "../atoms/Letters"
import Scramble from "../atoms/Scramble"
import Magnet from "../atoms/Magnet"
import Button from "../atoms/Button"
import "./Hero.css"

export default function Hero() {
  return (
    <header className="md-hero" id="top">
      <DroneScene />
      <span className="md-corner md-c1" />
      <span className="md-corner md-c2" />
      <span className="md-corner md-c3" />
      <span className="md-corner md-c4" />
      <div className="md-herocopy">
        <span className="md-eyebrow">
          {/* · special floating dot pasted */}
          <Scramble text="GESTURE FLIGHT INTERFACE · V0.9" />
        </span>
        <h1 aria-label="Fly by hand">
          <span aria-hidden="true">
            <Letters text="FLY BY" />
            <br />
            <em>
              <Letters text="HAND" base={480} />
            </em>
          </span>
        </h1>
        <p className="md-sub">
          Mudra reads your hand through any webcam, 21 landmarks, 30 times a
          second, and turns gestures into flight commands. No controller
          required. No gloves. Nothing between you and the drone.
        </p>
        <div className="md-ctarow">
          <Magnet>
            <Button href="#download">Download for your desktop</Button>
          </Magnet>
          <Magnet>
            <Button href="#gestures" ghost>
              Learn the gestures
            </Button>
          </Magnet>
        </div>
      </div>
      <p className="md-hint">MOVE YOUR CURSOR - THE DRONE FOLLOWS</p>
    </header>
  )
}
