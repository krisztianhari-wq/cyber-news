import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Brand switch (see src/brand.ts): VITE_BRAND=yettel gives the Yettel title, favicon and palette hook;
// anything else keeps index.html as written (sadrobot).
function brand(name: string | undefined): Plugin {
  return {
    name: "brand",
    transformIndexHtml(html) {
      if (name !== "yettel") return html;
      const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23002340'/%3E%3Ccircle cx='16' cy='16' r='7' fill='%23B4FF00'/%3E%3C/svg%3E";
      return html
        .replace('<html lang="en">', '<html lang="en" data-brand="yettel">')
        .replace("<title>sadrobot Cyber Digest</title>", "<title>Yettel Cyber Digest</title>")
        .replace(/\s*<link rel="(icon|apple-touch-icon)"[^>]*>/g, "")
        .replace("</title>", `</title>\n    <link rel="icon" href="${icon}" />`);
    },
  };
}

export default defineConfig({
  plugins: [react(), brand(process.env.VITE_BRAND)],
  base: process.env.VITE_BASE ?? "/",
  build: { target: "es2022" },
});
