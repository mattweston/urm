import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import * as ObjectBuilder from "../objects/builder/submodel.ts"
import { FormSummary } from "./forms.model.ts"

export const ChangedPath = taggedStruct("ChangedPath", { pathname: S.String })
export const ToggledEditing = taggedStruct("ToggledEditing", {
    is_editing: S.Boolean,
})
export const ToggledCreating = taggedStruct("ToggledCreating")
export const SelectedCreationTemplate = taggedStruct(
    "SelectedCreationTemplate",
    {
        template_id: S.String,
        name: S.String,
    }
)
export const ChangedNewTitle = taggedStruct("ChangedNewTitle", {
    value: S.String,
})
export const ChangedNewSlug = taggedStruct("ChangedNewSlug", {
    value: S.String,
})
export const SubmittedNewForm = taggedStruct("SubmittedNewForm")
export const FormCreated = taggedStruct("FormCreated", { form: FormSummary })
export const FormCreateFailed = taggedStruct("FormCreateFailed", {
    error: S.String,
})
export const FormsLoaded = taggedStruct("FormsLoaded", {
    forms: S.Array(FormSummary),
})
export const FormsLoadFailed = taggedStruct("FormsLoadFailed", {
    error: S.String,
})
export const FormDetailLoaded = taggedStruct("FormDetailLoaded", {
    form: FormSummary,
    components: S.Array(ObjectBuilder.ObjectComponent),
})
export const FormDetailMissing = taggedStruct("FormDetailMissing")
export const FormDetailLoadFailed = taggedStruct("FormDetailLoadFailed", {
    error: S.String,
})
export const SubmittedFormDefinition = taggedStruct("SubmittedFormDefinition")
export const ChangedTemplateMetadata = taggedStruct("ChangedTemplateMetadata", {
    field: S.Literals(["name", "description", "tags"]),
    value: S.String,
})
export const SubmittedFormTemplate = taggedStruct("SubmittedFormTemplate")
export const FormTemplateSaved = taggedStruct("FormTemplateSaved")
export const FormTemplateSaveFailed = taggedStruct("FormTemplateSaveFailed", {
    error: S.String,
})
export const FormDefinitionSaved = taggedStruct("FormDefinitionSaved")
export const FormDefinitionSaveFailed = taggedStruct(
    "FormDefinitionSaveFailed",
    {
        error: S.String,
    }
)
export const CompletedFormNavigation = taggedStruct("CompletedFormNavigation")
export const GotObjectBuilderMessage = taggedStruct("GotObjectBuilderMessage", {
    message: ObjectBuilder.Message,
})

export const Message = S.Union([
    ChangedPath,
    ToggledEditing,
    ToggledCreating,
    SelectedCreationTemplate,
    ChangedNewTitle,
    ChangedNewSlug,
    SubmittedNewForm,
    FormCreated,
    FormCreateFailed,
    FormsLoaded,
    FormsLoadFailed,
    FormDetailLoaded,
    FormDetailMissing,
    FormDetailLoadFailed,
    SubmittedFormDefinition,
    ChangedTemplateMetadata,
    SubmittedFormTemplate,
    FormTemplateSaved,
    FormTemplateSaveFailed,
    FormDefinitionSaved,
    FormDefinitionSaveFailed,
    CompletedFormNavigation,
    GotObjectBuilderMessage,
])
export type Message = typeof Message.Type
