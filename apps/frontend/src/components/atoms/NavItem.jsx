

const NavItem = ({ label, Icon, active = false, onClick, className = ""}) => {
    return (
        <button
            onClick={onClick}
            className={[
                "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg",
                "font-Inter text-base font-medium",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-Red/40",
                "group",
                active ? "bg-Red text-OffWhite shadow-md" : "text-DarkGrey text-OffBlack hover:bg-OffWhite/10",
                className,
            ].filter(Boolean).join(" ")}
            >
                {Icon && (
                    <Icon
                    size={35}
                    strokeWidth={active ? 2 : 1.8}
                    className={
                        active ? "text-OffWhite" : "text-OffBlack group-hover:text-OffBlack transition-colors"
                    }
                />
                )}
                <span>{label}</span>
            </button>
    );
};

export default NavItem;