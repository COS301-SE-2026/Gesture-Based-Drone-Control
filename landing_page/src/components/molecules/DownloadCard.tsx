import Reveal from "../atoms/Reveal"
import { spotlight } from "../../lib/motion"
import { RELEASES } from "../../constants/config"
import "./DownloadCard.css"

interface Props {
    os: string
    ext: string
    req: string
    delay?: number
}

export default function DownloadCard({os, ext, req, delay=0}: Props) {
    return (
        <Reveal
        as="a"
        className="md-dlcard md-spot"
        href={RELEASES}
        delay={delay}
        onMouseMove={spotlight}
        >
            <span className="md-dlext">{ext}</span>
            <h3>{os}</h3>
            <p>{req}</p>
            {/* symbol pasted */}
            <span className="md-dlbtn">Download v1 ↓</span>
        </Reveal>
    )
}