import { Option, Schema as S } from "effect"
import { Command } from "foldkit"
import { FormDefinition, FormSlug, FormTitle } from "@urm/domain/schemas/forms"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"

import * as ObjectBuilder from "../objects/builder/submodel.ts"
import {
    CreateForm,
    NavigateToForm,
    SaveFormDefinition,
    SaveFormTemplate,
} from "./forms.command.ts"
import { GotObjectBuilderMessage, type Message } from "./forms.message.ts"
import { Model, type FormSummary } from "./forms.model.ts"
import { routeForPath } from "./forms.route.ts"

export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
]

const empty_builder = (id = "new-form", name = "Untitled form") =>
    ObjectBuilder.makeModel(
        ObjectBuilder.ObjectDefinition.make({ id, name, components: [] })
    )

const slug_from_title = (title: string): string =>
    title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120)

const template_tags = (value: string): ReadonlyArray<string> =>
    value
        .split(",")
        .map((tag) => tag.trim().toLocaleLowerCase())
        .filter((tag) => tag !== "")
        .reduce<ReadonlyArray<string>>(
            (tags, tag) => (tags.includes(tag) ? tags : [...tags, tag]),
            []
        )

const merge_form = (
    forms: ReadonlyArray<FormSummary>,
    incoming: FormSummary
): ReadonlyArray<FormSummary> => [
    incoming,
    ...forms.filter((form) => form.id !== incoming.id),
]

export const activeSlug = (model: Model): Option.Option<string> =>
    model.route._tag === "Forms" ? Option.none() : Option.some(model.route.slug)

export const init = (pathname: string): UpdateReturn => [
    Model.make({
        route: routeForPath(pathname),
        forms: [],
        forms_loaded: false,
        builder: empty_builder(),
        detail_loaded: false,
        is_editing: false,
        is_creating: false,
        new_title: "",
        new_slug: "",
        creation_template_id: null,
        creation_template_name: null,
        slug_edited: false,
        create_status: "idle",
        save_status: "idle",
        dirty: false,
        feedback: "",
        template_name: "",
        template_description: "Reusable form template.",
        template_tags: "",
        template_save_status: "idle",
    }),
    [],
]

export const clear = (model: Model): Model => ({
    ...model,
    forms: [],
    forms_loaded: false,
    builder: empty_builder(),
    detail_loaded: false,
    is_editing: false,
    is_creating: false,
    create_status: "idle",
    save_status: "idle",
    dirty: false,
    feedback: "",
})

export const update = (model: Model, message: Message): UpdateReturn => {
    switch (message._tag) {
        case "ChangedPath": {
            const route = routeForPath(message.pathname)
            const same_detail =
                route._tag !== "Forms" &&
                model.route._tag !== "Forms" &&
                route.slug === model.route.slug
            return [
                {
                    ...model,
                    route,
                    builder: same_detail ? model.builder : empty_builder(),
                    detail_loaded: same_detail && model.detail_loaded,
                    is_editing: same_detail && model.is_editing,
                    save_status: "idle",
                    dirty: same_detail && model.dirty,
                    feedback: "",
                },
                [],
            ]
        }
        case "ToggledEditing":
            return model.detail_loaded
                ? [{ ...model, is_editing: message.is_editing }, []]
                : [model, []]
        case "ToggledCreating":
            return [
                {
                    ...model,
                    is_creating: !model.is_creating,
                    new_title: "",
                    new_slug: "",
                    creation_template_id: null,
                    creation_template_name: null,
                    slug_edited: false,
                    create_status: "idle",
                    feedback: "",
                },
                [],
            ]
        case "SelectedCreationTemplate":
            return [
                {
                    ...model,
                    is_creating: true,
                    creation_template_id: message.template_id,
                    creation_template_name: message.name,
                    feedback: "",
                },
                [],
            ]
        case "ChangedNewTitle":
            return [
                {
                    ...model,
                    new_title: message.value,
                    new_slug: model.slug_edited
                        ? model.new_slug
                        : slug_from_title(message.value),
                    feedback: "",
                },
                [],
            ]
        case "ChangedNewSlug":
            return [
                {
                    ...model,
                    new_slug: slug_from_title(message.value),
                    slug_edited: true,
                    feedback: "",
                },
                [],
            ]
        case "SubmittedNewForm": {
            if (model.create_status === "saving") return [model, []]
            const title = S.decodeUnknownOption(FormTitle)(
                model.new_title.trim()
            )
            const slug = S.decodeUnknownOption(FormSlug)(model.new_slug)
            if (Option.isNone(title) || Option.isNone(slug)) {
                return [
                    {
                        ...model,
                        feedback:
                            "Enter a form name and a lowercase URL slug using letters, numbers, and hyphens.",
                    },
                    [],
                ]
            }

            return [
                { ...model, create_status: "saving", feedback: "" },
                [
                    CreateForm({
                        title: title.value,
                        slug: slug.value,
                        template_id: model.creation_template_id,
                    }),
                ],
            ]
        }
        case "FormCreated":
            return [
                {
                    ...model,
                    forms: merge_form(model.forms, message.form),
                    forms_loaded: true,
                    is_creating: false,
                    new_title: "",
                    new_slug: "",
                    creation_template_id: null,
                    creation_template_name: null,
                    slug_edited: false,
                    create_status: "idle",
                    feedback: `Created ${message.form.title}.`,
                },
                [NavigateToForm({ slug: message.form.slug })],
            ]
        case "FormCreateFailed":
            return [
                {
                    ...model,
                    create_status: "idle",
                    feedback: `Could not create form: ${message.error}`,
                },
                [],
            ]
        case "FormsLoaded":
            return [{ ...model, forms: message.forms, forms_loaded: true }, []]
        case "FormsLoadFailed":
            return [
                {
                    ...model,
                    forms_loaded: true,
                    feedback: `Could not load forms: ${message.error}`,
                },
                [],
            ]
        case "FormDetailLoaded": {
            if (
                model.detail_loaded &&
                model.builder.definition.id === message.form.id
            ) {
                return [
                    {
                        ...model,
                        forms: merge_form(model.forms, message.form),
                    },
                    [],
                ]
            }
            const builder = empty_builder(message.form.id, message.form.title)
            return [
                {
                    ...model,
                    forms: merge_form(model.forms, message.form),
                    builder: {
                        ...builder,
                        definition: {
                            ...builder.definition,
                            components: message.components,
                        },
                    },
                    detail_loaded: true,
                    dirty: false,
                    save_status: "idle",
                    feedback: "",
                },
                [],
            ]
        }
        case "FormDetailMissing":
            return [
                {
                    ...model,
                    detail_loaded: true,
                    is_editing: false,
                    feedback: "Form not found.",
                },
                [],
            ]
        case "FormDetailLoadFailed":
            return [
                {
                    ...model,
                    detail_loaded: true,
                    feedback: `Could not load form: ${message.error}`,
                },
                [],
            ]
        case "SubmittedFormDefinition": {
            if (
                !model.detail_loaded ||
                !model.dirty ||
                model.save_status === "saving"
            ) {
                return [model, []]
            }

            if (!S.is(FormDefinition)(model.builder.definition.components))
                return [
                    {
                        ...model,
                        save_status: "idle",
                        feedback:
                            "Check the form fields. Each link needs a label and a valid HTTP or HTTPS URL without embedded credentials.",
                    },
                    [],
                ]
            return [
                { ...model, save_status: "saving", feedback: "" },
                [
                    SaveFormDefinition({
                        form_id: model.builder.definition.id,
                        fields: model.builder.definition.components,
                    }),
                ],
            ]
        }
        case "ChangedTemplateMetadata":
            return [
                {
                    ...model,
                    template_name:
                        message.field === "name"
                            ? message.value
                            : model.template_name,
                    template_description:
                        message.field === "description"
                            ? message.value
                            : model.template_description,
                    template_tags:
                        message.field === "tags"
                            ? message.value
                            : model.template_tags,
                    template_save_status: "idle",
                    feedback: "",
                },
                [],
            ]
        case "SubmittedFormTemplate": {
            if (model.template_save_status === "saving") return [model, []]
            if (!S.is(FormDefinition)(model.builder.definition.components))
                return [
                    {
                        ...model,
                        feedback:
                            "Check the form fields. Each link needs a label and a valid HTTP or HTTPS URL without embedded credentials.",
                    },
                    [],
                ]
            const name = S.decodeUnknownOption(ContentTemplateName)(
                model.template_name.trim()
            )
            const description = S.decodeUnknownOption(
                ContentTemplateDescription
            )(model.template_description.trim())
            const tags = S.decodeUnknownOption(ContentTemplateTags)(
                template_tags(model.template_tags)
            )
            if (
                Option.isNone(name) ||
                Option.isNone(description) ||
                Option.isNone(tags)
            ) {
                return [
                    {
                        ...model,
                        feedback:
                            "Enter a template name and use no more than 12 tags of 40 characters each.",
                    },
                    [],
                ]
            }
            return [
                { ...model, template_save_status: "saving", feedback: "" },
                [
                    SaveFormTemplate({
                        name: name.value,
                        description: description.value,
                        tags: tags.value,
                        fields: model.builder.definition.components,
                    }),
                ],
            ]
        }
        case "FormTemplateSaved":
            return [
                {
                    ...model,
                    template_name: "",
                    template_description: "Reusable form template.",
                    template_tags: "",
                    template_save_status: "idle",
                    feedback: "Template saved.",
                },
                [],
            ]
        case "FormTemplateSaveFailed":
            return [
                {
                    ...model,
                    template_save_status: "idle",
                    feedback: `Could not save template: ${message.error}`,
                },
                [],
            ]
        case "FormDefinitionSaved":
            return [
                {
                    ...model,
                    save_status: "idle",
                    dirty: false,
                    feedback: "Form saved.",
                },
                [],
            ]
        case "FormDefinitionSaveFailed":
            return [
                {
                    ...model,
                    save_status: "idle",
                    feedback: `Could not save form: ${message.error}`,
                },
                [],
            ]
        case "CompletedFormNavigation":
            return [model, []]
        case "GotObjectBuilderMessage": {
            const [builder, commands] = ObjectBuilder.update(
                model.builder,
                message.message
            )
            const dirty =
                model.dirty || builder.definition !== model.builder.definition
            return [
                { ...model, builder, dirty, feedback: "" },
                Command.mapMessages(commands, (message) =>
                    GotObjectBuilderMessage({ message })
                ),
            ]
        }
    }
}
