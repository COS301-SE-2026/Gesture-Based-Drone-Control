import { useNavigate, useLocation } from "react-router-dom";
import NavItem from "../atoms/NavItem";

//main nav sidebar that will be displayed on all pages

export default function SideBar({ items = [] }) {
    const navigate = useNavigate();
    const location = useLocation();

    if (!items.length) {
        return null;
    }

    return (
        <aside className="bg-OffWhite dark:bg-OffBlack border-r border-Grey/30 dark:border-DarkGrey/20 w-30 flex flex-col gap-3 p-4 min-h-screen">
            {/*Logo goes here*/}
            <div className="flex justify-center mb-4">
                <img 
                    src="" //need to put img in assets
                    alt="Codex Merchants Logo"
                    className="w-10 h-10 object-contain rounded-lg"
                />
            </div>

            {/* need to add the welcome card but it differs so need to figure that out */}

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
        </aside>
    );
}
