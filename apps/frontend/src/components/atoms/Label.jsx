import React from "react";

const Label =({ children,size = "xs", className = ""})=>{
    const sizes = {
        xs:"text-[11px] tracking-widest",
        sm:"text-xs tracking-wider",

    };

    return(
        <span
        className={[
            "font-Inter font-semibold uppercase text-DarkGrey",
            sizes[size],
            className,
        ].filter(Boolean).join(" ")}
        >
            {children}
        </span>
    );
};

export default Label;