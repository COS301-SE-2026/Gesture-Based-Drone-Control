import PropTypes from "prop-types"
import {Card,Label} from "../atoms"

export default function TutorialVideoCard({ title, src ,description }) {
    return(
        <Card variant="glass" className="flex flex-col gap-3">
            <Label className="text-lg font-semibold">{title}</Label>
            <iframe
                src={`https://www.youtube.com/embed/${src}`}
                title={title}
                className="rounded-lg w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media;gyroscope ; picture-in-picture"
                allowFullScreen
            />
            <p className="text-sm text-OffBlack dark:text-Grey">{description}</p>
        </Card>
    )
}

TutorialVideoCard.propTypes={
    title: PropTypes.string.isRequired,
    src:PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
}
