import { Outlet, useLocation } from "react-router-dom"
import {
  SideBar,
  DashboardSideCard,
  GestureSideContent,
  AnalyticsSideContent,
} from "../molecules"
import { Home, Hand, BarChart3, MapPin, Settings } from "lucide-react"
import bgLight from "../../assets/Lightbackground.png"
import bgDark from "../../assets/darkbackground.png"
import { useTheme } from "../../context/ThemeContext"

const RootLayout = () => {
  const { isDark } = useTheme()
  const location = useLocation()
  const menuItems = [
    { id: "home", label: "Home", icon: Home, path: "./dashboard" },
    { id: "gestures", label: "Gestures", icon: Hand, path: "./gestures" },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      path: "./analytics",
    },
    { id: "gps", label: "GPS", icon: MapPin, path: "./gps" },
    { id: "settings", label: "Settings", icon: Settings, path: "./settings" },
  ]

  const getTopContent = () => {
    if (location.pathname.includes("/dashboard")) {
      return <DashboardSideCard userName="Bobby" />
    } else if (location.pathname.includes("/gestures")) {
      return <GestureSideContent />
    } else if (location.pathname.includes("/analytics")) {
      return <AnalyticsSideContent />
    }
  }

  return (
    <div
      className="flex min-h-screen"
      style={{
        backgroundImage: `url(${isDark ? bgDark : bgLight})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >

      <div className="flex flex-col">
        <SideBar items={menuItems} topContent={getTopContent()} />
        <div className="w-80 px-4 pb-4"></div>
      </div>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
    
  )
}

export default RootLayout
