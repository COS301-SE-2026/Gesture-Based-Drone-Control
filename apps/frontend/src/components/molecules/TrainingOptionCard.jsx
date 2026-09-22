import PropTypes from "prop-types"
import {Card, Button} from "../atoms"

export default function TrainingOptionCard({
    icon: Icon,
    iconBg,
    iconColor,
    title,
    description,
    buttonLabel,
    buttonVariant,
    onAction,
}) 

{
    return (
        <Card variant = "glass" className="flex flex-col gap-4 items-start">

            <div className = {`w-11 h-11 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`}/>
                
            </div>

            <div>
                <h3 className="font-semibold text-ink mb-1">{title}</h3>
                <p className ="text-sm text-dim">{description}</p>
            </div>

            <Button variant = {buttonVariant} onClick={onAction}>
                {buttonLabel}
            </Button>

        </Card>
    )

}


TrainingOptionCard.propTypes = 
{
    icon: PropTypes.elementType.isRequired,
    iconBg : PropTypes.string,
    iconColor:PropTypes.string,
    title: PropTypes.string.isRequired,
    description:PropTypes.string,
    buttonLabel: PropTypes.string,
    buttonVariant: PropTypes.oneOf(["default", "secondary"]),
    onAction:PropTypes.func,
}


TrainingOptionCard.defaultProps = 
{
    iconBg : "bg-ink/50",
    iconColor: "text-ink",
    description: "",
    buttonLabel: "Continue",
    buttonVariant: "default",
    onAction:undefined,
}