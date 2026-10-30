export type ThemePreference = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "lokesh-theme";

// Runs in <head> before the page paints. Storage is optional (private/restricted browsers).
export const THEME_INIT_SCRIPT = `(()=>{try{const theme=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(theme==='light'||theme==='dark')document.documentElement.dataset.theme=theme;}catch{}})()`;
