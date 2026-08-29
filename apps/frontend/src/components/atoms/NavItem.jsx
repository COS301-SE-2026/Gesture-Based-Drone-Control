import PropTypes from "prop-types"

const NavItem = ({
  label,
  Icon,
  active = false,
  onClick,
  collapsed = false,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={[
        "flex items-center w-full py-2.5 rounded-lg",
        collapsed ? "justify-center px-2" : "gap-3 px-4",
        "font-sans text-base font-medium",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-red/40",
        "group",
        active
          ? "bg-red text-white shadow-md scale-[1.02]"
          : "text-ink hover:bg-ink/10 hover:translate-x-0.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon && (
        <Icon
          size={30}
          strokeWidth={active ? 2 : 1.8}
          className={active ? "text-white" : "text-ink group-hover:scale-100"}
        />
      )}
      {!collapsed && <span>{label}</span>}
    </button>
  )
}

NavItem.propTypes = {
  label: PropTypes.string.isRequired,
  Icon: PropTypes.elementType,
  active: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
}

NavItem.defaultProps = {
  Icon: undefined,
  active: false,
  onClick: undefined,
  className: "",
}

export default NavItem
