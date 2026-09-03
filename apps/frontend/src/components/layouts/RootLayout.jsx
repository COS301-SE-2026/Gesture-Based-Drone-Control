import { Outlet, useLocation } from "react-router-dom"
import {
  SideBar,
  AnalyticsSideContent,
  DashboardSideCard,
  GpsSideContent,
  HelpSideContent,
  SettingsSideContent,
} from "../molecules"
import { Home, BarChart3, MapPin, Settings, HelpCircle } from "lucide-react"
// import bgLight from "../../assets/Lightbackground.png"
// import bgDark from "../../assets/darkbackground.png"
// import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"

const RootLayout = () => {
  // const { isDark } = useTheme()
  const { displayName } = useAuth()
  const location = useLocation()
  const menuItems = [
    { id: "gestures", label: "Gestures", icon: Home, path: "/app/gestures" },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      path: "/app/analytics",
    },
    { id: "gps", label: "GPS", icon: MapPin, path: "/app/gps" },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/app/settings",
    },
    { id: "help", label: "Help", icon: HelpCircle, path: "/app/help" },
  ]

  const getTopContent = () => {
    if (
      location.pathname === "/app" ||
      location.pathname.includes("/gestures")
    ) {
      return <DashboardSideCard userName={displayName}/>
    } else if (location.pathname.includes("/analytics")) {
      return <AnalyticsSideContent />
    } else if (location.pathname.includes("/gps")) {
      return <GpsSideContent />
    } else if (location.pathname.includes("/help")) {
      return <HelpSideContent />
    } else if (location.pathname.includes("/settings")) {
      return <SettingsSideContent />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="md-ambience" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {/* style={{
        backgroundImage: `url(${isDark ? bgDark : bgLight})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    > */}

      <SideBar items={menuItems} topContent={getTopContent()} />

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default RootLayout
