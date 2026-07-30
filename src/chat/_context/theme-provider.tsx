import { createContext, PropsWithChildren, useEffect, useState } from "react";

export type Theme = "dark" | "light";

export const ThemeContext = createContext<
    | undefined
    | { theme: Theme; setTheme: (theme: Theme) => void }
>(undefined);

export default function ThemeProvider({ children }: PropsWithChildren) {
    const [theme, setThemeState] = useState<Theme>("dark");

    useEffect(() => {
        const stored = localStorage.getItem("chat-theme") as Theme | null;
        if (stored === "light" || stored === "dark") {
            setThemeState(stored);
        }
    }, []);

    const setTheme = (t: Theme) => {
        setThemeState(t);
        localStorage.setItem("chat-theme", t);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <div className={`${theme === "dark" ? "dark" : ""} h-full w-full`}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}
