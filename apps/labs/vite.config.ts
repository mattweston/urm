import { foldkit } from "@foldkit/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { highlighted_source_plugin } from "@urm/features/labs/walkthrough/highlighted-source.plugin"
import { defineConfig } from "vite"

export default defineConfig({
    appType: "spa",
    envDir: "../..",
    // The walkthrough lesson imports its own examples as `?highlighted`, so the
    // plugin that answers that suffix has to run for the lessons to load.
    plugins: [highlighted_source_plugin(), foldkit({}), tailwindcss()],
    server: {
        host: "0.0.0.0",
        port: 1421,
        strictPort: true,
    },
    optimizeDeps: {
        include: ["@urm/features > mapbox-gl", "@urm/features > three"],
    },
})
