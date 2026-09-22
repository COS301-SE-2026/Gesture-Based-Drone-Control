import {Card } from "../atoms"
import {Award} from "lucide-react"
import AccountActions from "./AccountActions"

export const LicenseSideContent = () => {
    return (
        <Card variant = "glass">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-red"/>
                    <p className="text-sm font-semibold text-ink" > On your way to an RPL</p>
                </div>

                <p className = "text-sm text-dim">
                    Work through the theory course, then use the simulator here to practice before your skills test.
                </p>
                <AccountActions/>
            </div>
        </Card>

    )
}

export default LicenseSideContent