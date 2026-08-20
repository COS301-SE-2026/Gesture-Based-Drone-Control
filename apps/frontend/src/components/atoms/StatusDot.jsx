import PropTypes from "prop-types"

const StatusDot = ({ variant = "connected", size = "sm", className = "" }) => {
  const dotColor = {
    connected: "bg-success",
    disconnected: "bg-red",
    warning: "bg-warning",
    idle: "bg-dim opacity-30",
  }[variant]

  const pingColour = {
    connected: "bg-success",
    disconnected: "bg-red",
    warning: "bg-warning",
    idle: "",
  }[variant]

  const sizeClass = {
    sm: "h-2.5 w-2.5",
    md: "h-4 w-4",
  }[size]

  return (
    <span
      className={["relative flex shrink-0", sizeClass, className].join(" ")}
    >
      {variant !== "idle" && (
        <span
          className={[
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-50",
            pingColour,
          ].join(" ")}
        />
      )}
      <span
        className={[
          "relative inline-flex rounded-full h-full w-full",
          dotColor,
        ].join(" ")}
      />
    </span>
  )
}

StatusDot.propTypes = {
  variant: PropTypes.oneOf(["connected", "disconnected", "warning", "idle"]),
  size: PropTypes.oneOf(["sm", "md"]),
  className: PropTypes.string,
}

StatusDot.defaultProps = {
  variant: "connected",
  size: "sm",
  className: "",
}

export default StatusDot
