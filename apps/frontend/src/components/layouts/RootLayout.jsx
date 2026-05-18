import { Outlet } from "react-router-dom";
import { SideBar } from "../molecules";
import { Home, Hand, BarChart3, MapPin, Settings } from 'lucide-react';

const RootLayout = () => {
    const menuItems = [
        {id: 'home', label: 'Home', icon: Home, path: './dashboard' },
        {id: 'gestures', label: 'Gestures', icon: Hand, path: './gestures' },
        {id: 'analytics', label: 'Analytics', icon: BarChart3, path: './analytics' },
        {id: 'gps', label: 'GPS', icon: MapPin, path: './gps' },
        {id: 'settings', label: 'Settings', icon: Settings, path: './settings' },
    ];

    return (
        <div className="flex min-h-screen bg-OffWhite dark:bg-OffBlack">
            <SideBar items={menuItems} />
            <main className="flex-1 overflow-y-auto">
                <Outlet/>
            </main>
        </div>
    );
};

export default RootLayout;