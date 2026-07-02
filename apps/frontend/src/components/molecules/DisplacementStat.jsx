import PropTypes from "prop-types"
import { Card, Label, MetricValue } from "../atoms"

/**
 * handsles the "no data yet" and decimal formatting that metric val atom doesnt handle
 * passes raw numeric telemetry values from the websocket payload
 */

export default function DisplacementStat({
  label,
  value,
  unit = "",
  decimals = 2,
  size = "md",
  variant = "glass",
}) {
  const formattedValue =
    value !== undefined && value !== null ? value.toFixed(decimals) : "-"

  return (
    <Card variant={variant} className="flex flex-col gap-2">
      <Label>{label}</Label>
      <MetricValue value={formattedValue} unit={unit} size={size} />
    </Card>
  )
}

DisplacementStat.PropTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.number,
  unit: PropTypes.string,
  decimals: PropTypes.number,
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
  variant: PropTypes.oneOf(["glass", "dark"]),
}

DisplacementStat.defaultProps = {
  value: undefined,
  unit: "",
  decimals: 2,
  size: "md",
  variant: "glass",
}
