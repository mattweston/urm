import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import {
    LandingTemplateCatalog,
    SaveLandingTemplateInput,
} from "@urm/domain/landing-templates"

export const LandingTemplateCatalogEntity = Entity.make(
    "LandingTemplateCatalog",
    LandingTemplateCatalog
)
export const LandingTemplateCatalogQuery = Query.make(
    "LandingTemplateCatalogQuery",
    {
        Input: { domain_id: Schema.String },
        Result: LandingTemplateCatalogEntity,
    }
)
export const SaveLandingTemplate = Mutation.make("SaveLandingTemplate", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.String,
        template: SaveLandingTemplateInput,
    },
    Output: { changed_id: Schema.String, catalog: LandingTemplateCatalog },
})
export const RemoveLandingTemplate = Mutation.make("RemoveLandingTemplate", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.String,
        template_id: Schema.String,
    },
    Output: { changed_id: Schema.String, catalog: LandingTemplateCatalog },
})
export const LandingTemplatesRemote = Remote.define({
    entities: [LandingTemplateCatalogEntity],
    queries: [LandingTemplateCatalogQuery],
    mutations: [SaveLandingTemplate, RemoveLandingTemplate],
})
