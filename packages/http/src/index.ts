/**
 * # HTTP Package
 *
 * Web-standard `Request` -> `Effect<Response>` entrypoints for the auth, mail,
 * and public-form routes.
 */

export {
    handleFallbackAuthRequest,
    PasswordResetConfirmation,
    PasswordResetConfirmationLive,
} from "./legacy-auth-web-handler.ts"
export type { PasswordResetConfirmationShape } from "./legacy-auth-web-handler.ts"
export { handleGoogleAuthRequest } from "./google-auth-web-handler.ts"
export { handleMailRequest } from "./mail-web-handler.ts"
export { handleContactFormRequest } from "./contact-form-web-handler.ts"

export { handle_auth_request } from "./auth-web-handler.ts"

export { handle_upload_request, UploadStorage, UploadStorageLive } from "./uploads-web-handler.ts"
