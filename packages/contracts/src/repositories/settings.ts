import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    CreatePreferenceInput,
    MarketingAppearance,
    Preference,
    UpdateMarketingAppearanceInput,
    UpdatePreferenceInput,
} from "@urm/domain/schemas/settings"

export interface PreferencesRepositoryType {
    insert(
        data: Schema.Schema.Type<typeof CreatePreferenceInput>
    ): Effect.Effect<ItemResult<Preference>, DatabaseError, never>
    update(
        id: string,
        data: Partial<Schema.Schema.Type<typeof UpdatePreferenceInput>>
    ): Effect.Effect<ItemResult<Preference>, DatabaseError, never>
    findById(id: string): Effect.Effect<Preference | null, DatabaseError, never>
    findByContactId(
        contact_id: string
    ): Effect.Effect<Preference | null, DatabaseError, never>
}

export class PreferencesRepository extends Context.Service<
    PreferencesRepository,
    PreferencesRepositoryType
>()("PreferencesRepository") {}

export interface MarketingAppearanceRepositoryType {
    get(
        domain_id: string
    ): Effect.Effect<MarketingAppearance | null, DatabaseError, never>
    save(
        domain_id: string,
        data: Schema.Schema.Type<typeof UpdateMarketingAppearanceInput>
    ): Effect.Effect<MarketingAppearance, DatabaseError, never>
}

export class MarketingAppearanceRepository extends Context.Service<
    MarketingAppearanceRepository,
    MarketingAppearanceRepositoryType
>()("MarketingAppearanceRepository") {}
