import{GraduationCap,Rocket} from "lucide-react"
import {useNavigate} from "react-router-dom"
import {LicenseOverview,LicenseOffering,TrainingOptionCard} from "../molecules"

const THEORY_COURSE_URL  = "https://www.drone-x.co.za/"

export default function Liense(){
    const navigate = useNavigate()

    return(
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 py-10 flex flex-col gap-14 overflow-hidden">
            <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-32 w-[28rem] h-[28rem] rounded-full"
            style={{
                background: "color-mix(in srgb,var(--red-shadow) 30%,transparent",
                filter:"blur(110px)",
            }}
            />
            <div 
            aria-hidden="true"
            className="pointer-events-none absolute top-1/3 -left-24 w-96 h-96 rounded-full"
            style={{
                background:"color-mix(insrgb,var((--red-deep) 18% ,transparent)",
                filter:"blur(100px)",
            }}
            />

            <section className="flex flex-col gap-4">

                <span className="eyebrow">RPL Pathway</span>
                <h1 className="text-ink">Get your Remote Pilot License</h1>
                <h2 className="text-sm font-semibold text-dim uppercase tracking-widest mt-2">
                    What is an RPL?
                </h2>
                <LicenseOverview/>

            </section>
            <section className ="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-dim uppercase tracking-widest">
                    What we provide:
                </h2>
                <LicenseOffering/>
            </section>

            <section className = "flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-dim uppercase tracking-widest">
                    Get Started
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                <TrainingOptionCard
                icon={GraduationCap}
                title="Theory training"
                description="Study air law. meterorology and navigation with an accrediited ATO, then sit the SACAA theory exam."
                buttonLabel="Start theory training"
                buttonVariant="secondary"
                onAction={() => window.open(THEORY_COURSE_URL, "_blank")}
                />

                <TrainingOptionCard
                icon={Rocket}
                iconBg="bg-red/10"
                iconColor="text-red"
                title="Practical training"
                description="Practise the stick skills your ATO skills test will cover, right here in the simulator."
                buttonLabel="Start practical training"
                onAction={() => navigate("/app/license/practical")}
                />
                </div>
            </section>
        </div>
    )
}