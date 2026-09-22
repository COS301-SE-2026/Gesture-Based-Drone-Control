import{GraduationCap,Rocket} from "lucide-react"
import {useNavigate} from "react-router-dom"
import {LicenseOverview,TrainingOptionCard} from "../molecules"

const THEORY_COURSE_URL  = "https://www.drone-x.co.za/"

export default function Liense(){
    const navigate = useNavigate()

    return(
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 flex flex-col gap-14">
            <section className="flex flex-col gap-4">

                <span className="eyebrow">RPL Pathway</span>
                <h1 className="text-ink">Get your Remote Pilot License</h1>

                <LicenseOverview/>

            </section>

            <section className = "grid gap-4 sm:grid-col-2">
                <TrainingOptionCard
                icon={GraduationCap}
                title="Theory training"
                description="Study air law. meterorology and navigation with an accrediited ATO, then sit the SACAA theory exam."
                buttonLabel="Start theory training"
                buttonVariant="secondary"
                onActtion={() => window.open(THEORY_COURSE_URL, "_blank")}
                />

                <TrainingOptionCard
                icon={Rocket}
                iconBg="bg-red/10"
                iconColor="text-red"
                title="Practical training"
                description="Practise the stick skills your ATO skills test will cover, right here in the simulator."
                buttonLabel="Start practical training"
                onActtion={() => navigate("/app/license/practical")}
                />
            </section>
        </div>
    )
}