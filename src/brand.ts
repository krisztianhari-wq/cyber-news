// Build-time brand switch. The sadrobot server (cyber.sadrobot.eu) builds without VITE_BRAND and gets sadrobot;
// the GitHub Pages workflow sets VITE_BRAND=yettel and gets the Yettel look.
export const BRAND: "yettel" | "sadrobot" = import.meta.env.VITE_BRAND === "yettel" ? "yettel" : "sadrobot";
export const SITE_NAME = BRAND === "yettel" ? "Yettel Cyber Digest" : "sadrobot Cyber Digest";
