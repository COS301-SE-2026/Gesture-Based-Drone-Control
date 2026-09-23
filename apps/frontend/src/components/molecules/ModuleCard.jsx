import PropTypes from "prop-types"
import {Lock, CheckCircle2,Trophy} from "lucide-react"
import {Card , Button, StatusDot} from "../atoms"

export default function ModuleCard({
    index,
    title,
    description,
    difficulty,
    status,
    assessment,
    onStart,
}) {
    const locked = status === "locked"
    const completed = status === "completed"

    return(
        <Card
        variant="glass"
        className={`flex flex-col gap-4 relative ${locked ? "opacity-50" : ""} ${
            assessment && !locked ? "border-red/60" : ""} ${completed ? "border-success/60" : ""}
        `}
        >
            <div className="flex items-center justify-between" >
                <span className= "font-mono text-xs text-dim tracking-widest">
                    MODULE {String(index).padStart(2,"0")}
                </span>

                {completed ? (
                    <CheckCircle2 className = "w-5 h-5 text-success"/>
                ) : locked ? (
                    <Lock className="w-4 h-4 text-dim" />
                ) : assessment ? (
                    <Trophy className="w-4 h-4 text-red"/>
                ) : (
                    <StatusDot variant="connected" size="sm" />
                )}
            </div>
            
            <div>
                <h3 className = "font-semibold text-ink mb-1">{title}</h3>
                <p className = "text-sm text-dim">{description}</p>
            </div>

            <span className = "eyebrow">{difficulty}</span>

            <Button 
            variant = {completed ? "secondary":"default"}
            disabled={locked}
            onClick={onStart}
            >

                {completed
                ? "Replay Exercise"
                :locked
                ? "Locked"
            :assessment
            ? "Start Mock Test"
        : "Start Module"}
            </Button>

        </Card>
    )
}

ModuleCard.propTypes ={
    index:PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    difficulty:PropTypes.string,
    status: PropTypes.oneOf(["locked","available","completed"]),
    assessment:PropTypes.bool,
    onStart:PropTypes.func,
}


ModuleCard.defaultProps={
    description:"",
    difficulty:"",
    status: "locked",
    assessment:false,
    onStart:undefined,
}