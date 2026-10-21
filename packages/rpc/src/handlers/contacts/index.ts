import { ContactWriteError } from "@urm/domain/contacts"
import { Effect } from "effect"
import {
    ContactRecord,
    ContactsRemote,
    CreateRemoteContact,
    DomainContacts,
    RemoteContact,
    RenameRemoteContact,
    UpdateRemoteContact,
    DeleteRemoteContact,
    ImportRemoteContacts,
} from "@urm/contracts/contacts"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import { ContactsRepository, type ContactsPrincipal } from "./repository.ts"
export type { ContactsPrincipal } from "./repository.ts"
const source_error = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof ContactWriteError
                ? error.message
                : "Contact operation unavailable or access denied",
    })
const boundary_end: Boundary = { _tag: "Terminal" }
const patch_records = (records: ReadonlyArray<ContactRecord>) =>
    records.map((record) =>
        Entity.patch(RemoteContact.ref(record.id), { ...record })
    )
const contact_source = RemoteServer.entity<
    ContactsPrincipal,
    ContactsRepository
>(RemoteContact, {
    read: ({ ids, principal }) =>
        Effect.flatMap(ContactsRepository, (repository) =>
            repository.load_contacts(principal, ids)
        ).pipe(
            Effect.map((records) =>
                records.map((record) => ({
                    id: record.id,
                    values: { ...record },
                }))
            ),
            Effect.mapError(source_error)
        ),
})
const contacts_query = RemoteServer.query(
    DomainContacts,
    ({
        input,
        window,
        principal,
    }: {
        input: typeof DomainContacts.Input.Type
        window: {
            readonly first?: number | undefined
            readonly after?: string | undefined
            readonly last?: number | undefined
            readonly before?: string | undefined
        }
        principal: ContactsPrincipal
    }) =>
        Effect.gen(function* () {
            yield* Effect.flatMap(ContactsRepository, (repository) =>
                repository.check_scope(principal, input.domain_id)
            )
            const count = window.first ?? 25
            if (
                !Number.isInteger(count) ||
                count < 1 ||
                count > 100 ||
                window.last !== undefined ||
                window.before !== undefined
            )
                return yield* Effect.fail(source_error())
            const records = yield* Effect.flatMap(
                ContactsRepository,
                (repository) =>
                    repository.list_contacts(
                        principal,
                        input.domain_id,
                        input.search,
                        window.after,
                        count
                    )
            )
            const page = records.slice(0, count)
            const last = page.at(-1)
            const end: Boundary =
                records.length > count && last !== undefined
                    ? { _tag: "Cursor", cursor: last.id }
                    : boundary_end
            const start: Boundary =
                window.after === undefined
                    ? boundary_end
                    : { _tag: "Cursor", cursor: window.after }
            return {
                edges: page.map(({ id }) => ({
                    entity: RemoteContact.name,
                    id,
                    key: entityKey(RemoteContact.name, id),
                })),
                start,
                end,
            }
        }).pipe(Effect.mapError(source_error))
)

const create = RemoteServer.mutation(
    CreateRemoteContact,
    ({
        input,
        principal,
    }: {
        input: typeof CreateRemoteContact.Input.Type
        principal: ContactsPrincipal
    }) =>
        Effect.flatMap(ContactsRepository, (repository) =>
            repository.create_contact(principal, input)
        ).pipe(
            Effect.map((records) => ({
                output: { id: input.id },
                entities: patch_records(records),
            })),
            Effect.mapError(source_error)
        )
)
const update = RemoteServer.mutation(
    UpdateRemoteContact,
    ({
        input,
        principal,
    }: {
        input: typeof UpdateRemoteContact.Input.Type
        principal: ContactsPrincipal
    }) =>
        Effect.flatMap(ContactsRepository, (repository) =>
            repository.check_scope(principal, input.domain_id, true)
        ).pipe(
            Effect.andThen(
                Effect.flatMap(ContactsRepository, (repository) =>
                    repository.update_contact(principal, input.id, input)
                )
            ),
            Effect.map((records) => ({
                output: { id: input.id },
                entities: patch_records(records),
            })),
            Effect.mapError(source_error)
        )
)
const rename = RemoteServer.mutation(
    RenameRemoteContact,
    ({
        input,
        principal,
    }: {
        input: typeof RenameRemoteContact.Input.Type
        principal: ContactsPrincipal
    }) =>
        Effect.flatMap(ContactsRepository, (repository) =>
            repository.check_scope(principal, input.domain_id, true)
        ).pipe(
            Effect.andThen(
                Effect.flatMap(ContactsRepository, (repository) =>
                    repository.rename_contact(principal, input.id, input.name)
                )
            ),
            Effect.map((records) => ({
                output: { id: input.id },
                entities: patch_records(records),
            })),
            Effect.mapError(source_error)
        )
)
const remove = RemoteServer.mutation(
    DeleteRemoteContact,
    ({
        input,
        principal,
    }: {
        input: typeof DeleteRemoteContact.Input.Type
        principal: ContactsPrincipal
    }) =>
        Effect.flatMap(ContactsRepository, (repository) =>
            repository.check_scope(principal, input.domain_id, true)
        ).pipe(
            Effect.andThen(
                Effect.flatMap(ContactsRepository, (repository) =>
                    repository.delete_contact(principal, input.id)
                )
            ),
            Effect.as({ output: { id: input.id } }),
            Effect.mapError(source_error)
        )
)
const import_rows = RemoteServer.mutation(
    ImportRemoteContacts,
    ({
        input,
        principal,
    }: {
        input: typeof ImportRemoteContacts.Input.Type
        principal: ContactsPrincipal
    }) =>
        Effect.flatMap(ContactsRepository, (repository) =>
            repository.import_contacts(principal, input)
        ).pipe(
            Effect.map((output) => ({ output })),
            Effect.mapError(source_error)
        )
)
export const ContactsServer = RemoteServer.make({
    entities: [contact_source],
    queries: [contacts_query],
    mutations: [create, update, rename, remove, import_rows],
})
RemoteServer.validate(ContactsRemote, ContactsServer)
export const contacts_remote_handlers = (principal: ContactsPrincipal) =>
    RemoteServer.handlers(ContactsServer, principal, {
        maxIdsPerEntity: 100,
        maxDepth: 1,
    })

export { ContactsRepository, ContactsRepositoryLive } from "./repository.ts"
