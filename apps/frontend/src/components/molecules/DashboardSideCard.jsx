import { Card } from "../atoms"
import { UserCircle } from "lucide-react"
import AccountActions from "./AccountActions"
export const DashboardSideCard = ({ userName = "User" }) => {
  const currentDate = new Date()
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <>
      <h2 className="text-lg font-bold text-Red mb-2">Dashboard</h2>

      {/* welcome card */}

      <Card variant="glass">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <UserCircle size={30} className="text-OffBlack dark:text-Grey" />
            <span className="text-xs text-OffBlack dark:text-Grey">
              {formattedDate}
            </span>
          </div>

          <div className="mt-2">
            <p className="text-sm text-OffBlack dark:text-OffWhite">
              Welcome back,
            </p>
            <p className="text-lg text-OffBlack font-bold dark:text-OffWhite">
              {userName}
            </p>
          </div>

          <AccountActions />
        </div>
      </Card>
    </>
  )
}

export default DashboardSideCard
