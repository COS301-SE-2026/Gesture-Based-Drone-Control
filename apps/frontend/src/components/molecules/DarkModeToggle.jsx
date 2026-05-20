import { Toggle } from "../atoms";
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react'

const DarkModeToggle = () => {
    const[isDark, setIsDark] = useState(() => {
        return localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    return (
        <div className="flex items-center gap-2">
            <Sun className="w-8 h-8 text-OffWhite dark:text-OffBlack" />
            <Toggle
                checked={isDark}
                onChange={() => setIsDark(!isDark)}
            />
            <Moon className="w-8 h-8 text-OffWhite dark:text-OffBlack" />
        </div>
    );
};

export default DarkModeToggle;