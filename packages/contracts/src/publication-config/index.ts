import {
    PublicationConfigurationRecord,
    PublicationConfigurationAction,
} from "@urm/domain/publication-config"
import { PagesScope } from "@urm/domain/pages"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"
export const ConfigurationLibrary = Entity.make(
    "ConfigurationLibrary",
    PublicationConfigurationRecord
)
export const ConfigurationSummary = ConfigurationLibrary.select({
    id: true,
    layout: true,
    navigation: true,
    blog_included: true,
    events_included: true,
})
export const PublicationConfiguration = Query.make("PublicationConfiguration", {
    Input: PagesScope,
    Result: ConfigurationLibrary,
})
export const ChangePublicationConfiguration = Mutation.make(
    "ChangePublicationConfiguration",
    {
        Input: {
            account_id: Schema.optional(Schema.String),
            ...PagesScope,
            action: PublicationConfigurationAction,
        },
        Output: { id: Schema.String },
    }
)
export const ConfigurationRemote = Remote.define({
    entities: [ConfigurationLibrary],
    queries: [PublicationConfiguration],
    mutations: [ChangePublicationConfiguration],
})
