import { randomUUID } from "node:crypto"
import { Effect, Schema } from "effect"
import {
    CreateRemoteContact,
    RenameRemoteContact,
} from "@urm/contracts/contacts"
import { contacts_client_layer } from "./contacts-client.ts"
import { ContactsApp, ContactsData, contacts_page } from "./contacts-model.ts"
import { read_account_input } from "./account-input.ts"

const base = process.argv[2]
const domain_id = process.argv[3]
if (base === undefined || domain_id === undefined)
    throw new Error("Usage: contacts:smoke <server-url> <domain-id>")
class CommandError extends Schema.TaggedError<CommandError>()(
    "CommandError",
    { message: Schema.String }
) {}

const input = await read_account_input(false)
const login = await fetch(new URL("/auth/login", base), {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify({ email: input.email, password: input.password }),
})
const cookie = login.headers.get("set-cookie")?.split(";")[0]
if (!login.ok || cookie === undefined) throw new Error("Login failed")
try {
    const id = randomUUID()
    const program = Effect.gen(function* () {
        const created = ContactsData.mutate(
            ContactsApp.initial,
            CreateRemoteContact,
            {
                id,
                domain_id,
                name: "Contacts smoke test",
                email: `smoke-${id}@example.invalid`,
            }
        )
        const created_message = yield* created.command.effect
        if (created_message._tag === "MutationFailed")
            return yield* Effect.fail(
                new CommandError({ message: "Create failed" })
            )
        const model = ContactsData.reduce(created.model, created_message)
        const renamed = ContactsData.mutate(model, RenameRemoteContact, {
            id,
            domain_id,
            name: "Contacts smoke test passed",
        })
        const renamed_message = yield* renamed.command.effect
        if (renamed_message._tag === "MutationFailed")
            return yield* Effect.fail(
                new CommandError({ message: "Rename failed" })
            )
        const updated = ContactsData.reduce(renamed.model, renamed_message)
        const page = contacts_page(domain_id)
        const loaded = yield* ContactsData.prefetch(
            ContactsData.refresh(updated, page),
            page
        )
        const result = page.read(loaded)
        if (result._tag !== "Ready")
            return yield* Effect.fail(
                new CommandError({ message: "Contact query failed" })
            )
        console.log(`Contacts smoke test passed. Created contact ${id}.`)
    })
    await Effect.runPromise(
        program.pipe(
            Effect.provide(
                contacts_client_layer(
                    new URL(
                        `/api/rpc?domain_id=${encodeURIComponent(domain_id)}`,
                        base
                    ).toString(),
                    cookie
                )
            )
        )
    )
} finally {
    await fetch(new URL("/auth/logout", base), {
        method: "POST",
        headers: { cookie, "x-requested-with": "XMLHttpRequest" },
    })
}
