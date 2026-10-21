/** # Authentication presentation state */
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Ui from "@foldkit/ui"

/**
 * Provider-neutral presentation identity; it carries no credentials or proof of
 * an active session. Email and image URL are plain strings, so consumers must not
 * assume contact-input validation or authorization from a decoded profile.
 */
export const Profile = Schema.Struct({
    id: Schema.String,
    email: Schema.String,
    display_name: Schema.String,
    image_url: Schema.Option(Schema.String),
})
export type Profile = typeof Profile.Type

/**
 * Authentication UI state with independent status, profile and error fields.
 * Loading or failure can retain a previous profile; presence alone does not imply
 * signed-in state. Transitions belong to the adjacent submodel rather than callers
 * constructing arbitrary status/profile combinations.
 */
export const Model = Schema.Struct({
    status: Schema.Literals(["loading", "signed_out", "signed_in", "error"]),
    profile: Schema.Option(Profile),
    error: Schema.Option(Schema.String),
    account_menu: Ui.Menu.Model,
})
export type Model = typeof Model.Type

/**
 * Starts without a profile while the host resolves authentication.
 */
export const initial: Model = {
    status: "loading",
    profile: Option.none(),
    error: Option.none(),
    account_menu: Ui.Menu.init({ id: "authkit-account-menu" }),
}
