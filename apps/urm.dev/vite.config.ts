import { foldkit } from "@foldkit/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { devServerUrls } from "@urm/utils/dev-server"
import { defineConfig } from "vite"
import { publication_site } from "./publication-site.plugin.ts"

export default defineConfig({
    appType: "spa",
    envDir: "../..",
    plugins: [
        publication_site(),
        foldkit({}),
        tailwindcss(),
        devServerUrls("http://urm.test"),
    ],
    server: {
        host: "0.0.0.0",
        port: 1420,
        strictPort: true,
        allowedHosts: ["urm.test", ".urm.test", ".localhost"],
        proxy: {
            "/api/uploads": { target: "http://127.0.0.1:1234" },
            "/api/rpc": { target: "http://127.0.0.1:1234" },
            "/auth": { target: "http://127.0.0.1:1234" },
        },
    },
    optimizeDeps: {
        include: [
            "@capacitor/core",
            "@urm/features > mapbox-gl",
            "@urm/features > three",
        ],
    },
})
