import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import {REPO} from "../../constants/config"
import "./DemoSection.css"

export default function DemoSection() {
    return (
        <section className="md-demo" id="demo">
            <span className="md-eyebrow">
                <Scramble text="SEE A FLIGHT"/>
            </span>
            <Reveal as="h2">
                Two minutes,
                <br />
                hands off the sticks
            </Reveal>
            {/* video url must go here NBBBBBBB */}
            <Reveal
                as="a"
                className="md-screen"
                href={REPO}
                aria-label="Watch the demo flight"
                delay={120}
            >
                <span className="md-corner md-sc1" />
                <span className="md-corner md-sc2" />
                <span className="md-corner md-sc3" />
                <span className="md-corner md-sc4" />
                <span className="md-play">
                    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                        <path d="M 7 4 L 20 12 L 7 20 Z" fill="currentColor" />
                    </svg>
                </span>
                {/* · pasted here, special char floating dot */}
                <span className="md-screenlabel">
                    <i className="md-dot" /> DEMO FLIGHT · COMING SOON
                </span>
            </Reveal>
        </section>
    )
}