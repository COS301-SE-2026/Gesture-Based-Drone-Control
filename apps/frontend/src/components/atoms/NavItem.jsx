

const NavItem = ({ label, Icon, active = false, onClick, className = ""}) => {
    return (
        <button
            onClick={onClick}
            className={[
                "flex item-center gap-sm w-full px-sm py-xs rounded-lg",
                "font-Inter text-sm font-medium",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-Red/40",
                "group",
                active ? "bg-DarkGrey text-OffBlack shadow-md" : "text-DarkGrey text-OffBlack hover:bg-OffWhite/10",
                className,
            ].filter(Boolean).join(" ")}
            >
                {Icon && (
                    <Icon
                    size={18}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={
                        active ? "text-OffWhite" : "text-DarkGrey group-hover:text-OffWhite transition-colors"
                    }
                />
                )}
                <span>{label}</span>
            </button>
    );
};

export default NavItem;