import React from "react";

const Button = ({
    children,
    variant = "primary",
    size = "md",
    icon:Icon,
    iconPosition = "false",
    disabled = false ,
    fullWidth = false ,
    onClick ,
    className = "",
    ...props 
    }) => {
        const base = [
            "inline-flex items-center justify-center gap-2",
            "font-inter font-semibold",
            "rounded-lg transition-all duration-200",
            "focus:outline-none focus-visible:outline-none",
            "select-none cursor-pointer",
        ].join(" ");
        const variants={//so the buttons in the page will have three varinats 
            primary:[//should basically be a red button for primary actions
                "bg-Red hover:bg-LightRed active:bg-DarkRed",
                "test-OffWhite",
                "shadow-md",
            ].join(" "),
            secondary:[
                "bg-transperant hover:bg-OffWhite/10",
                "text-OffWhite",
            ].join(" "),
            ghost:[//will be a button without backgrounds especially for like icons.
                "bg-transparent hover:bg-OffWhite/10",
                "text-DarkGrey hover:text-OffWhite",
            ].join(" "),
            danger:[
                "bg-DarkRed/60 hover:bg-DarkRed active:bg-DarkRed/80",
                "text-OffWhite/80",
                "border border-Red/50",
            ].join(" "),
        };
        const sizes = {//3 basic ones 
            sm:"text-xs px-sm py-xs rounded-md",
            md:"text-sm px-md py-xs",
            lg:"text-base px-lg py-sm rounded-xl",
        };

        const iconSize = {sm:12,md:14,lg:18}[size];

        return(
            <button
            onClick={onClick}
            disabled={disabled}
            className={[
                base,
                variants[variant],
                disabled ?"opacity-40 cursor-not-allowed pointer-events-none" :"",
                fullWidth?"w-full":"",
                className,
            ].filter(Boolean).join(" ")}
            {...props}
            >
            {Icon && iconPosition === "left" && <Icon size={iconSize}/>}
            {children}
            {Icon && iconPosition === "right" && <Icon size={iconSize}/>}
            </button>
            
        );

    };
    export default Button;