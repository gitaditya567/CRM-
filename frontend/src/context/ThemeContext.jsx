import React, { createContext, useState, useEffect, useContext } from 'react';

// Export the Context directly (named export)
export const ThemeContext = createContext();

// Export the hook (named export)
export const useTheme = () => useContext(ThemeContext);

// Export the Provider as DEFAULT export
const ThemeProvider = ({ children }) => {
    // Direct initialization
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        const root = window.document.documentElement;
        console.log(`[ThemeContext] Theme changed to: ${theme}`);

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeProvider;
