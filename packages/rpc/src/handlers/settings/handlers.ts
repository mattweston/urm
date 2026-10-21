import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Context } from "effect"
import { SettingsRpcs } from "@urm/contracts/settings"
import {
    ActiveDomainRequestContext,
    AuthenticatedRequestContext,
} from "@urm/contracts/auth-legacy"
import {
    MarketingAppearanceRepository,
    PreferencesRepository,
} from "@urm/contracts/repositories/settings"
import {
    DatabaseError,
    type MarketingAppearance,
    type Theme,
} from "@urm/domain/schemas/settings"

const defaultPreference = (contact_id: string, theme: Theme) => ({
    id: `pref-${contact_id}-${Date.now()}`,
    contact_id,
    theme,
    language: "en",
    notifications: true,
    updated_at: Date.now(),
})

const defaultMarketingAppearance = (
    domain_id: string
): MarketingAppearance => ({
    id: domain_id,
    theme: "light",
    font_preset: "Theme",
    background_image_id: null,
    updated_at: 0,
})

const SettingsRpcHandlersLive = Effect.gen(function* () {
    const preferencesRepo = yield* PreferencesRepository
    const marketingAppearanceRepo = yield* MarketingAppearanceRepository

    return SettingsRpcs.of({
        get_by_contact_id: () =>
            Effect.gen(function* () {
                const authenticated = yield* AuthenticatedRequestContext

                return yield* preferencesRepo
                    .findByContactId(authenticated.contactId)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to load preferences",
                                })
                        )
                    )
            }),

        set_theme: ({ theme }) =>
            Effect.gen(function* () {
                const authenticated = yield* AuthenticatedRequestContext
                const contact_id = authenticated.contactId
                const existing = yield* preferencesRepo
                    .findByContactId(contact_id)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to load preferences",
                                })
                        )
                    )

                const savedPreference =
                    existing === null
                        ? yield* preferencesRepo
                              .insert(defaultPreference(contact_id, theme))
                              .pipe(
                                  Effect.mapError(
                                      () =>
                                          new DatabaseError({
                                              message:
                                                  "Failed to save preferences",
                                          })
                                  )
                              )
                        : yield* preferencesRepo
                              .update(existing.id, {
                                  theme,
                                  updated_at: Date.now(),
                              })
                              .pipe(
                                  Effect.mapError(
                                      () =>
                                          new DatabaseError({
                                              message:
                                                  "Failed to save preferences",
                                          })
                                  )
                              )

                return savedPreference
            }),
        marketing_appearance_get: () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* marketingAppearanceRepo
                    .get(activeDomain.domainId)
                    .pipe(
                        Effect.flatMap((appearance) => {
                            if (appearance !== null) {
                                return Effect.succeed(appearance)
                            }

                            return Effect.succeed(
                                defaultMarketingAppearance(
                                    activeDomain.domainId
                                )
                            )
                        }),
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message:
                                        "Failed to load marketing appearance",
                                })
                        )
                    )
            }),
        marketing_appearance_set: (appearance) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* marketingAppearanceRepo
                    .save(activeDomain.domainId, appearance)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message:
                                        "Failed to save marketing appearance",
                                })
                        )
                    )
            }),
    })
})

export const SettingsRpcLive = SettingsRpcs.toLayer(SettingsRpcHandlersLive)

export type SettingsRpcHandlers = {
    get_by_contact_id: () => Effect.Effect<
        import("@urm/domain/schemas/settings").Preference | null,
        DatabaseError,
        AuthenticatedRequestContext
    >
    set_theme: (params: { theme: Theme }) => Effect.Effect<
        {
            item: import("@urm/domain/schemas/settings").Preference
            txid: number
        },
        DatabaseError,
        AuthenticatedRequestContext
    >
    marketing_appearance_get: () => Effect.Effect<
        MarketingAppearance,
        DatabaseError,
        ActiveDomainRequestContext
    >
    marketing_appearance_set: (
        params: import("@urm/domain/schemas/settings").UpdateMarketingAppearanceInput
    ) => Effect.Effect<
        MarketingAppearance,
        DatabaseError,
        ActiveDomainRequestContext
    >
}

export class SettingsRpcHandlersTag extends Context.Service<
    SettingsRpcHandlersTag,
    SettingsRpcHandlers
>()("SettingsRpcHandlers") {}

export const SettingsRpcHandlersTagLive = Layer.effect(
    SettingsRpcHandlersTag,
    SettingsRpcHandlersLive
)
