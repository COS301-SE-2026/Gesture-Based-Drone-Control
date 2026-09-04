import { Card } from "../atoms"
import AccountActions from "./AccountActions"
import { Gamepad2 } from "lucide-react"

export const GamesSideContent = () => {
  return (
    <Card variant="glass">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-red" />
          <p className="text-sm font-semibold text-ink">
            Pass some time with the drone
          </p>
        </div>
        <p className="text-sm text-dim">
          Pick a game and an input adapter, then hit Start to connect.
        </p>

        <AccountActions />
      </div>
    </Card>
  )
}

export default GamesSideContent
