import { Option } from "effect"
import { describe, expect, test } from "vitest"

import * as ObjectBuilder from "../objects/builder/submodel.ts"
import { FormSummary } from "./forms.model.ts"
import {
    ChangedNewTitle,
    ChangedTemplateMetadata,
    ChangedPath,
    FormCreated,
    FormDetailLoaded,
    GotObjectBuilderMessage,
    SubmittedNewForm,
    SubmittedFormTemplate,
    SubmittedFormDefinition,
    ToggledCreating,
    ToggledEditing,
} from "./forms.message.ts"
import { init, update } from "./forms.update.ts"

const contact = FormSummary.make({
    id: "form-contact",
    slug: "contact",
    title: "Contact form",
    status: "draft",
    submission_count: 0,
    template_source: null,
    updated_at: 1,
})

const contact_email = ObjectBuilder.ObjectComponent.make({
    id: "contact-email",
    kind: "email",
    name: "email",
    label: "Email",
    description: "We will only use this to reply.",
    placeholder: "you@example.com",
    required: true,
    options: [],
})

describe("forms workspace", () => {
    test("blocks incomplete link saves and snapshots a selected destination", () => {
        const [initial] = init("/forms/contact")
        const [loaded] = update(
            initial,
            FormDetailLoaded({ form: contact, components: [] })
        )
        const [editing] = update(loaded, ToggledEditing({ is_editing: true }))
        const [added] = update(
            editing,
            GotObjectBuilderMessage({
                message: ObjectBuilder.AddedComponent({ kind: "link" }),
            })
        )
        const [invalid, invalid_commands] = update(
            added,
            SubmittedFormDefinition()
        )
        expect(invalid_commands).toEqual([])
        expect(invalid.feedback).toContain("valid HTTP")
        const [edited] = update(
            invalid,
            GotObjectBuilderMessage({
                message: ObjectBuilder.ChangedComponentHref({
                    value: "https://example.com/privacy",
                }),
            })
        )
        const [, commands] = update(edited, SubmittedFormDefinition())
        expect(commands[0]?.args).toMatchObject({
            fields: [{ kind: "link", href: "https://example.com/privacy" }],
        })
    })
    test("loads a detail before enabling editing and follows child routes", () => {
        const [model] = init("/forms/contact")
        const [before_load] = update(
            model,
            ToggledEditing({ is_editing: true })
        )
        const [loaded] = update(
            before_load,
            FormDetailLoaded({ form: contact, components: [contact_email] })
        )
        const [editing] = update(loaded, ToggledEditing({ is_editing: true }))
        const [submissions] = update(
            editing,
            ChangedPath({ pathname: "/forms/contact/submissions" })
        )

        expect(model.route._tag).toBe("Form")
        expect(before_load.is_editing).toBe(false)
        expect(editing.is_editing).toBe(true)
        expect(submissions.route._tag).toBe("FormSubmissions")
        expect(submissions.detail_loaded).toBe(true)
    })

    test("composes the reusable object builder and marks edits dirty", () => {
        const [model] = init("/forms/contact")
        const [loaded] = update(
            model,
            FormDetailLoaded({ form: contact, components: [contact_email] })
        )
        const [selected] = update(
            loaded,
            GotObjectBuilderMessage({
                message: ObjectBuilder.SelectedComponent({
                    component_id: "contact-email",
                }),
            })
        )
        const [edited, commands] = update(
            selected,
            GotObjectBuilderMessage({
                message: ObjectBuilder.ChangedComponentLabel({
                    value: "Email address",
                }),
            })
        )

        expect(selected.builder.selected_component_id).toEqual(
            Option.some("contact-email")
        )
        expect(selected.dirty).toBe(false)
        expect(edited.dirty).toBe(true)
        expect(commands).toEqual([])
    })

    test("derives a slug and emits a create command", () => {
        const [model] = init("/forms")
        const [creating] = update(model, ToggledCreating())
        const [named] = update(
            creating,
            ChangedNewTitle({ value: "Customer feedback" })
        )
        const [, commands] = update(named, SubmittedNewForm())

        expect(named.new_slug).toBe("customer-feedback")
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("CreateForm")
        expect(commands[0]?.args).toEqual({
            title: "Customer feedback",
            slug: "customer-feedback",
            template_id: null,
        })
    })

    test("adds a created form and navigates to it", () => {
        const [model] = init("/forms")
        const [updated, commands] = update(
            model,
            FormCreated({ form: contact })
        )

        expect(updated.forms).toEqual([contact])
        expect(commands[0]?.name).toBe("NavigateToForm")
    })

    test("saves the current definition as an organization template", () => {
        const [model] = init("/forms/contact")
        const [loaded] = update(
            model,
            FormDetailLoaded({ form: contact, components: [contact_email] })
        )
        const [named] = update(
            loaded,
            ChangedTemplateMetadata({ field: "name", value: "Contact" })
        )
        const [tagged] = update(
            named,
            ChangedTemplateMetadata({
                field: "tags",
                value: "Lead, contact, lead",
            })
        )
        const [, commands] = update(tagged, SubmittedFormTemplate())

        expect(commands[0]?.name).toBe("SaveFormTemplate")
        expect(commands[0]?.args).toMatchObject({
            name: "Contact",
            tags: ["lead", "contact"],
            fields: [contact_email],
        })
    })

    test("does not overwrite local edits when the reactive detail refreshes", () => {
        const [model] = init("/forms/contact")
        const [loaded] = update(
            model,
            FormDetailLoaded({ form: contact, components: [contact_email] })
        )
        const [edited] = update(
            loaded,
            GotObjectBuilderMessage({
                message: ObjectBuilder.AddedComponent({ kind: "textarea" }),
            })
        )
        const [refreshed] = update(
            edited,
            FormDetailLoaded({ form: contact, components: [contact_email] })
        )

        expect(refreshed.builder.definition.components).toHaveLength(2)
        expect(refreshed.dirty).toBe(true)
    })
})
