/**
 * Capabilities that must be disabled for an isolated demo deployment.
 *
 * This is driven solely by startup configuration, never by the request host.
 */
export type RuntimeCapabilities = Readonly<{
    uploads_enabled: boolean
    storage_proxy_enabled: boolean
    upload_bucket_configuration_enabled: boolean
}>

const production_capabilities: RuntimeCapabilities = {
    uploads_enabled: true,
    storage_proxy_enabled: true,
    upload_bucket_configuration_enabled: true,
}

const demo_capabilities: RuntimeCapabilities = {
    uploads_enabled: false,
    storage_proxy_enabled: false,
    upload_bucket_configuration_enabled: false,
}

export const runtimeCapabilities = (is_demo: boolean): RuntimeCapabilities =>
    is_demo ? demo_capabilities : production_capabilities

export const isDemoAllowedOrigin = (origin: string): boolean => {
    const hostname = new URL(origin).hostname

    return (
        hostname === "urm.urm.dev" ||
        (hostname.startsWith("demo-") && hostname.endsWith(".urm.dev")) ||
        (hostname.startsWith("urm.demo-") && hostname.endsWith(".urm.dev"))
    )
}
