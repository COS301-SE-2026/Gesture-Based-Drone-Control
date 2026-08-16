import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { NavItem, Card } from "../atoms"
import DarkModeToggle from "./DarkModeToggle"
import Logo from "../../assets/codex_merchants_logo.png"
import SLogo from "../../assets/codex_merchants_logo_small.png"
import PropTypes from "prop-types"
import { ChevronLeft, ChevronRight } from "lucide-react"

//main nav sidebar that will be displayed on all pages

const COLLAPSE_KEY = "sidebar:collapsed"

function useCollapsedState() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    } catch {
      //localstorage unavilable, ignore
    }
  }, [collapsed])

  return [collapsed, setCollapsed]
}

export default function SideBar({
  items = [],
  topContent = null,
  className = "",
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useCollapsedState()

  return (
    <aside
    className={
      `bg-[linear-gradient(160deg,var(--glass),var(--glass-2)),var(--nav)]
      backdrop-blur-xl backdrop-saturate-150
      border-r border-glassBrd
      rounded-r-2xl
      shadow-glass-combo
      flex h-full flex-col gap-3 p-4 transition-all duration-300
      ${collapsed? "w-28" : "w-80"} ${className}
      `
    }
    >
      <div
        className={`flex items-center mb-4 ${collapsed ? "flex-col gap-2" : "justify-between"}`}
      >
        {collapsed ? (
          <img
            src={SLogo}
            alt="codex merchants"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <img
            src={Logo}
            alt="codex merchants"
            className="w-40 h-14 object-cover rounded-full"
          />
        )}

        {/* collapsable toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center h-7 w-7 rounded-full bg-surface border border-line text-ink hover:border-red transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div
        className={`flex items-center mb-4 ${collapsed ? "justify-center" : "justify-between"}`}
      >
        <DarkModeToggle collapsed={collapsed} />
      </div>

      {!collapsed && topContent && <Card variant="glass">{topContent}</Card>}

      {/*Nav items*/}
      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <NavItem
              key={item.id}
              label={item.label}
              Icon={item.icon}
              active={isActive}
              onClick={() => navigate(item.path)}
              collapsed={collapsed}
            />
          )
        })}
      </nav>
    </aside>
  )
}

SideBar.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
    })
  ),
  topContent: PropTypes.node,
  className: PropTypes.string,
}

SideBar.defaultProps = {
  items: [],
  topContent: null,
  className: "",
}
