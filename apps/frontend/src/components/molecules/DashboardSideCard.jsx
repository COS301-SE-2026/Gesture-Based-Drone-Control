import { Card } from "../atoms"
import AccountActions from "./AccountActions"
export const DashboardSideCard = ({ userName = "User" }) => {
  const currentDate = new Date()
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <Card variant="glass">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-ink">{formattedDate}</span>
        </div>

        <div className="mt-2">
          <p className="text-sm text-ink">Welcome back,</p>
          <p className="text-lg text-ink font-bold">{userName}</p>
        </div>

        <AccountActions />
      </div>
    </Card>
  )
}

export default DashboardSideCard
