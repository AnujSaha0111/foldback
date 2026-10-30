export const THEME_STORAGE_KEY = "fb-theme";

/**
 * Runs before the first paint (next/script, beforeInteractive) so a saved dark theme never flashes light.
 * It is a plain string with no user data in it, and it only reads one localStorage key.
 */
export const themeInitScript = `(function(){var m="light";try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark"){m="dark";}}catch(e){}document.documentElement.setAttribute("data-theme",m);})();`;
