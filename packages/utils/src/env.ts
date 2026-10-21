declare global {
    interface ImportMetaEnv {
        readonly PUBLIC_AUTH_ISSUER?: string
        readonly PUBLIC_DOMAIN_RPC_PROXY?: string
        readonly PUBLIC_RPC_URL?: string
        readonly PUBLIC_UPLOAD_URL?: string
        readonly RPC_URL?: string
        readonly RPC_PORT?: string
        // Pinned by each app's Vite/Astro config — the dev box's own name when it
        // is browsed as something other than localhost.
        readonly TAILSCALE_URL?: string
        readonly VITE_AUTH_ISSUER?: string
        readonly VITE_DOMAIN_RPC_PROXY?: string
        readonly VITE_MAPBOX_ACCESS_TOKEN?: string
        readonly VITE_RPC_URL?: string
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv
    }
}

export {}
