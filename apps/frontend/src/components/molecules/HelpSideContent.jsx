import { Card } from "../atoms"
import { LifeBuoy } from "lucide-react"
import AccountActions from "./AccountActions"

export const HelpSideContent = () => {
  return (
    <Card variant="glass">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-red" />
          <p className="text-sm font-semibold text-ink">Need a hand?</p>
        </div>
        <p className="text-sm text-dim">
          Browse the manual, rewatch the tutorial, or reach out to the team
          below.
        </p>

        <AccountActions />
      </div>
    </Card>
  )
}

export default HelpSideContent
