import { createHash, randomBytes } from "node:crypto"
import { Effect, Option } from "effect"
import { and, eq, gt, isNull, ne } from "drizzle-orm"

import { recordAuditEvent } from "@urm/auth/audit-events"
import { AuthenticatedRequestContext } from "@urm/contracts/auth-legacy"
import {
    OrganisationMember,
    OrganisationsRpcs,
} from "@urm/contracts/organisations"
import { DB, schema } from "@urm/database"
import { ServerConfig } from "@urm/env/server"
import { EmailTransport } from "@urm/email"
import {
    AuthorizationError,
    ConflictError,
    DatabaseError,
    ValidationError,
} from "@urm/domain/errors"

const invitation_lifetime_ms = 7 * 24 * 60 * 60 * 1000

const hashCode = (value: string): string =>
    createHash("sha256").update(value).digest("hex")
const newCode = (): string => randomBytes(32).toString("base64url")
const normalizedEmail = (value: string): string => value.trim().toLowerCase()

const authenticatedContext = Effect.serviceOption(
    AuthenticatedRequestContext
).pipe(
    Effect.flatMap(
        Option.match({
            onNone: () =>
                Effect.fail(
                    new AuthorizationError({
                        message: "Authentication required",
                    })
                ),
            onSome: Effect.succeed,
        })
    )
)

const OrganisationRpcHandlersLive = Effect.gen(function* () {
    const db = yield* DB
    const email_transport = yield* EmailTransport
    const server_config = yield* ServerConfig

    const requireOrganisationAdmin = Effect.fn("Organisation.requireAdmin")(
        function* () {
            const context = yield* authenticatedContext

            if (context.domainId === undefined) {
                return yield* Effect.fail(
                    new AuthorizationError({
                        message: "Organisation domain scope is required",
                    })
                )
            }

            const rows = yield* db
                .select({
                    org_id: schema.domains.org_id,
                    role: schema.org_contacts.role,
                })
                .from(schema.domains)
                .innerJoin(
                    schema.org_contacts,
                    and(
                        eq(schema.org_contacts.org_id, schema.domains.org_id),
                        eq(schema.org_contacts.contact_id, context.contactId),
                        eq(schema.org_contacts.status, "active"),
                        isNull(schema.org_contacts.deleted_at)
                    )
                )
                .where(
                    and(
                        eq(schema.domains.id, context.domainId),
                        isNull(schema.domains.deleted_at)
                    )
                )
                .limit(1)
            const membership = rows[0]

            if (
                membership === undefined ||
                (membership.role !== "owner" && membership.role !== "admin")
            ) {
                return yield* Effect.fail(
                    new AuthorizationError({
                        message:
                            "Organisation administrator access is required",
                    })
                )
            }

            return { ...membership, contact_id: context.contactId }
        }
    )

    return OrganisationsRpcs.of({
        "organisations.members.list": () =>
            Effect.gen(function* () {
                const membership = yield* requireOrganisationAdmin()
                const rows = yield* db
                    .select({
                        contact_id: schema.org_contacts.contact_id,
                        name: schema.contacts.name,
                        email: schema.contacts.email,
                        role: schema.org_contacts.role,
                        status: schema.org_contacts.status,
                    })
                    .from(schema.org_contacts)
                    .innerJoin(
                        schema.contacts,
                        eq(schema.contacts.id, schema.org_contacts.contact_id)
                    )
                    .where(
                        and(
                            eq(schema.org_contacts.org_id, membership.org_id),
                            isNull(schema.org_contacts.deleted_at)
                        )
                    )
                return rows.map((row) =>
                    row.email === null
                        ? OrganisationMember.make({
                              contact_id: row.contact_id,
                              name: row.name,
                              role: row.role,
                              status: row.status,
                          })
                        : OrganisationMember.make({
                              contact_id: row.contact_id,
                              name: row.name,
                              email: row.email,
                              role: row.role,
                              status: row.status,
                          })
                )
            }).pipe(
                Effect.mapError(
                    () =>
                        new DatabaseError({
                            message: "Failed to list organisation members",
                        })
                )
            ),
        "organisations.members.invite": ({ email, role }) =>
            Effect.gen(function* () {
                const membership = yield* requireOrganisationAdmin()
                const recipient_email = normalizedEmail(email)

                if (!recipient_email.includes("@")) {
                    return yield* Effect.fail(
                        new ValidationError({
                            message: "A valid email address is required",
                        })
                    )
                }

                const now = new Date()
                const code = newCode()
                const expires_at = new Date(
                    now.getTime() + invitation_lifetime_ms
                )
                yield* db
                    .update(schema.org_invitations)
                    .set({ revoked_at: now, updated_at: now })
                    .where(
                        and(
                            eq(
                                schema.org_invitations.org_id,
                                membership.org_id
                            ),
                            eq(schema.org_invitations.email, recipient_email),
                            isNull(schema.org_invitations.consumed_at),
                            isNull(schema.org_invitations.revoked_at)
                        )
                    )
                const inserted = yield* db
                    .insert(schema.org_invitations)
                    .values({
                        org_id: membership.org_id,
                        email: recipient_email,
                        role,
                        code_hash: hashCode(code),
                        invited_by_contact_id: membership.contact_id,
                        expires_at,
                        created_at: now,
                        updated_at: now,
                    })
                    .returning({ id: schema.org_invitations.id })
                const invitation = inserted[0]

                if (invitation === undefined) {
                    return yield* Effect.fail(
                        new DatabaseError({
                            message: "Failed to create organisation invitation",
                        })
                    )
                }

                const acceptance_url = `${server_config.adminAppUrl}/?organisation_invitation=${encodeURIComponent(code)}`
                yield* email_transport.send({
                    to: recipient_email,
                    subject: "You have been invited to an URM organisation",
                    text: `Sign in with ${recipient_email}, then accept your invitation: ${acceptance_url}`,
                })
                yield* recordAuditEvent({
                    action: "organisation.invitation.created",
                    entity_type: "organisation_invitation",
                    entity_id: invitation.id,
                    actor_contact_id: membership.contact_id,
                    org_id: membership.org_id,
                    result: "succeeded",
                })
                return { invitation_id: invitation.id }
            }).pipe(
                Effect.mapError((error) =>
                    error instanceof AuthorizationError ||
                    error instanceof ValidationError ||
                    error instanceof DatabaseError
                        ? error
                        : new ConflictError({
                              message:
                                  "Failed to create organisation invitation",
                          })
                )
            ),
        "organisations.invitations.accept": ({ code }) =>
            Effect.gen(function* () {
                const context = yield* authenticatedContext

                if (context.domainId !== undefined) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message: "Accept invitations from the central host",
                        })
                    )
                }

                const contact_rows = yield* db
                    .select({
                        email: schema.contacts.email,
                        email_verified: schema.contacts.email_verified,
                        name: schema.contacts.name,
                    })
                    .from(schema.contacts)
                    .where(
                        and(
                            eq(schema.contacts.id, context.contactId),
                            isNull(schema.contacts.deleted_at)
                        )
                    )
                    .limit(1)
                const contact = contact_rows[0]

                if (
                    contact === undefined ||
                    contact.email === null ||
                    !contact.email_verified
                ) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message: "A verified email address is required",
                        })
                    )
                }

                const now = new Date()
                const consumed = yield* db
                    .update(schema.org_invitations)
                    .set({ consumed_at: now, updated_at: now })
                    .where(
                        and(
                            eq(
                                schema.org_invitations.code_hash,
                                hashCode(code)
                            ),
                            eq(
                                schema.org_invitations.email,
                                normalizedEmail(contact.email)
                            ),
                            gt(schema.org_invitations.expires_at, now),
                            isNull(schema.org_invitations.consumed_at),
                            isNull(schema.org_invitations.revoked_at)
                        )
                    )
                    .returning()
                const invitation = consumed[0]

                if (invitation === undefined) {
                    return yield* Effect.fail(
                        new ValidationError({
                            message: "Invitation is invalid or expired",
                        })
                    )
                }

                yield* db
                    .insert(schema.org_contacts)
                    .values({
                        org_id: invitation.org_id,
                        contact_id: context.contactId,
                        role: invitation.role,
                        status: "active",
                        created_at: now,
                        updated_at: now,
                    })
                    .onConflictDoNothing()
                yield* recordAuditEvent({
                    action: "organisation.invitation.accepted",
                    entity_type: "organisation_invitation",
                    entity_id: invitation.id,
                    actor_contact_id: context.contactId,
                    org_id: invitation.org_id,
                    result: "succeeded",
                })
                return OrganisationMember.make({
                    contact_id: context.contactId,
                    name: contact.name,
                    email: contact.email,
                    role: invitation.role,
                    status: "active",
                })
            }).pipe(
                Effect.mapError((error) =>
                    error instanceof AuthorizationError ||
                    error instanceof ValidationError
                        ? error
                        : new DatabaseError({
                              message:
                                  "Failed to accept organisation invitation",
                          })
                )
            ),
        "organisations.members.update": ({ contact_id, role, status }) =>
            Effect.gen(function* () {
                const membership = yield* requireOrganisationAdmin()

                if (contact_id === membership.contact_id) {
                    return yield* Effect.fail(
                        new ValidationError({
                            message:
                                "You cannot change your own organisation membership",
                        })
                    )
                }

                const updated = yield* db
                    .update(schema.org_contacts)
                    .set({ role, status, updated_at: new Date() })
                    .where(
                        and(
                            eq(schema.org_contacts.org_id, membership.org_id),
                            eq(schema.org_contacts.contact_id, contact_id),
                            ne(schema.org_contacts.role, "owner"),
                            isNull(schema.org_contacts.deleted_at)
                        )
                    )
                    .returning()
                const member = updated[0]

                if (member === undefined) {
                    return yield* Effect.fail(
                        new ValidationError({
                            message:
                                "Only ordinary organisation members can be updated",
                        })
                    )
                }

                const contacts = yield* db
                    .select({
                        name: schema.contacts.name,
                        email: schema.contacts.email,
                    })
                    .from(schema.contacts)
                    .where(eq(schema.contacts.id, contact_id))
                    .limit(1)
                const contact = contacts[0]

                if (contact === undefined) {
                    return yield* Effect.fail(
                        new DatabaseError({
                            message: "Organisation contact is unavailable",
                        })
                    )
                }

                yield* recordAuditEvent({
                    action: "organisation.member.updated",
                    entity_type: "organisation_member",
                    entity_id: member.id,
                    actor_contact_id: membership.contact_id,
                    contact_id,
                    org_id: membership.org_id,
                    result: "succeeded",
                })
                return contact.email === null
                    ? OrganisationMember.make({
                          contact_id,
                          name: contact.name,
                          role: member.role,
                          status: member.status,
                      })
                    : OrganisationMember.make({
                          contact_id,
                          name: contact.name,
                          email: contact.email,
                          role: member.role,
                          status: member.status,
                      })
            }).pipe(
                Effect.mapError((error) =>
                    error instanceof AuthorizationError ||
                    error instanceof ValidationError ||
                    error instanceof DatabaseError
                        ? error
                        : new DatabaseError({
                              message: "Failed to update organisation member",
                          })
                )
            ),
    })
})

export const OrganisationsRpcLive = OrganisationsRpcs.toLayer(
    OrganisationRpcHandlersLive
)
