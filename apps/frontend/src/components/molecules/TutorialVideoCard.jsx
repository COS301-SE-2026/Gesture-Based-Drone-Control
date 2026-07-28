import PropTypes from "prop-types"
import {Card,Label} from "../atoms"

export default function TutorialVideoCard({ title, src ,descrption }) {
    return
    (
        <Card variant="glass" className="flex flex-col gap-3">
            <Label className="test-lg font-semibold">{title}</Label>
            <videeo controls src ={src} className="rounded-lg w-full"/>
            <p className="text-sm text-OffBlack dark:text-Grey">{description}</p>
        </Card>
    )
}

TutorialVideoCard.propTypes={
    title: PropTypes.string,isRequired,
    src:PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
}
