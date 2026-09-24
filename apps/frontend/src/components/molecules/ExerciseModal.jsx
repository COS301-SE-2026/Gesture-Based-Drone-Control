import PropTypes from "prop-types"
import{Modal , Button} from "../atoms"
import GestureCameraFeed from "./GestureCameraFeed"

export default function ExerciseModal({ open, onClose, module}){
    return (
        <Modal open = {open} onClose={onClose} title= {module?.title} size = "full">
            <div className = "flex flex-col gap-4 flex-1 min-h-0">
                <span className="eyebrow">{module?.difficulty}</span>
                <p className ="text-sm text-dim">{module?.description}</p>

                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 min-h-0">
                            <p className="text-xs text-dim uppercase tracking-widest">
                                Gesture Camera
                            </p>
                            <GestureCameraFeed className="flex-1"/>

                        </div>

                        <div className ="flex flex-col gap-2 min-h-0">
                            <p className="text-xs text-dim uppercase trackingn-widest">
                                Simulation
                            </p>
                            <div className = "flex-1 min-h-0 rounded-lg border border-dashed border-glassBrd bg-surface flex flex-col items-center justify-center gap-3">
                                <p className="text-sm font-semibold text-ink">
                                    AirSim environment in progress
                                </p>
                                <p className ="text-xs text-dim text-center max-w-xs">
                                    lets hope we can get this simulation wired up....faaah
                                </p>
                                <div className = "w-2/3 h-1.5 rounded-full bg-glass overflow-hidden">
                                <div className="h-full w-1/3 bg-[linear-gradient(90deg,var(--red),var(--red-deep))] animate-pulse rounded-full"/>
                                
                                </div>
                            </div>
                        </div>
                    </div>

                <Button variant = "default" disabled className="w-full shrink-0">
                    Start Exercise
                </Button>

            </div>
        </Modal>
    )
}


ExerciseModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    module: PropTypes.shape({
        title: PropTypes.string,
        description: PropTypes.string,
        difficulty: PropTypes.string,
    }),
}

ExerciseModal.defaultProps={
    open: false,
    onClose:undefined,
    module:null,
}

