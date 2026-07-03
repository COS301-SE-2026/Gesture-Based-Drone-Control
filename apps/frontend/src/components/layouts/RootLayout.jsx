import { Outlet, useLocation } from "react-router-dom"
import { SideBar, AnalyticsSideContent, DashboardSideCard, GpsSideContent } from "../molecules"
import { Home, BarChart3, MapPin, Settings, HelpCircle } from "lucide-react"
import bgLight from "../../assets/Lightbackground.png"
import bgDark from "../../assets/darkbackground.png"
import { useTheme } from "../../context/ThemeContext"

const RootLayout = () => {
  const { isDark } = useTheme()
  const location = useLocation()
  const menuItems = [
    { id: "gestures", label: "Gestures", icon: Home, path: "/gestures" },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      path: "/analytics",
    },
    { id: "gps", label: "GPS", icon: MapPin, path: "/gps" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    { id: "help", label: "Help", icon: HelpCircle, path: "/help" },
  ]

  const getTopContent = () => {
    if (location.pathname === "/" || location.pathname.includes("/gestures")) {
      return <DashboardSideCard />
    } else if (location.pathname.includes("/analytics")) {
      return <AnalyticsSideContent />
    }
    else if (location.pathname.includes("/gps")) {
      return <GpsSideContent/>
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
