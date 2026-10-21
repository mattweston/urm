/**
 * Domain-scoped contact persistence.
 *
 * `contacts` holds the global authenticated identity. `domain_contacts` owns
 * the profile and lifecycle visible to one domain.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, eq, isNull } from "drizzle-orm"
import { DB } from "@urm/db/layer"
import { contacts } from "@urm/db/legacy-schema/contacts"
import { domain_contacts } from "@urm/db/legacy-schema/domains"
import {
    ContactId,
    Contact,
    CreateContactInput,
    UpdateDomainContactProfileInput,
} from "@urm/domain/schemas/contacts"
import {
    ContactsRepository,
    type ContactsRepositoryType,
} from "@urm/contracts/repositories/contacts"
import { repositoryError } from "../errors.ts"

type ContactRow = typeof contacts.$inferSelect
type DomainContactRow = typeof domain_contacts.$inferSelect

const normalizeOptionalText = (value: string | null): string | undefined =>
    value === null ? undefined : value

const toContact = (
    contact: ContactRow,
    domain_contact: DomainContactRow
): Contact => ({
    id: Schema.decodeUnknownSync(ContactId)(contact.id),
    name: normalizeOptionalText(domain_contact.display_name) ?? contact.name,
    email: normalizeOptionalText(contact.email),
    tel:
        normalizeOptionalText(domain_contact.tel) ??
        normalizeOptionalText(contact.tel),
    title:
        normalizeOptionalText(domain_contact.title) ??
        normalizeOptionalText(contact.title),
    company:
        normalizeOptionalText(domain_contact.company) ??
        normalizeOptionalText(contact.company),
    updated_at: domain_contact.updated_at.getTime(),
    deleted_at:
        domain_contact.deleted_at === null
            ? undefined
            : domain_contact.deleted_at.getTime(),
})

const contactQuery = (domain_id: string, contact_id?: string) => {
    const conditions = [
        eq(domain_contacts.domain_id, domain_id),
        isNull(domain_contacts.deleted_at),
        isNull(contacts.deleted_at),
    ]

    if (contact_id !== undefined) {
        conditions.push(eq(domain_contacts.contact_id, contact_id))
    }

    return and(...conditions)
}

export const ContactsRepositoryLive = Layer.effect(
    ContactsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: ContactsRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateContactInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    return yield* db.transaction((tx) =>
                        Effect.gen(function* () {
                            const existing_contacts =
                                validated.email === undefined
                                    ? []
                                    : yield* tx
                                          .select()
                                          .from(contacts)
                                          .where(
                                              and(
                                                  eq(
                                                      contacts.email,
                                                      validated.email
                                                  ),
                                                  isNull(contacts.deleted_at)
                                              )
                                          )
                                          .limit(1)
                                          .pipe(
                                              Effect.mapError(repositoryError)
                                          )

                            const existing_contact = existing_contacts[0]
                            const global_contact =
                                existing_contact === undefined
                                    ? yield* tx
                                          .insert(contacts)
                                          .values({
                                              ...validated,
                                              created_at: Date.now(),
                                              updated_at: Date.now(),
                                          })
                                          .returning()
                                          .pipe(
                                              Effect.mapError(repositoryError),
                                              Effect.flatMap((inserted) => {
                                                  const inserted_contact =
                                                      inserted[0]
                                                  return inserted_contact ===
                                                      undefined
                                                      ? Effect.fail(
                                                            repositoryError(
                                                                "Failed to create contact identity"
                                                            )
                                                        )
                                                      : Effect.succeed(
                                                            inserted_contact
                                                        )
                                              })
                                          )
                                    : existing_contact

                            const existing_domain_contacts = yield* tx
                                .select()
                                .from(domain_contacts)
                                .where(
                                    and(
                                        eq(
                                            domain_contacts.domain_id,
                                            domain_id
                                        ),
                                        eq(
                                            domain_contacts.contact_id,
                                            global_contact.id
                                        ),
                                        isNull(domain_contacts.deleted_at)
                                    )
                                )
                                .limit(1)
                                .pipe(Effect.mapError(repositoryError))

                            if (existing_domain_contacts[0] !== undefined) {
                                return yield* Effect.fail(
                                    repositoryError(
                                        "Contact already exists in this domain"
                                    )
                                )
                            }

                            const inserted_profiles = yield* tx
                                .insert(domain_contacts)
                                .values({
                                    domain_id,
                                    contact_id: global_contact.id,
                                    source: "manual",
                                    display_name: validated.name,
                                    tel: validated.tel,
                                    title: validated.title,
                                    company: validated.company,
                                })
                                .returning()
                                .pipe(Effect.mapError(repositoryError))

                            const profile = inserted_profiles[0]
                            if (profile === undefined) {
                                return yield* Effect.fail(
                                    repositoryError(
                                        "Failed to create domain contact"
                                    )
                                )
                            }

                            return {
                                item: toContact(global_contact, profile),
                                txid: 0,
                            }
                        })
                    )
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id, id, data) =>
                Effect.gen(function* () {
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateDomainContactProfileInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const updated_profiles = yield* db
                        .update(domain_contacts)
                        .set({
                            display_name: validated.name,
                            tel: validated.tel,
                            title: validated.title,
                            company: validated.company,
                            updated_at: new Date(),
                        })
                        .where(
                            and(
                                eq(domain_contacts.domain_id, domain_id),
                                eq(domain_contacts.contact_id, id),
                                isNull(domain_contacts.deleted_at)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated_profiles[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Contact with ID ${id} not found in this domain`
                            )
                        )
                    }

                    const contact = yield* repository.findById(domain_id, id)
                    if (contact === null) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Contact with ID ${id} not found in this domain`
                            )
                        )
                    }

                    return { item: contact, txid: 0 }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id, id) =>
                db
                    .select({
                        contact: contacts,
                        domain_contact: domain_contacts,
                    })
                    .from(domain_contacts)
                    .innerJoin(
                        contacts,
                        eq(domain_contacts.contact_id, contacts.id)
                    )
                    .where(contactQuery(domain_id, id))
                    .limit(1)
                    .pipe(
                        Effect.mapError(repositoryError),
                        Effect.map((results) => {
                            const result = results[0]
                            return result === undefined
                                ? null
                                : toContact(
                                      result.contact,
                                      result.domain_contact
                                  )
                        })
                    ),

            findMany: (domain_id, { limit = 50 } = {}) =>
                db
                    .select({
                        contact: contacts,
                        domain_contact: domain_contacts,
                    })
                    .from(domain_contacts)
                    .innerJoin(
                        contacts,
                        eq(domain_contacts.contact_id, contacts.id)
                    )
                    .where(contactQuery(domain_id))
                    .limit(limit)
                    .pipe(
                        Effect.mapError(repositoryError),
                        Effect.map((results) =>
                            results.map(({ contact, domain_contact }) =>
                                toContact(contact, domain_contact)
                            )
                        )
                    ),

            delete: (domain_id, id) =>
                db
                    .update(domain_contacts)
                    .set({ deleted_at: new Date(), updated_at: new Date() })
                    .where(
                        and(
                            eq(domain_contacts.domain_id, domain_id),
                            eq(domain_contacts.contact_id, id),
                            isNull(domain_contacts.deleted_at)
                        )
                    )
                    .returning({ id: domain_contacts.id })
                    .pipe(
                        Effect.mapError(repositoryError),
                        Effect.flatMap((deleted_profiles) =>
                            deleted_profiles[0] === undefined
                                ? Effect.fail(
                                      repositoryError(
                                          `Contact with ID ${id} not found in this domain`
                                      )
                                  )
                                : Effect.void
                        )
                    ),
        }

        return repository
    })
)
