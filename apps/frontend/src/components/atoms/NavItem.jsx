import PropTypes from "prop-types"

const NavItem = ({ label, Icon, active = false, onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg",
        "font-sans text-base font-medium",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-red/40",
        "group",
        active
          ? "bg-red text-OffWhite shadow-md"
          : "text-ink hover:bg-ink/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon && (
        <Icon
          size={35}
          strokeWidth={active ? 2 : 1.8}
          className={active? "text-OffWhite": "text-ink transition-colors"}
        />
      )}
      <span>{label}</span>
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
