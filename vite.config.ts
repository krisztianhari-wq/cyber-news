import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// GoatCounter site code (public, visible in page source anyway). Set VITE_GOATCOUNTER_CODE="" to disable.
const DEFAULT_GOATCOUNTER = "hadzsy";

// Optional privacy-friendly view counter (GoatCounter). Enabled only when
// VITE_GOATCOUNTER_CODE is set at build time; the CSP is widened for exactly that host.
function goatcounter(code: string | undefined): Plugin {
  return {
    name: "goatcounter",
    transformIndexHtml(html) {
      if (!code || !/^[a-z0-9-]+$/i.test(code)) return html;
      const host = `https://${code}.goatcounter.com`;
      return html
        .replace("script-src 'self'", "script-src 'self' https://gc.zgo.at")
        .replace("connect-src 'self'", `connect-src 'self' ${host}`)
        .replace("</body>", `  <script data-goatcounter="${host}/count" async src="https://gc.zgo.at/count.js"></script>\n  </body>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), goatcounter(process.env.VITE_GOATCOUNTER_CODE ?? DEFAULT_GOATCOUNTER)],
  base: process.env.VITE_BASE ?? "/",
  build: { target: "es2022" },
});
