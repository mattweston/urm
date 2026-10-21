import { Option, Schema as S } from "effect"
import { describe, expect, test } from "vitest"

import { DomainId } from "../domains/domain-record.ts"
import { StoredForm, StoredFormField } from "@urm/domain/forms"

import * as DesktopForms from "./submodel.ts"

const domain_id = S.decodeUnknownSync(DomainId)(
    "j1700000000000000000000000000001"
)
const form = S.decodeUnknownSync(StoredForm)({
    id: "4b9709f1-1c48-4d83-90b3-948f997348c0",
    domain_id,
    title: "Customer feedback",
    slug: "customer-feedback",
    status: "draft",
    submission_count: 0,
    template_source: null,
    updated_at: 2,
})
const field = S.decodeUnknownSync(StoredFormField)({
    id: "e451c750-8b9f-4a6a-b7b1-c309fe9e5261",
    domain_id,
    form_id: form.id,
    component_id: "feedback-email",
    kind: "email",
    href: null,
    name: "email",
    label: "Email",
    description: "We will only use this to reply.",
    placeholder: "you@example.com",
    required: true,
    options: [],
    order_position: 0,
    updated_at: 2,
})

const message = S.decodeUnknownSync(DesktopForms.Message)

describe("desktop forms adapter", () => {
    test("maps canonical Form item routes to checked form ids", () => {
        const non_j_form_id = "rs71sy8gfdeqk6agc8kjrpsz8h8ecf17"
        expect(
            DesktopForms.content_form_id_for_path(`/content/form/${form.id}`)
        ).toEqual(Option.some(form.id))
        expect(
            DesktopForms.content_form_id_for_path(
                `/content/form/${non_j_form_id}`
            )
        ).toEqual(Option.some(non_j_form_id))
        expect(
            Option.isNone(
                DesktopForms.content_form_id_for_path(
                    "/content/form/not-a-form-id"
                )
            )
        ).toBe(true)
        expect(DesktopForms.is_content_form_path("/content/form/new")).toBe(
            true
        )
    })

    test("opens the existing creation surface for the canonical new route", () => {
        const [initial] = DesktopForms.init("/forms")
        const [creating] = DesktopForms.changed_content_url(
            initial,
            "/content/form/new",
            "",
            Option.some(domain_id)
        )

        expect(creating.is_creating).toBe(true)
    })

    test("resolves canonical ids into the existing builder and edit toggle", () => {
        const [initial] = DesktopForms.init("/forms")
        const [listed] = DesktopForms.update(
            initial,
            DesktopForms.loaded_forms([form]),
            Option.some(domain_id)
        )
        const [routed] = DesktopForms.changed_content_url(
            listed,
            `/content/form/${form.id}`,
            "?mode=edit",
            Option.some(domain_id)
        )
        const [loaded] = DesktopForms.update(
            routed,
            DesktopForms.loaded_detail({ form, fields: [field] }),
            Option.some(domain_id)
        )
        const [editing] = DesktopForms.changed_content_url(
            loaded,
            `/content/form/${form.id}`,
            "?mode=edit",
            Option.some(domain_id)
        )

        expect(DesktopForms.activeSlug(routed)).toEqual(Option.some(form.slug))
        expect(routed.is_editing).toBe(false)
        expect(editing.is_editing).toBe(true)
        expect(editing.builder.definition.components).toHaveLength(1)
    })

    test("translates form creation to the active domain", () => {
        const [initial] = DesktopForms.init("/forms")
        const [creating] = DesktopForms.update(
            initial,
            message({ _tag: "ToggledCreating" }),
            Option.some(domain_id)
        )
        const [named] = DesktopForms.update(
            creating,
            message({ _tag: "ChangedNewTitle", value: "Customer feedback" }),
            Option.some(domain_id)
        )
        const [, commands] = DesktopForms.update(
            named,
            message({ _tag: "SubmittedNewForm" }),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("CreateForm")
        expect(commands[0]?.args).toEqual({
            domain_id,
            title: "Customer feedback",
            slug: "customer-feedback",
            template_id: null,
        })
    })

    test("maps stored forms and ordered field definitions", () => {
        const [initial] = DesktopForms.init("/forms/customer-feedback")
        const [listed] = DesktopForms.update(
            initial,
            DesktopForms.loaded_forms([form]),
            Option.some(domain_id)
        )
        const [loaded] = DesktopForms.update(
            listed,
            DesktopForms.loaded_detail({ form, fields: [field] }),
            Option.some(domain_id)
        )

        expect(loaded.forms[0]).toMatchObject({
            id: form.id,
            slug: "customer-feedback",
        })
        expect(loaded.builder.definition.components).toEqual([
            {
                id: "feedback-email",
                kind: "email",
                name: "email",
                label: "Email",
                description: "We will only use this to reply.",
                placeholder: "you@example.com",
                required: true,
                options: [],
            },
        ])
        expect(loaded.detail_loaded).toBe(true)
    })

    test("does not issue writes without an active domain", () => {
        const [initial] = DesktopForms.init("/forms")
        const [creating] = DesktopForms.update(
            initial,
            message({ _tag: "ToggledCreating" }),
            Option.none()
        )
        const [named] = DesktopForms.update(
            creating,
            message({ _tag: "ChangedNewTitle", value: "Customer feedback" }),
            Option.none()
        )
        const [, commands] = DesktopForms.update(
            named,
            message({ _tag: "SubmittedNewForm" }),
            Option.none()
        )

        expect(commands).toEqual([])
    })

    test("translates an edited definition into a persisted save", () => {
        const [initial] = DesktopForms.init("/forms/customer-feedback")
        const [loaded] = DesktopForms.update(
            initial,
            DesktopForms.loaded_detail({ form, fields: [field] }),
            Option.some(domain_id)
        )
        const [editing] = DesktopForms.update(
            loaded,
            message({ _tag: "ToggledEditing", is_editing: true }),
            Option.some(domain_id)
        )
        const [changed] = DesktopForms.update(
            editing,
            message({
                _tag: "GotObjectBuilderMessage",
                message: { _tag: "AddedComponent", kind: "textarea" },
            }),
            Option.some(domain_id)
        )
        const [, commands] = DesktopForms.update(
            changed,
            message({ _tag: "SubmittedFormDefinition" }),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SaveFormDefinition")
        expect(commands[0]?.args).toMatchObject({
            domain_id,
            form_id: form.id,
        })
        expect(commands[0]?.args?.fields).toHaveLength(2)
    })
})
