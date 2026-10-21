import * as Array from "effect/Array"
import { Effect, Option, Schema as S } from "effect"
import { Command, Navigation } from "foldkit"

import { FormDefinition, FormSlug, FormTitle } from "@urm/domain/schemas/forms"
import { StoredForm, StoredFormField } from "@urm/domain/forms"
import { ContactsApi } from "../contacts/api.ts"
import { change_forms, load_catalog } from "./api.ts"
import {
    content_item_id_for_path,
    is_content_creation_path,
    is_content_edit_requested,
} from "@urm/features/content"
import * as Forms from "@urm/features/forms/submodel"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"

export const Model = Forms.Model
export type Model = Forms.ModelType
export const Message = Forms.Message
export type Message = Forms.MessageType
export type ViewInputs = Forms.ViewInputs

type Commands = ReadonlyArray<Command.Command<Message, never, ContactsApi>>
export type UpdateReturn = readonly [Model, Commands]

const CreateFormArgs = S.Struct({
    title: FormTitle,
    slug: FormSlug,
    template_id: S.NullOr(S.String),
})
const SaveFormDefinitionArgs = S.Struct({
    form_id: S.String,
    fields: FormDefinition,
})
const SaveFormTemplateArgs = S.Struct({
    name: ContentTemplateName,
    description: ContentTemplateDescription,
    tags: ContentTemplateTags,
    fields: FormDefinition,
})
const NavigateToFormArgs = S.Struct({ slug: FormSlug })

const to_feature_form = (form: StoredForm): Forms.FormSummaryType => ({
    id: form.id,
    slug: form.slug,
    title: form.title,
    status: form.status,
    submission_count: form.submission_count,
    template_source: form.template_source ?? null,
    updated_at: form.updated_at,
})

const to_feature_field = (
    field: StoredFormField
): (typeof FormDefinition.Type)[number] => ({
    id: field.component_id,
    ...(field.kind === "link"
        ? { kind: field.kind, href: field.href ?? "" }
        : { kind: field.kind }),
    name: field.name,
    label: field.label,
    description: field.description,
    placeholder: field.placeholder,
    required: field.required,
    options: field.options,
})

const CreateForm = Command.define("CreateForm", {
    args: {
        domain_id: S.String,
        title: FormTitle,
        slug: FormSlug,
        template_id: S.NullOr(S.String),
    },
    messages: [Forms.FormCreated, Forms.FormCreateFailed],
    execute: ({ domain_id, title, slug, template_id }) =>
        change_forms(domain_id, {
            _tag: "CreateForm",
            title,
            slug,
            template_id,
        }).pipe(
            Effect.flatMap(() => load_catalog(domain_id)),
            Effect.map((catalog) => {
                const created = catalog.forms.find((form) => form.slug === slug)
                return created
                    ? Forms.FormCreated({ form: to_feature_form(created) })
                    : Forms.FormCreateFailed({
                          error: "Created form could not be loaded",
                      })
            }),
            Effect.catch((error) =>
                Effect.succeed(Forms.FormCreateFailed({ error: String(error) }))
            )
        ),
})
const SaveFormDefinition = Command.define("SaveFormDefinition", {
    args: { domain_id: S.String, form_id: S.String, fields: FormDefinition },
    messages: [Forms.FormDefinitionSaved, Forms.FormDefinitionSaveFailed],
    execute: ({ domain_id, form_id, fields }) =>
        change_forms(domain_id, {
            _tag: "SaveDefinition",
            form_id,
            fields,
        }).pipe(
            Effect.as(Forms.FormDefinitionSaved()),
            Effect.catch((error) =>
                Effect.succeed(
                    Forms.FormDefinitionSaveFailed({ error: String(error) })
                )
            )
        ),
})
const SaveFormTemplate = Command.define("SaveFormTemplate", {
    args: {
        domain_id: S.String,
        name: ContentTemplateName,
        description: ContentTemplateDescription,
        tags: ContentTemplateTags,
        fields: FormDefinition,
    },
    messages: [Forms.FormTemplateSaved, Forms.FormTemplateSaveFailed],
    execute: ({ domain_id, name, description, tags, fields }) =>
        change_forms(domain_id, {
            _tag: "SaveTemplate",
            template_id: null,
            expected_revision: 0,
            name,
            description,
            tags,
            fields,
        }).pipe(
            Effect.as(Forms.FormTemplateSaved()),
            Effect.catch((error) =>
                Effect.succeed(
                    Forms.FormTemplateSaveFailed({ error: String(error) })
                )
            )
        ),
})

const NavigateToForm = Command.define("NavigateToForm", {
    args: { slug: FormSlug },
    messages: [Forms.CompletedFormNavigation],
    execute: ({ slug }) =>
        Navigation.pushUrl(Forms.formHref(slug)).pipe(
            Effect.as(Forms.CompletedFormNavigation())
        ),
})

const translate_command = (
    active_domain_id: Option.Option<string>,
    command: Command.Command<Message>
): Commands => {
    if (command.name === "NavigateToForm") {
        return Option.match(
            S.decodeUnknownOption(NavigateToFormArgs)(command.args),
            {
                onNone: () => [],
                onSome: (args) => [NavigateToForm(args)],
            }
        )
    }

    if (command.name === "CreateForm") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(CreateFormArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({ title, slug, template_id }) => [
                            CreateForm({ domain_id, title, slug, template_id }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "SaveFormDefinition") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(SaveFormDefinitionArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({ form_id, fields }) => [
                            SaveFormDefinition({ domain_id, form_id, fields }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "SaveFormTemplate") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(SaveFormTemplateArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({ name, description, tags, fields }) => [
                            SaveFormTemplate({
                                domain_id,
                                name,
                                description,
                                tags,
                                fields,
                            }),
                        ],
                    }
                ),
        })
    }

    return [command]
}

export const init = Forms.init
export const activeSlug = Forms.activeSlug
export const clear = Forms.clear
export const view = Forms.view
export const subscriptions = Forms.subscriptions

export const content_form_id_for_path = (
    pathname: string
): Option.Option<string> => {
    const content_id = content_item_id_for_path(pathname, "form")
    return content_id === null ||
        !/^(?:[a-z0-9]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(
            content_id
        )
        ? Option.none()
        : Option.some(content_id)
}

export const is_content_form_path = (pathname: string): boolean =>
    is_content_creation_path(pathname, "form") ||
    Option.isSome(content_form_id_for_path(pathname))

export const changed_content_url = (
    model: Model,
    pathname: string,
    search: string,
    active_domain_id: Option.Option<string>
): UpdateReturn => {
    if (is_content_creation_path(pathname, "form")) {
        return model.is_creating
            ? [model, []]
            : update(model, Forms.ToggledCreating(), active_domain_id)
    }

    const form_id = content_form_id_for_path(pathname)
    if (Option.isNone(form_id)) return [model, []]

    const form = model.forms.find((candidate) => candidate.id === form_id.value)
    const requested_slug =
        form === undefined
            ? model.forms_loaded
                ? "__content-item-not-found__"
                : null
            : form.slug
    const requested_path =
        requested_slug === null ? null : `/forms/${requested_slug}`
    const route_result: UpdateReturn =
        requested_path === null ||
        Option.contains(Forms.activeSlug(model), requested_slug)
            ? [model, []]
            : update(
                  model,
                  Forms.ChangedPath({ pathname: requested_path }),
                  active_domain_id
              )
    const [routed_model, route_commands] = route_result
    const requested_edit =
        is_content_edit_requested(search) &&
        routed_model.detail_loaded &&
        !routed_model.is_editing
    if (!requested_edit) return route_result

    const [editing_model, editing_commands] = update(
        routed_model,
        Forms.ToggledEditing({ is_editing: true }),
        active_domain_id
    )
    return [editing_model, [...route_commands, ...editing_commands]]
}

export const update = (
    model: Model,
    message: Message,
    active_domain_id: Option.Option<string>
): UpdateReturn => {
    const [next_model, commands] = Forms.update(model, message)

    return [
        next_model,
        Array.flatMap(commands, (command) =>
            translate_command(active_domain_id, command)
        ),
    ]
}

export const loaded_forms = (forms: ReadonlyArray<StoredForm>): Message =>
    Forms.FormsLoaded({ forms: Array.map(forms, to_feature_form) })

export const failed_forms = (error: unknown): Message =>
    Forms.FormsLoadFailed({ error: globalThis.String(error) })

export const loaded_detail = (
    snapshot: Readonly<{
        form: StoredForm
        fields: ReadonlyArray<StoredFormField>
    }> | null
): Message =>
    snapshot === null
        ? Forms.FormDetailMissing()
        : Forms.FormDetailLoaded({
              form: to_feature_form(snapshot.form),
              components: Array.map(snapshot.fields, to_feature_field),
          })

export const failed_detail = (error: unknown): Message =>
    Forms.FormDetailLoadFailed({ error: globalThis.String(error) })

export {
    ChangedPath,
    SelectedCreationTemplate,
} from "@urm/features/forms/submodel"
