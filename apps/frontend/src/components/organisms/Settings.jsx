import { RecognizerToggle, CameraSettingsCard } from "../molecules"
import { useDebug } from "@/context/DebugContext"
import { Card, Toggle, Label } from "../atoms"
import { SlidersHorizontal } from "lucide-react"

function SettingsSection({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">
          {title}
        </h2>
        {description && <p className="text-sm text-dim mt-1">{description}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  )
}

const Settings = () => {
  const { debugMode, toggle } = useDebug()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-glass backdrop-blur-sm border border-glass shrink-0">
          <SlidersHorizontal className="w-5 h-5 text-red" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">Settings</h1>
          <p className="text-sm text-dim mt-1">
            Camera, gestures and diagnostics - Tuned to how you fly.
          </p>
        </div>
      </div>

      <SettingsSection
        title="Gesture Control"
        description="Configure the camera feed and the recognizer that interprets your gestures."
      >
        <CameraSettingsCard />
        <RecognizerToggle />
      </SettingsSection>

      <SettingsSection
        title="Developer"
        description="Diagnostic tools for development and debugging."
      >
        <Card variant="glass">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label size="md">Debug Mode</Label>
              <p className="text-sm text-dim max-w-sm">
                Show live connection status for drone, telemetry and commands.
              </p>
            </div>
            <Toggle checked={debugMode} onChange={toggle} />
          </div>
        </Card>
      </SettingsSection>
    </div>
  )
}

export default Settings
