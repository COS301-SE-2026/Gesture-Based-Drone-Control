const StatusDot = ({ 
    variant = "connected",
    size = "sm",
    className = ""
}) => {
    const dotColor = {
        connected: "bg-green-400",
        disconnected: "bg-Red",
        warning: "bg-yellow-400",
        idle: "bg-DarkGrey opacity-30",
    }[variant];

    const pingColour = {
        connected: "bg-green-400",
        disconnected: "bg-Red",
        warning: "bg-yellow-400",
        idle: "",
    }[variant];

    const sizeClass = {
        sm: "h-1 w-1",
        md: 'h-2.5 w-2.5',
    }[size];

    return(
        <span className={["relative flex shrink-0", sizeClass,
            className].join(" ")}>
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
    );
};

export default StatusDot;