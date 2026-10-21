import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { Schema } from "effect"
import { AppFont, SpotifyPlaylistId, Theme } from "@urm/domain/schemas/settings"
import { ModuleId, SidebarPreference } from "@urm/domain/schemas/modules"

export const AccountPreferences = Schema.Struct({
    id: Schema.String,
    appearance: Schema.Struct({
        theme: Theme,
        font: AppFont,
        code_font: AppFont,
        is_saved: Schema.Boolean,
    }),
    spotify: Schema.Struct({
        playlist_id: SpotifyPlaylistId,
        is_saved: Schema.Boolean,
    }),
})
export const AccountPreferencesEntity = Entity.make(
    "AccountPreferences",
    AccountPreferences
)
export const AccountNavigation = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    ...SidebarPreference.fields,
    enabled_modules: Schema.Array(ModuleId),
    can_manage_modules: Schema.Boolean,
})
export const AccountNavigationEntity = Entity.make(
    "AccountNavigation",
    AccountNavigation
)
export const AccountPreferencesQuery = Query.make("AccountPreferencesQuery", {
    Input: { domain_id: Schema.String },
    Result: AccountPreferencesEntity,
})
export const AccountNavigationQuery = Query.make("AccountNavigationQuery", {
    Input: { domain_id: Schema.String },
    Result: AccountNavigationEntity,
})
export const SaveAccountAppearance = Mutation.make("SaveAccountAppearance", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.String,
        theme: Theme,
        font: AppFont,
        code_font: AppFont,
    },
    Output: { theme: Theme, font: AppFont, code_font: AppFont },
})
export const SaveAccountSpotify = Mutation.make("SaveAccountSpotify", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.String,
        playlist_id: SpotifyPlaylistId,
    },
    Output: { playlist_id: SpotifyPlaylistId },
})
export const SaveAccountSidebar = Mutation.make("SaveAccountSidebar", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.String,
        ...SidebarPreference.fields,
    },
    Output: AccountNavigation,
})
export const SaveAccountModules = Mutation.make("SaveAccountModules", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.String,
        enabled_modules: Schema.Array(ModuleId),
    },
    Output: AccountNavigation,
})
export const AccountPreferencesRemote = Remote.define({
    entities: [AccountPreferencesEntity, AccountNavigationEntity],
    queries: [AccountPreferencesQuery, AccountNavigationQuery],
    mutations: [
        SaveAccountAppearance,
        SaveAccountSpotify,
        SaveAccountSidebar,
        SaveAccountModules,
    ],
})
