import Card from "../atoms/Card";
import MetricValue from "../atoms/MetricValue";

// displays a metric with an icon, value and unit
// used in dashboard and analytics page

export default function StatCard({
    icon: Icon,
    label,
    value,
    unit,
    color = "text-OffBlack",
    className = "",
}) {
    return (
        <Card variant="glass" className={className}>
            <div className="flex flex-col gap-3">
            {/* Icon */}
            {Icon && (
                <div className={`${color}`}>
                    <Icon size={24} />
                </div>
            )}

            {/*label*/}
            <p className="text-xs text-OffBlack uppercase tracking-wider">
                {label}
            </p>

            {/* value and unit*/}
            <MetricValue value={value} unit={unit} size="md" />

            </div>
        </Card>
    );
}