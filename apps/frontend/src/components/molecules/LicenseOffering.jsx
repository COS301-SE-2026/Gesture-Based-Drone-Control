import { Rocket , Gauge,Trophy} from "lucide-react"
import{Card} from "../atoms"


const OFFERINGS =[
    {
        icon:Rocket,
        title:"Progressive simulator modules",
        description: "Work through maneuvers,obstacles and a figure-8 course that gets harder as you go."
    },

    {
        icon:Gauge,
        title:"Real gesture control practice",
        description: "Fly with the same camera-tracked hand gestures you will use on the day, not any other adapter stand-ins."
    },

    {
        icon:Trophy,
        title:"A mock skills test",
        description:"Run through a times assessment that mirrors what your ATO's practice test will look like.",
    },

]


export default function LicenseOffering(){
    return(
        <Card variant="glass" className="flex flex-col gap-5">
            <Card variant="glass" className="flex flex-col gap-5">
                <p className="text-dim">
                    Gesture-Based Drone Control does not issue the license itself as it can only be done by the South African Civil Aviation Authority(SACAA) and your Approved Training Organizations(ATO)'s call but that's where you would get the practcal side sorted.
                    Pair your ATO's theory course with our simulator so that you are already commfortable with the stick before your actual skills test.
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                    {OFFERINGS.map(({ icon:Icon,title,description}) => (
                        <div key={title} className="flex flex-col gap-2">
                            <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-red"/>

                            </div>
                            <h4 className="text-sm font-semibold text-ink">{title}</h4>
                            <p className="text-xs text-dim leading-relaxed">{description}</p>
                            </div>
                    ))}
                </div>
            </Card>
        </Card>
    )
}