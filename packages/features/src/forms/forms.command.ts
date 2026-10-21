import { Effect, Schema as S } from "effect"
import { Command, Navigation } from "foldkit"
import { FormDefinition, FormSlug, FormTitle } from "@urm/domain/schemas/forms"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"

import {
    CompletedFormNavigation,
    FormCreateFailed,
    FormCreated,
    FormDefinitionSaveFailed,
    FormDefinitionSaved,
    FormTemplateSaved,
    FormTemplateSaveFailed,
} from "./forms.message.ts"
import { formHref } from "./forms.route.ts"

export const CreateForm = Command.define("CreateForm", {
    args: { title: FormTitle, slug: FormSlug, template_id: S.NullOr(S.String) },
    messages: [FormCreated, FormCreateFailed],
    execute: () =>
        Effect.succeed(
            FormCreateFailed({
                error: "No forms persistence adapter installed",
            })
        ),
})

export const SaveFormTemplate = Command.define("SaveFormTemplate", {
    args: {
        name: ContentTemplateName,
        description: ContentTemplateDescription,
        tags: ContentTemplateTags,
        fields: FormDefinition,
    },
    messages: [FormTemplateSaved, FormTemplateSaveFailed],
    execute: () =>
        Effect.succeed(
            FormTemplateSaveFailed({
                error: "No form template persistence adapter installed",
            })
        ),
})

export const SaveFormDefinition = Command.define("SaveFormDefinition", {
    args: { form_id: S.String, fields: FormDefinition },
    messages: [FormDefinitionSaved, FormDefinitionSaveFailed],
    execute: () =>
        Effect.succeed(
            FormDefinitionSaveFailed({
                error: "No forms persistence adapter installed",
            })
        ),
})

export const NavigateToForm = Command.define("NavigateToForm", {
    args: { slug: FormSlug },
    messages: [CompletedFormNavigation],
    execute: ({ slug }) =>
        Navigation.pushUrl(formHref(slug)).pipe(
            Effect.as(CompletedFormNavigation())
        ),
})
