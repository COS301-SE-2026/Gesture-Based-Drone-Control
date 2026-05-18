

const MetricValue = ({ value,unit,size="md",className=""}) =>{
    const valueSizes = {
        sm: "text-lg",
        md: "text-2xl",
        lg: "text-3xl",
        xl: "text-4xl",
    };
    const unitSizes ={
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-lg",
    };

    return(
        <div className={["flex items-baseline gap-1 leading-none", className].join(" ")}>
            <span
            className={[
                "font-display font-bold text-OffBlack tracking-tight",
                valueSizes[size],
            ].join(" ")}
            >
                {value}
            </span>
            {unit && (
                <span
                className={[
                    "font-Inter font-medium text-OffBlack",
                    unitSizes[size],
                ].join(" ")}
                >
                    {unit}
                </span>
            
            )}
            </div>
    );
};
export default MetricValue;         
