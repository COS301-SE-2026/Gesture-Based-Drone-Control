import { useNavigate, useLocation } from "react-router-dom"
import { NavItem, Card } from "../atoms"
import DarkModeToggle from "./DarkModeToggle"
import Logo from "../../assets/codex_merchants_logo.png"
import PropTypes from "prop-types"

//main nav sidebar that will be displayed on all pages

export default function SideBar({
  items = [],
  topContent = null,
  className = "",
}) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside
      className={`bg-surface border-r border-line w-80 h-full flex flex-col gap-3 p-4 min-h-screen ${className} `}
    >
      {/*Logo goes here*/}
      <div className="flex justify-between items-center mb-4">
        <img
          src={Logo}
          alt="Codex Merchants Logo"
          className="w-40 h-14 object-cover rounded-full"
        />
      </div>

      <div className="flex justify-between items-center mb-4">
        <DarkModeToggle />
      </div>

      {topContent && <Card variant="glass">{topContent}</Card>}

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
