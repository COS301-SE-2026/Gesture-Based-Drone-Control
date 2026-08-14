import PropTypes from "prop-types"

const Label = ({ children, size = "xs", className = "" }) => {
  const sizes = {
    xs: "text-[11px] tracking-widest",
    sm: "text-xs tracking-wider",
  }

  return (
    <span
      className={[
        "font-sans font-semibold uppercase text-dim",
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  )
}

Label.propTypes = {
  children: PropTypes.node,
  size: PropTypes.oneOf(["xs", "sm"]),
  className: PropTypes.string,
}

Label.defaultProps = {
  children: undefined,
  size: "xs",
  className: "",
}

export default Label
