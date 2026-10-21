/** # Authorized social account operations */
import { Config, Effect, Option, Schema } from "effect"
import { require_account_domain } from "@urm/auth"
import { ZernioProvider } from "./provider.ts"
import { SocialStore, SocialStoreError, type SocialPrincipal } from "./store.ts"

const ConnectedPlatform = Schema.Literals(["facebook", "instagram"])

/**
 * Resolves a profile for operations that connect or synchronize social accounts.
 * Both operations require write authority, even when the profile already exists;
 * checking only its creation would let read-only members trigger mutations.
 */
const profile_for_workspace = Effect.fn("Social.profileForWorkspace")(
    function* (principal: SocialPrincipal, create_if_missing: boolean) {
        const store = yield* SocialStore
        yield* require_account_domain(
            principal,
            principal.domain_id,
            true,
            null
        ).pipe(
            Effect.mapError(
                () =>
                    new SocialStoreError({
                        message:
                            "Social operation unavailable or access denied",
                    })
            )
        )
        const current = yield* store.load_profile(principal)
        if (current !== null) return current
        const slug = yield* store.load_domain_slug(principal)
        const legacy_profile = yield* Config.option(
            Config.string("ZERNIO_PROFILE_ID")
        )
        if (slug === "test1") {
            const provider = yield* ZernioProvider
            const legacy_profile_id = Option.isSome(legacy_profile)
                ? legacy_profile.value
                : yield* Effect.gen(function* () {
                      const defaults = (yield* provider.list_profiles()).filter(
                          (profile) => profile.isDefault === true
                      )
                      if (defaults.length !== 1 || defaults[0] === undefined)
                          return yield* Effect.fail(
                              new SocialStoreError({
                                  message:
                                      "The existing Social profile could not be identified",
                              })
                          )
                      return defaults[0]._id
                  })
            return yield* store.bind_profile(principal, legacy_profile_id)
        }
        if (!create_if_missing) return null
        const provider = yield* ZernioProvider
        const created_profile_id = yield* provider.create_profile(
            `URM workspace ${principal.domain_id}`,
            `urm-social-profile:${principal.domain_id}`
        )
        return yield* store.bind_profile(principal, created_profile_id)
    }
)

export const sync_social_accounts = Effect.fn("Social.syncAccounts")(function* (
    principal: SocialPrincipal
) {
    const store = yield* SocialStore
    const provider = yield* ZernioProvider
    const profile_id = yield* profile_for_workspace(principal, false)
    if (profile_id === null) return yield* store.load_accounts(principal)
    const accounts = yield* provider.list_accounts(profile_id)
    return yield* store.replace_accounts(
        principal,
        accounts.map((account) => ({
            account_id: account._id,
            profile_id:
                typeof account.profileId === "string"
                    ? account.profileId
                    : account.profileId._id,
            platform: account.platform,
            username: account.username,
            display_name: account.displayName ?? null,
            avatar_url: account.avatarUrl ?? null,
            active: account.isActive,
        }))
    )
})

export const connect_social_account = Effect.fn("Social.connectAccount")(
    function* (principal: SocialPrincipal, value: string) {
        const platform = yield* Schema.decodeUnknownEffect(ConnectedPlatform)(
            value
        ).pipe(
            Effect.mapError(
                () =>
                    new SocialStoreError({
                        message: "Select Facebook or Instagram",
                    })
            )
        )
        const provider = yield* ZernioProvider
        const profile_id = yield* profile_for_workspace(principal, true)
        if (profile_id === null)
            return yield* Effect.fail(
                new SocialStoreError({
                    message: "Social profile could not be prepared",
                })
            )
        const auth_url = yield* provider.connect_account(profile_id, platform)
        return { auth_url, profile_id }
    }
)
