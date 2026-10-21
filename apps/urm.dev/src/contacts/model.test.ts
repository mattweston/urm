import { describe, expect, test } from "vitest"
import { Scene } from "foldkit"
import { Remote } from "foldkit-remote"
import { Model, Message, initial, update } from "./model.ts"
import { view, media_session_view } from "./view.ts"
import { is_contacts_path } from "./path.ts"
import {
    ClickedCreateContact,
    ContactsSearchChanged,
    SelectedContactChanged,
} from "@urm/features/mail/contacts"

const session = {
    account_id: "account",
    domains: [
        {
            id: "first",
            slug: "test1",
            name: "First",
            organization_name: "Org",
            can_write: true,
        },
        {
            id: "second",
            slug: "test2",
            name: "Second",
            organization_name: "Org",
            can_write: false,
        },
    ],
}
const signed_in: Model = {
    ...initial,
    busy: false,
    session,
    domain_id: "first",
}

describe("PostgreSQL Contacts", () => {
    test("search resets paging and rejects responses from previous searches", () => {
        const searched = update(
            {
                ...signed_in,
                after: "last",
                history: [null],
                selected_id: "old",
            },
            Message.ContactInteraction({
                message: ContactsSearchChanged({ value: "Ada" }),
            })
        )
        expect(searched.model.after).toBeNull()
        expect(searched.model.history).toEqual([])
        expect(searched.model.selected_id).toBe("")
        expect(searched.model.remote).toEqual(Remote.initial)
        expect(searched.commands).toHaveLength(1)
        const newer = update(
            searched.model,
            Message.ContactInteraction({
                message: ContactsSearchChanged({ value: "Grace" }),
            })
        )
        expect(newer.commands).toHaveLength(1)
        expect(
            update(
                newer.model,
                Message.PageLoaded({
                    epoch: searched.model.epoch,
                    remote: Remote.initial,
                    session,
                    saved: false,
                })
            ).model
        ).toBe(newer.model)
        expect(
            update(
                newer.model,
                Message.RequestFailed({
                    epoch: searched.model.epoch,
                    message: "Old failure",
                    unauthenticated: true,
                })
            ).model
        ).toBe(newer.model)
        const equivalent = update(
            newer.model,
            Message.ContactInteraction({
                message: ContactsSearchChanged({ value: " Grace " }),
            })
        )
        expect(equivalent.commands).toBeUndefined()
        expect(equivalent.model.epoch).toBe(newer.model.epoch)
    })
    test("switches known domains immediately and looks up unknown domains", () => {
        const opened = update(
            signed_in,
            Message.OpenedDomain({ slug: "test2", session_only: true })
        )
        expect(opened.model.remote).toEqual(Remote.initial)
        expect(opened.model.domain_id).toBe("second")
        expect(opened.model.session).toBe(session)
        expect(opened.model.busy).toBe(false)
        expect(opened.commands).toBeUndefined()
        const missing = update(
            signed_in,
            Message.OpenedDomain({ slug: "missing", session_only: true })
        )
        expect(missing.model.session).toBeNull()
        expect(missing.commands?.[0]?.name).toBe("ContactsLoadSession")
        const unavailable = update(
            missing.model,
            Message.SessionLoaded({ epoch: missing.model.epoch, session })
        )
        expect(unavailable.model.domain_id).toBe("")
        expect(unavailable.commands).toBeUndefined()
        const login_required = update(
            missing.model,
            Message.RequestFailed({
                epoch: missing.model.epoch,
                message: "Sign in",
                unauthenticated: true,
            })
        )
        expect(login_required.model.requested_slug).toBe("missing")
    })
    test("uses the original Contacts view and opens the supported create form", () => {
        Scene.scene(
            { update, view },
            Scene.given(signed_in),
            Scene.expect(
                Scene.role("heading", { name: "All Contacts" })
            ).toExist(),
            Scene.expect(Scene.label("Search contacts")).toExist(),
            Scene.expect(Scene.role("link", { name: "Upload CSV" })).toExist(),
            Scene.click(Scene.role("button", { name: "Add Contact" })),
            Scene.expect(
                Scene.role("form", { name: "Create Contact" })
            ).toExist(),
            Scene.expect(Scene.label("Name")).toExist(),
            Scene.click(Scene.role("button", { name: "Cancel" })),
            Scene.expect(
                Scene.role("form", { name: "Create Contact" })
            ).toBeAbsent()
        )
    })
    test("loads search results and clears search and selection on domain change", () => {
        const searched = update(
            signed_in,
            Message.ContactInteraction({
                message: ContactsSearchChanged({ value: "Ada" }),
            })
        )
        expect(searched.commands).toHaveLength(1)
        expect(searched.model.remote).toBe(signed_in.remote)
        const selected = update(
            searched.model,
            Message.ContactInteraction({
                message: SelectedContactChanged({ contactId: "contact" }),
            })
        )
        const switched = update(
            selected.model,
            Message.ChoseDomain({ id: "second" })
        )
        expect(switched.model.search).toBe("")
        expect(switched.model.selected_id).toBe("")
        expect(
            update(
                switched.model,
                Message.ContactInteraction({ message: ClickedCreateContact() })
            ).model.creating
        ).toBe(false)
    })
    test("uses the existing route without matching neighbouring Mail routes", () => {
        expect(is_contacts_path("/mail/contacts")).toBe(true)
        expect(is_contacts_path("/mail/contacts/?domain_id=first")).toBe(true)
        expect(
            is_contacts_path(
                "http://urm.test:1420/mail/contacts?domain_id=first"
            )
        ).toBe(true)
        expect(is_contacts_path("/mail/subscriptions")).toBe(false)
        expect(is_contacts_path("/mail/contacts-other")).toBe(false)
    })
    test("clears domain data and drafts and ignores an old response after a switch", () => {
        const switched = update(
            {
                ...signed_in,
                draft: {
                    ...signed_in.draft,
                    name: "Unsaved",
                    email_addresses: [
                        { email: "private@example.com", is_primary: true },
                    ],
                },
            },
            Message.ChoseDomain({ id: "second" })
        )
        expect(switched.model.draft.name).toBe("")
        expect(switched.model.draft.email_addresses[0]?.email).toBe("")
        expect(switched.model.remote).toEqual(Remote.initial)
        const late = update(
            switched.model,
            Message.PageLoaded({
                epoch: signed_in.epoch,
                remote: signed_in.remote,
                session,
                saved: true,
            })
        )
        expect(late.model).toBe(switched.model)
    })
    test("rejects unknown domains and write messages in read-only domains", () => {
        expect(
            update(signed_in, Message.ChoseDomain({ id: "foreign" })).model
        ).toBe(signed_in)
        const readonly = {
            ...signed_in,
            domain_id: "second",
            draft: {
                ...signed_in.draft,
                name: "Ada",
                email_addresses: [
                    { email: "ada@example.com", is_primary: true },
                ],
            },
        }
        expect(
            update(readonly, Message.SubmittedCreate()).commands
        ).toBeUndefined()
    })
    test("sign-out clears the cache immediately and ignores pending reads", () => {
        const signed_out = update(signed_in, Message.SignedOut())
        expect(signed_out.model.session).toBeNull()
        expect(signed_out.model.remote).toEqual(Remote.initial)
        expect(
            update(
                signed_out.model,
                Message.SessionLoaded({ epoch: signed_in.epoch, session })
            ).model
        ).toBe(signed_out.model)
    })
    test("restored models reverify their account before accepting interaction", () => {
        const restored = {
            ...signed_in,
            connection_id: "previous-browser-boot",
        }
        expect(
            update(restored, Message.SubmittedCreate()).commands
        ).toBeUndefined()
        const booted = update(restored, Message.Boot())
        expect(booted.model.session).toBeNull()
        expect(booted.commands).toHaveLength(1)
    })
    test("renders labelled sign-in inputs without putting a password in Messages", () => {
        const attempted = update(
            { ...initial, busy: false },
            Message.SubmittedLogin()
        )
        const command = attempted.commands?.[0]
        if (command === undefined) throw new Error("Login command missing")
        expect(attempted.model.busy).toBe(true)
        expect(JSON.stringify(attempted.model)).not.toContain("password")
        Scene.scene(
            { update, view },
            Scene.given({ ...initial, busy: false }),
            Scene.expect(Scene.label("Email")).toExist(),
            Scene.expect(Scene.label("Password")).toExist(),
            Scene.submit(Scene.role("form", { name: "Sign in" })),
            Scene.tap(({ commands }) => {
                expect(commands).toHaveLength(1)
                expect(JSON.stringify(commands[0]?.args)).not.toContain(
                    "password"
                )
            }),
            Scene.Command.resolve(
                command,
                Message.RequestFailed({
                    epoch: 1,
                    message: "Sign-in failed",
                    unauthenticated: true,
                })
            )
        )
    })
    test("read-only users see contacts navigation without write controls", () => {
        Scene.scene(
            { update, view },
            Scene.given({ ...signed_in, domain_id: "second" }),
            Scene.expect(Scene.role("combobox")).toBeAbsent(),
            Scene.expect(
                Scene.role("button", { name: "Add Contact" })
            ).toBeDisabled(),
            Scene.expect(
                Scene.text("You have read-only access to this domain.")
            ).toExist()
        )
    })
})

test("Media session fallback never renders Contacts and retries domain lookup", () => {
    const model = {
        ...signed_in,
        session_only: true,
        domain_id: "",
        busy: false,
    }
    const command = update(model, Message.Refreshed()).commands?.[0]
    if (command === undefined) throw new Error("Session retry missing")
    Scene.scene(
        { update, view: media_session_view },
        Scene.given(model),
        Scene.expect(Scene.role("heading", { name: "Media" })).toExist(),
        Scene.expect(
            Scene.role("button", { name: "Add Contact" })
        ).toBeAbsent(),
        Scene.click(Scene.role("button", { name: "Retry" })),
        Scene.tap(({ commands }) => {
            expect(commands.map((command) => command.name)).toEqual([
                "ContactsLoadSession",
            ])
        }),
        Scene.Command.resolve(
            command,
            Message.RequestFailed({
                epoch: model.epoch + 1,
                message: "Unavailable",
                unauthenticated: false,
            })
        )
    )
})
