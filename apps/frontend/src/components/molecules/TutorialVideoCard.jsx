import PropTypes from "prop-types"
import { Play } from "lucide-react"
import { Card, Label } from "../atoms"

export default function TutorialVideoCard({ title, src, description }) {
  const watchUrl = `https://www.youtube.com/watch?v=${src}`

  return (
    <Card variant="glass" className="flex flex-col gap-3">
      <Label className="text-lg font-semibold">{title}</Label>
      <button
        type="button"
        onClick={() => window.open(watchUrl, "_blank")}
        aria-label={`Play ${title} on YouTube`}
        className="group relative w-full aspect-video overflow-hidden rounded-lg"
      >
        <img
          src={`https://img.youtube.com/vi/${src}/hqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/25">
          <Play className="w-12 h-12 text-ink" fill="currentColor" />
        </span>
      </button>
      <p className="text-sm text-dim">{description}</p>
    </Card>
  )
}

TutorialVideoCard.propTypes = {
  title: PropTypes.string.isRequired,
  src: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
}
