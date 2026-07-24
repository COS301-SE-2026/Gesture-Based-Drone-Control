import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import DownloadCard from "../molecules/DownloadCard"
import { RELEASES } from "../../constants/config"
import { BUILDS } from "../../constants/content"
import "./DownloadSection.css"

export default function DownloadSection() {
  return (
    <section className="md-dl" id="download">
      <span className="md-eyebrow">
        <Scramble text="GET THE APP" />
      </span>
      <Reveal as="h2">Fly from your desktop</Reveal>
      <p className="md-dlsub">
        The Mudra desktop app packages the camera feed, the recognition
        pipeline, the flight simulator and the drone link into a single install.
        Open it, show your palm, or plug in a controller, and you're armed.
      </p>
      <div className="md-dlgrid">
        {BUILDS.map((b, i) => (
          <DownloadCard
            key={b.os}
            os={b.os}
            ext={b.ext}
            req={b.req}
            delay={i * 100}
          />
        ))}
      </div>
      <p className="md-dlreq">
        EVERY BUILD NEEDS · A WEBCAM (720P+) · 4 GB RAM · A DRONE OR THE BUNDLED
        SIMULATOR
      </p>
      <p className="md-dlnote">
        All builds are published on <a href={RELEASES}>GitHub Releases</a>.
      </p>
    </section>
  )
}
