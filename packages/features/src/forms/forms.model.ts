import { Schema as S } from "effect"
import { ContentTemplateSource } from "@urm/domain/schemas/content-templates"

import * as ObjectBuilder from "../objects/builder/submodel.ts"
import { Route } from "./forms.route.ts"

export const FormSummary = S.Struct({
    id: S.String,
    slug: S.String,
    title: S.String,
    status: S.Literals(["draft", "published"]),
    submission_count: S.Number,
    template_source: S.NullOr(ContentTemplateSource),
    updated_at: S.Number,
})
export type FormSummary = typeof FormSummary.Type

export const Model = S.Struct({
    route: Route,
    forms: S.Array(FormSummary),
    forms_loaded: S.Boolean,
    builder: ObjectBuilder.Model,
    detail_loaded: S.Boolean,
    is_editing: S.Boolean,
    is_creating: S.Boolean,
    new_title: S.String,
    new_slug: S.String,
    creation_template_id: S.NullOr(S.String),
    creation_template_name: S.NullOr(S.String),
    slug_edited: S.Boolean,
    create_status: S.Literals(["idle", "saving"]),
    save_status: S.Literals(["idle", "saving"]),
    dirty: S.Boolean,
    feedback: S.String,
    template_name: S.String,
    template_description: S.String,
    template_tags: S.String,
    template_save_status: S.Literals(["idle", "saving"]),
})
export type Model = typeof Model.Type
