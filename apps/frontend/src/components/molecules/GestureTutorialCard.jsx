import PropTypes from "prop-types"
import {Card,Label} from "../atoms"
import GestureCameraFeed from "./GestureCameraFeed"


export default function GestureTutorialCard({ name, description,gif}) 
{
    return
    (
        <Card variant ="glass" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className ="flex flex-col gap-2">
            <Label className="text-lg font-semibold">{name}</Label>
            <GestureCameraFeed className="flex-1"/>
            </div>

            <div className ="flex flex-col gap-2">
                <p className="text-lg text-OffBlack dark:text-Grey">{description}</p>
                <img
                    src={gif}
                    alt={`${name} demo`}
                    className="rounded-lg w-full object-cover"
                />
                </div>

        </Card>
    )
}

GestureTutorialCard.propTypes = {
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    gif: PropTypes.string.isRequired,
}

