import { useState } from "react"
import { CommandHistory, GestureGuide, GestureCalibration } from "../molecules"
import { Card, Label } from "../atoms"
import { Camera } from "lucide-react"

const GestureControl = () => {
  const [commands] = useState([
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe right - move right", timestamp: "18:50:43" },
    { action: "swipe down - move down", timestamp: "18:50:43" },
    { action: "swipe left - move left", timestamp: "18:50:42" },
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="glass" className="h-full flex flex-col">
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">
                  Gesture Detection
                </Label>
              </div>

              <div className="relative w-full flex-1 bg-OffBlack/50 rounded-lg border border-Grey/20 overflow-hidden min-h-[400px] flex items-center justify-center">
                {/* camera placeholder */}
                <div className="w-full h-full bg-gradient-to-br from-OffBlack/40 to-OffBlack/60 flex flex-col items-center justify-center relative">
                  <Camera className="w-16 h-16 text-DarkGrey mb-3" />
                </div>

                {/* status indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-OffBlack/60 px-3 py-1 rounded-full text-xs text-OffWhite">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <spane>Active</spane>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* command History */}
        <div className="lg:col-span-1">
          <CommandHistory commands={commands} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GestureGuide />
        <GestureCalibration
          visibility={80}
          confidence={45}
          stability={60}
          lighting="Good"
          background="Fair"
        />
      </div>
    </div>
  )
}

export default GestureControl
