import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import UseCaseCard from "../molecules/UseCaseCard"
import { PHASES, USE_CASES } from "../../constants/useCases"
import "./UseCasesSection.css"

export default function UseCasesSection() {
    return (
        <section className="md-uc" id="capabilities">
            <span className="md-eyebrow">
                <Scramble text="EVERYTHING IT DOES" />
            </span>
            <Reveal as="h2">
                Sign up, calibrate,
                <br />
                fly, look back
            </Reveal>
            <p className="md-ucsub">
                Eight things you can do in Mudra, in the order you'll meet them.
            </p>

            {PHASES.map((phase, pi) => {
                const items = USE_CASES.filter((u) => u.phase === phase.key)
                return (
                    <div className="md-ucphase" key={phase.key}>
                        <Reveal className="md-ucphead" delay={60}>
                            <span className="md-ucplabel">{phase.label}</span>
                            <span className="md-ucrule" aria-hidden="true" />
                            <span className="md-ucpnote">{phase.note}</span>
                        </Reveal>
                        <div className="md-ucgrid">
                            {items.map((u, i) => (
                                <UseCaseCard key={u.n} item={u} delay={pi * 60 + i * 90} />
                            ))}
                        </div>
                    </div>
                )
            })}
        </section>
    )
}