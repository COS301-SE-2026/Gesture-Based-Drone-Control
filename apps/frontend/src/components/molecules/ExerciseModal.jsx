import PropTypes from "prop-types"
import{Modal , Button} from "../atoms"

export default function ExerciseModal({ open, onClose, module}){
    return (
        <Modal open = {open} onClose={onClose} title= {module?.title}>
            <div className = "flex flex-col gap-4">
                <span className="eyebrow">{module?.difficulty}</span>
                <p className ="text-sm text-dim">{module?.description}</p>

                <div className = "rounded-lg border border-dashed border-glassBrd bg-glass-2 flex flex-col items-center justify-center gap-3 py-10">
                    <p className = "text-sm font-semibold text-ink">
                        Exercise environment in progress 
                    </p>

                    <p className = "text-xs text-dim text-center max-w-xs">
                        This is where the live camera feed and obstacle course for this exercise will render once the module is built.
                    </p>

                    <div className = " w-2/3 h-1.5 rounded-full bg-glass overflow-hidden">
                    <div className = " h-full w-1/3 bg-[linear-gradient(90deg,var(--red),var(--red-deep))] animate-pulse rounded-full "/>

                    </div>
                </div>

                <Button variant = "secondary" disabled className="w-full">
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

