/**
 * Domain-scoped contact RPC handlers.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { ContactsRpcs } from "@urm/contracts/contacts-old"
import { ContactsRepository } from "@urm/contracts/repositories/contacts"
import { DomainsRepository } from "@urm/contracts/repositories/domains"
import { ContactsRpcHandlersTag } from "./tag.js"
import {
    CreateContactInput,
    DatabaseError,
    NotFoundError,
    UpdateDomainContactProfileInput,
} from "@urm/domain/schemas/contacts"
import { AuthorizationError, ConflictError } from "@urm/domain/errors"
import { AuthenticatedRequestContext } from "../middleware/index.js"

const isDomainManagerRole = (role: string): boolean =>
    role === "owner" || role === "admin"

// Repositories fail with a bare Error, so the tag has to be recovered from the
// message. The literals below are set in repository.ts — rewording one there
// silently turns a 404 into a 500.
const mapContactError = (error: unknown, id?: string) => {
    if (error instanceof AuthorizationError) {
        return error
    }

    if (error instanceof Error && error.message.includes("not found")) {
        return new NotFoundError({
            message: `Contact with id ${id ?? "unknown"} not found`,
        })
    }

    return new DatabaseError({ message: "Failed to access contacts" })
}

const mapContactsListError = (error: unknown) =>
    error instanceof AuthorizationError
        ? error
        : new DatabaseError({ message: "Failed to fetch contacts" })

const ContactsRpcHandlersLive = Effect.gen(function* () {
    const contacts = yield* ContactsRepository
    const domains = yield* DomainsRepository

    // This group carries only AuthenticatedRpcMiddleware and takes domain_id in
    // the payload, so the middleware never checked the tenant. Every route here
    // must yield* this, or it is a cross-tenant read that typechecks.
    const requireDomainManager = (domain_id: string) =>
        Effect.gen(function* () {
            const context = yield* AuthenticatedRequestContext

            if (
                context.domainId !== undefined &&
                context.domainId !== domain_id
            ) {
                return yield* Effect.fail(
                    new AuthorizationError({
                        message: "Not permitted for this domain",
                    })
                )
            }
            const membership = yield* domains.findAdmin(
                domain_id,
                context.contactId
            )

            if (membership === null || !isDomainManagerRole(membership.role)) {
                return yield* Effect.fail(
                    new AuthorizationError({
                        message: "Not permitted for this domain",
                    })
                )
            }
        })

    return ContactsRpcs.of({
        "contacts.list": ({ domain_id }: { domain_id: string }) =>
            Effect.gen(function* () {
                yield* requireDomainManager(domain_id)
                return yield* contacts.findMany(domain_id, { limit: 50 })
            }).pipe(Effect.mapError(mapContactsListError)),

        "contacts.get": ({
            domain_id,
            id,
        }: {
            domain_id: string
            id: string
        }) =>
            Effect.gen(function* () {
                yield* requireDomainManager(domain_id)
                const contact = yield* contacts.findById(domain_id, id)

                if (contact === null) {
                    return yield* Effect.fail(
                        new NotFoundError({
                            message: `Contact with id ${id} not found`,
                        })
                    )
                }

                return contact
            }).pipe(Effect.mapError((error) => mapContactError(error, id))),

        "contacts.create": ({ domain_id, data }) =>
            Effect.gen(function* () {
                yield* requireDomainManager(domain_id)
                const input = yield* Schema.decodeUnknownEffect(
                    CreateContactInput
                )({
                    id: crypto.randomUUID(),
                    name: data.name,
                    email: data.email,
                    tel: data.tel,
                    title: data.title,
                    company: data.company,
                    updated_at: Date.now(),
                })

                return yield* contacts.insert(domain_id, input)
            }).pipe(
                Effect.mapError((error) => {
                    if (error instanceof AuthorizationError) {
                        return error
                    }

                    if (
                        error instanceof Error &&
                        error.message.includes("already exists in this domain")
                    ) {
                        return new ConflictError({
                            message: "Contact already exists in this domain",
                        })
                    }

                    return new DatabaseError({
                        message: "Failed to create contact",
                    })
                })
            ),

        "contacts.update": ({
            domain_id,
            id,
            data,
        }: {
            domain_id: string
            id: string
            data: Schema.Schema.Type<typeof UpdateDomainContactProfileInput>
        }) =>
            Effect.gen(function* () {
                yield* requireDomainManager(domain_id)
                return yield* contacts.update(domain_id, id, data)
            }).pipe(Effect.mapError((error) => mapContactError(error, id))),

        "contacts.delete": ({
            domain_id,
            id,
        }: {
            domain_id: string
            id: string
        }) =>
            Effect.gen(function* () {
                yield* requireDomainManager(domain_id)
                yield* contacts.delete(domain_id, id)
                return { txid: 0 }
            }).pipe(Effect.mapError((error) => mapContactError(error, id))),
    })
})

export const ContactsRpcLive = ContactsRpcs.toLayer(ContactsRpcHandlersLive)

export const ContactsRpcHandlersTagLive = Layer.effect(
    ContactsRpcHandlersTag,
    ContactsRpcHandlersLive
)
