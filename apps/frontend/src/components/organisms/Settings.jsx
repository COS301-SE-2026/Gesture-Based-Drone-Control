import { Construction } from "lucide-react"
import { Card } from "../atoms"

const Settings = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
      <Card variant="glass" className="max-w-md w-full">
        <div className="flex flex-col items-center text-center space-y-4 p-y-8">
          <Construction size={64} className="text-yellow-500 animate-pulse" />
          <h2 className="text-2xl font-bold text-OffBlack dark:text-OffWhite">
            PAGE IN PROGRESS
          </h2>
        </div>
      </Card>
    </div>
  )
}

export default Settings
