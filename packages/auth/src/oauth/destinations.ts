/**
 * # OAuth Destinations
 *
 * Closed set of named post-login targets, resolved to URLs from config.
 */
export type OAuthDestination = "admin" | "marketing"

export type OAuthDestinationConfig = Readonly<{
    adminAppUrl: string
    marketingAppUrl: string
}>

export const oauthDestinationFromUnknown = (
    value: string | null
): OAuthDestination | undefined => {
    if (value === "admin") {
        return "admin"
    }

    if (value === "marketing") {
        return "marketing"
    }

    return undefined
}

export const oauthDestinationUrl = (
    config: OAuthDestinationConfig,
    destination: OAuthDestination
): string => {
    if (destination === "admin") {
        return config.adminAppUrl
    }

    return config.marketingAppUrl
}

export const oauthDestinationLoginUrl = (
    config: OAuthDestinationConfig,
    destination: OAuthDestination
): string => {
    const appUrl = oauthDestinationUrl(config, destination)
    const loginPath = "/auth/login/"

    return new URL(loginPath, `${appUrl}/`).toString()
}

export const configuredOAuthDestination = (
    config: OAuthDestinationConfig,
    url: string | undefined
): OAuthDestination | undefined => {
    if (url === config.adminAppUrl) {
        return "admin"
    }

    if (url === config.marketingAppUrl) {
        return "marketing"
    }

    return undefined
}
