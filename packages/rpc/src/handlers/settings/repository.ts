import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, eq } from "drizzle-orm"
import { DB } from "@urm/db/layer"
import { images } from "@urm/db/legacy-schema/media/images"
import { marketing_appearance, preferences } from "@urm/db/legacy-schema/settings"
import { repositoryError } from "../errors.ts"
import {
    CreatePreferenceInput,
    MarketingAppearance,
    Preference,
    UpdateMarketingAppearanceInput,
    UpdatePreferenceInput,
} from "@urm/domain/schemas/settings"
import {
    PreferencesRepository,
    type PreferencesRepositoryType,
    MarketingAppearanceRepository,
    type MarketingAppearanceRepositoryType,
} from "@urm/contracts/repositories/settings"

export const PreferencesRepositoryLive = Layer.effect(
    PreferencesRepository,
    Effect.gen(function* () {
        const db = yield* DB
        const decodePreference = Schema.decodeUnknownEffect(Preference)
        const toPreference = (row: typeof preferences.$inferSelect) =>
            decodePreference({
                ...row,
            })

        const repository: PreferencesRepositoryType = {
            insert: (data) =>
                Effect.gen(function* () {
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreatePreferenceInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const inserted = yield* db
                        .insert(preferences)
                        .values({
                            id: validated.id,
                            contact_id: validated.contact_id,
                            theme: validated.theme ?? "light",
                            language: validated.language ?? "en",
                            notifications: validated.notifications ?? true,
                            updated_at: validated.updated_at,
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert preferences")
                        )
                    }

                    const item = yield* toPreference(inserted[0]!).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Invalid preference row: ${error}`)
                        )
                    )

                    return {
                        item,
                        txid: 0,
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (id, data) =>
                Effect.gen(function* () {
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdatePreferenceInput
                    )({
                        id,
                        ...data,
                    }).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const updateData: Record<string, unknown> = {
                        updated_at: validated.updated_at,
                    }

                    if (validated.theme !== undefined)
                        updateData.theme = validated.theme
                    if (validated.language !== undefined)
                        updateData.language = validated.language
                    if (validated.notifications !== undefined)
                        updateData.notifications = validated.notifications

                    const updated = yield* db
                        .update(preferences)
                        .set(updateData)
                        .where(eq(preferences.id, id))
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Preferences with id ${id} not found`
                            )
                        )
                    }

                    const item = yield* toPreference(updated[0]!).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Invalid preference row: ${error}`)
                        )
                    )

                    return {
                        item,
                        txid: 0,
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (id) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(preferences)
                        .where(eq(preferences.id, id))
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    return yield* toPreference(results[0]!).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Invalid preference row: ${error}`)
                        )
                    )
                }).pipe(Effect.mapError(repositoryError)),

            findByContactId: (contact_id) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(preferences)
                        .where(eq(preferences.contact_id, contact_id))
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    return yield* toPreference(results[0]!).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Invalid preference row: ${error}`)
                        )
                    )
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)

export const MarketingAppearanceRepositoryLive = Layer.effect(
    MarketingAppearanceRepository,
    Effect.gen(function* () {
        const db = yield* DB
        const decodeMarketingAppearance =
            Schema.decodeUnknownEffect(MarketingAppearance)
        const toMarketingAppearance = (
            row: typeof marketing_appearance.$inferSelect
        ) =>
            decodeMarketingAppearance({
                id: row.domain_id,
                theme: row.theme,
                font_preset: row.font_preset,
                background_image_id: row.background_image_id,
                updated_at: row.updated_at,
            })

        const get = (domain_id: string) =>
            Effect.gen(function* () {
                const rows = yield* db
                    .select()
                    .from(marketing_appearance)
                    .where(eq(marketing_appearance.domain_id, domain_id))
                    .pipe(Effect.mapError(repositoryError))

                if (rows.length === 0) {
                    return null
                }

                const row = rows[0]
                if (row === undefined) {
                    return null
                }

                return yield* toMarketingAppearance(row).pipe(
                    Effect.mapError((error) =>
                        repositoryError(
                            `Invalid marketing appearance row: ${error}`
                        )
                    )
                )
            })

        const repository: MarketingAppearanceRepositoryType = {
            get,
            save: (domain_id, data) =>
                Effect.gen(function* () {
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateMarketingAppearanceInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )
                    const updated_at = Date.now()
                    if (validated.background_image_id !== null) {
                        const image_rows = yield* db
                            .select({ id: images.id })
                            .from(images)
                            .where(
                                and(
                                    eq(images.domain_id, domain_id),
                                    eq(images.id, validated.background_image_id)
                                )
                            )
                            .limit(1)
                            .pipe(Effect.mapError(repositoryError))

                        if (image_rows[0] === undefined) {
                            return yield* Effect.fail(
                                repositoryError("Background image not found")
                            )
                        }
                    }
                    const rows = yield* db
                        .insert(marketing_appearance)
                        .values({
                            domain_id,
                            ...validated,
                            updated_at,
                        })
                        .onConflictDoUpdate({
                            target: marketing_appearance.domain_id,
                            set: { ...validated, updated_at },
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (rows.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(
                                "Failed to save marketing appearance"
                            )
                        )
                    }

                    const row = rows[0]
                    if (row === undefined) {
                        return yield* Effect.fail(
                            repositoryError(
                                "Failed to save marketing appearance"
                            )
                        )
                    }

                    return yield* toMarketingAppearance(row).pipe(
                        Effect.mapError((error) =>
                            repositoryError(
                                `Invalid marketing appearance row: ${error}`
                            )
                        )
                    )
                }),
        }

        return repository
    })
)
