import { Outlet } from "react-router-dom"
import { Gamepad, Award, HelpCircle, Download } from "lucide-react"
import SideBar from "@/components/molecules/SideBar.jsx"
import { Card } from "@/components/atoms"

export const RELEASES_URL =
  "https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control/releases/latest"

const MENU_ITEMS = [
  { id: "games", label: "Games", icon: Gamepad, path: "/app/games" },
  { id: "license", label: "RPL", icon: Award, path: "/app/license" },
  { id: "help", label: "Help", icon: HelpCircle, path: "/app/help" },
]

function WebSideCard() {
  return (
    <Card variant="glass">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink">Web demo</p>
        <p className="text-sm text-dim">
          Play the drone games with your keyboard or a gamepad. Gesture control,
          the drone simulator and flight analytics are in the desktop app.
        </p>
        <div>
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--red)] text-white text-xs font-semibold uppercase tracking-wide hover:shadow-[0_0_20px_var(--glow)] transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            Get the full app
          </a>
        </div>
      </div>
    </Card>
  )
}

export default function WebLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="md-ambience" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <SideBar items={MENU_ITEMS} topContent={<WebSideCard />} />
      <main className="flex-1 min-w-0 overflow-y-auto p-4 xl:p-6">
        <Outlet />
      </main>
    </div>
  )
}
