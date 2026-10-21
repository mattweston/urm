/**
 * # OAuth Google
 *
 * Arctic Google client, with the redirect URI derived from the API base URL.
 */
import { Google } from "arctic"

export interface GoogleOAuthClient {
    readonly redirect_uri: string

    readonly google: Google
}

// The redirect URI must point straight at the API, never through an app proxy:
// fetch strips Set-Cookie from proxied responses, so the PKCE cookie would
// never reach the browser and every callback would fail as invalid_state.
// It must also match the Google Console registration exactly, hence stripping
// the trailing slash rather than producing "//auth/google/callback".
export function makeGoogle(
    apiUrl: string,
    clientId: string,
    clientSecret: string
): GoogleOAuthClient {
    const redirect_uri = `${apiUrl.replace(/\/$/, "")}/auth/google/callback`
    return {
        redirect_uri,
        google: new Google(clientId, clientSecret, redirect_uri),
    }
}
