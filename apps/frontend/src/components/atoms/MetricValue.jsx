import PropTypes from "prop-types"

const MetricValue = ({ value, unit, size = "md", className = "" }) => {
  const valueSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  }
  const unitSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  }

  return (
    <div
      className={["flex items-baseline gap-1 leading-none", className].join(
        " "
      )}
    >
      <span
        className={[
          "font-display font-bold text-ink tracking-tight",
          valueSizes[size],
        ].join(" ")}
      >
        {value}
      </span>
      {unit && (
        <span
          className={[
            "font-sans font-medium text-ink",
            unitSizes[size],
          ].join(" ")}
        >
          {unit}
        </span>
      )}
    </div>
  )
}

MetricValue.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string,
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
  className: PropTypes.string,
}

MetricValue.defaultProps = {
  unit: undefined,
  size: "md",
  className: "",
}
export default MetricValue
