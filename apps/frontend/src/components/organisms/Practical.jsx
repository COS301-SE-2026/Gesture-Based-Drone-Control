import {useState} from "react"
import {Trophy} from "lucide-react"
import {ModuleCard, ExerciseModal } from "../molecules"

const MODULES=[
    {
        title: "Basic Maneuvers",
        description: "Fly up, down, left and right to get comfortable with the controls.",
        difficulty: "Beginner",
    },

    {
        title: "Obstacle Blocks",
        description: "Navigate through a course of static blocks without touching them.",
        difficulty:"Intermediate",

    },

    {
        title:"Figure-8",
        description:"Trace a smooth figure-8 pattern around two markers.",
        difficulty:"Advanced",
    },

    {
        title:"Mock test",
        description:"A timed run combining everything above - the closest thing to youur real skills test.",
        difficulty: "Assessment",
        assessment:true,
    },
]


export default function Practical(){
    const [completedModules, setCompletedModules] = useState([])
    const [activeModule,setActiveModule]=useState(null)

    const getStatus =(idx) => {
        if(completedModules.includes(idx)) return "completed"
        if(idx === 0 || completedModules.includes(idx -1 )) return "available"
        return "locked"
    }

    const handleStart = (idx) => {
        if(getStatus(idx) === "locked") return
        setActiveModule(idx)
    }



    // when the game is done this part can be wired up
    // const handleComplete = (idx) => {
    //     setCompletedModules((prev) => (prev.includes(idx) ? prev : [ ...prev,idx]))
    // }




    return (
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 flex flex-col gap-4">
            <section className="flex flex-col gap-4 mb-6 ">
                <span className="eyebrow">Practical Pathway</span>
                <h1 className="text-ink">Skills Test Prep</h1>
                <p className="text-dim">
                    Work through each module in order to build the flying skills your RPL practical skills test will check, then take the mock test to see how you'd do.
                </p>
            </section>


            <div className="flex flex-col">
                {MODULES.map((m, idx) => {
                    const status = getStatus(idx)
                    const isLast= idx === MODULES.length - 1
                    return (
                        <div key={m.title} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div
                                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-mono border ${
                                    status === "completed"
                                    ? "bg-[linear-gradient(145deg,var(--red),var(--red-deep))] border-transparent text-white"
                                    : status === "available"
                                    ? "border-red text-red"
                                    : "border-line text-dim"
                                }`}
                                >
                                    {m.assessment ? <Trophy className="w-4 h-4" /> :idx + 1}

                                </div>
                                {!isLast && (
                                    <div 
                                    className={`w-px flex-1 min-h-[2rem] ${
                                        status === "completed" ? "bg-red" : "bg-line"
                                    }`}
                                    />
                                )}
                            </div>
                        
                        <div className="flex-1 pb-8">
                            <ModuleCard
                            index={idx +1}
                            title={m.title}
                            description={m.description}
                            difficulty={m.difficulty}
                            status={status}
                            assessment={m.assessment}
                            onStart={() => handleStart(idx)}
                            />

            </div>
        </div>
    )
})}
</div>

<ExerciseModal
open={activeModule !== null}
onClose={() => setActiveModule(null)}
module={activeModule!== null ? MODULES[activeModule]:null}
/>
</div>
)

}