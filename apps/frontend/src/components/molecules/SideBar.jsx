import { useNavigate, useLocation } from "react-router-dom";
import NavItem from "../atoms/NavItem";
import Card from "../atoms/Card";

//main nav sidebar that will be displayed on all pages

export default function SideBar({ 
        items = [],
        topContent = null,
        bottomContent = null,
        className = ""
    }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <aside className={`bg-OffWhite dark:bg-OffBlack border-r border-Grey/30 dark:border-DarkGrey/20 w-80 flex flex-col gap-3 p-4 min-h-screen ${className} `}>
            {/*Logo goes here*/}
            <div className="flex justify-between items-center mb-4">
                <img 
                    src="apps/frontend/src/assets/codex_merchants_logo.png" 
                    alt="Codex Merchants Logo"
                    className="w-20 h-15 object-contain"
                />
            </div>

            {topContent && (
                <div className="mb-4">
                    {topContent}
                </div>
            )}

            {/*Nav items*/}
            <nav className="flex-1 space-y-1">
                {items.map((item) => {
                    const isActive = location.pathname === item.path;

                    return (
                        <NavItem
                        key={item.id}
                        label={item.label}
                        Icon={item.icon}
                        active={isActive}
                        onClick={() => navigate(item.path)}
                        />
                    );
                })}
            </nav>

            {bottomContent && (
                <div className="mt-auto pt-4 border-t border-Grey/20">
                    {bottomContent}
                </div>
            )}
        </aside>
    );
}
