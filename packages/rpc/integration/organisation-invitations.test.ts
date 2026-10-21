import { AuditEventPersistenceLive } from "@urm/auth/audit-events"
import {
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { OrganisationsRpcs } from "@urm/contracts/organisations"
import {
    DB,
    makeDatabaseLiveFromUrl,
    makeMigratorLive,
    migrator,
    schema,
} from "@urm/database"
import { ContactId } from "@urm/domain/schemas/contacts"
import { EmailTransport, type EmailSendInput } from "@urm/email"
import { ServerConfig } from "@urm/env/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { Effect, Layer, ManagedRuntime, Ref, Schema } from "effect"
import { RpcTest } from "effect/rpc"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { OrganisationsRpcLive } from "../src/handlers/organisations/handlers.ts"

const test_database_url = process.env.DATABASE_URL_TEST

if (test_database_url === undefined || test_database_url.length === 0) {
    throw new Error(
        "DATABASE_URL_TEST is required for organisation invitation integration tests"
    )
}

const database_test_live = makeDatabaseLiveFromUrl(
    test_database_url,
    "development"
)
const migrator_test_live = makeMigratorLive().pipe(
    Layer.provide(database_test_live)
)

const org_a_id = "41111111-1111-4111-8111-111111111111"
const org_b_id = "42222222-2222-4222-8222-222222222222"
const domain_a_id = "51111111-1111-4111-8111-111111111111"
const domain_b_id = "52222222-2222-4222-8222-222222222222"
const owner_a_contact_id = "organisation-invitations-owner-a"
const admin_a_contact_id = "organisation-invitations-admin-a"
const member_a_contact_id = "organisation-invitations-member-a"
const admin_b_contact_id = "organisation-invitations-admin-b"
const recipient_contact_id = "organisation-invitations-recipient"
const wrong_recipient_contact_id = "organisation-invitations-wrong-recipient"

const ServerConfigTestLive = Layer.succeed(
    ServerConfig,
    ServerConfig.of({
        port: 1234,
        hostname: "localhost",
        apiUrl: "https://api.example.test",
        appUrl: "https://app.example.test",
        adminAppUrl: "https://admin.example.test",
        marketingAppUrl: "https://marketing.example.test",
        cookieDomain: "",
    })
)

const clean_test_database = Effect.gen(function* () {
    const db = yield* DB
    yield* db.execute(sql`TRUNCATE TABLE "contacts", "orgs" CASCADE`)
})

const seed_test_database = Effect.gen(function* () {
    const db = yield* DB
    const now = Date.now()

    yield* db.insert(schema.contacts).values([
        {
            id: owner_a_contact_id,
            name: "Organisation A Owner",
            email: "organisation-a-owner@example.test",
            email_verified: true,
            updated_at: now,
        },
        {
            id: admin_a_contact_id,
            name: "Organisation A Admin",
            email: "organisation-a-admin@example.test",
            email_verified: true,
            updated_at: now,
        },
        {
            id: member_a_contact_id,
            name: "Organisation A Member",
            email: "organisation-a-member@example.test",
            email_verified: true,
            updated_at: now,
        },
        {
            id: admin_b_contact_id,
            name: "Organisation B Admin",
            email: "organisation-b-admin@example.test",
            email_verified: true,
            updated_at: now,
        },
        {
            id: recipient_contact_id,
            name: "Invitation Recipient",
            email: "organisation-invitation-recipient@example.test",
            email_verified: true,
            updated_at: now,
        },
        {
            id: wrong_recipient_contact_id,
            name: "Wrong Invitation Recipient",
            email: "organisation-invitation-wrong-recipient@example.test",
            email_verified: true,
            updated_at: now,
        },
    ])
    yield* db.insert(schema.orgs).values([
        {
            id: org_a_id,
            name: "Organisation A",
            slug: "organisation-invitations-a",
        },
        {
            id: org_b_id,
            name: "Organisation B",
            slug: "organisation-invitations-b",
        },
    ])
    yield* db.insert(schema.org_contacts).values([
        {
            org_id: org_a_id,
            contact_id: owner_a_contact_id,
            role: "owner",
            status: "active",
        },
        {
            org_id: org_a_id,
            contact_id: admin_a_contact_id,
            role: "admin",
            status: "active",
        },
        {
            org_id: org_a_id,
            contact_id: member_a_contact_id,
            role: "member",
            status: "active",
        },
        {
            org_id: org_b_id,
            contact_id: admin_b_contact_id,
            role: "admin",
            status: "active",
        },
    ])
    yield* db.insert(schema.domains).values([
        {
            id: domain_a_id,
            org_id: org_a_id,
            name: "organisation-invitations-a",
            created_by_contact_id: owner_a_contact_id,
        },
        {
            id: domain_b_id,
            org_id: org_b_id,
            name: "organisation-invitations-b",
            created_by_contact_id: admin_b_contact_id,
        },
    ])
})

const authenticated_rpc_middleware_test_live = (
    contact_id: string,
    domain_id: string | undefined
) =>
    Layer.succeed(
        AuthenticatedRpcMiddleware,
        AuthenticatedRpcMiddleware.of((effect, options) =>
            Effect.provideService(
                effect,
                AuthenticatedRequestContext,
                domain_id === undefined
                    ? {
                          requestId: "organisation-invitations-test",
                          contactId:
                              Schema.decodeUnknownSync(ContactId)(contact_id),
                          headers: options.headers,
                      }
                    : {
                          requestId: "organisation-invitations-test",
                          contactId:
                              Schema.decodeUnknownSync(ContactId)(contact_id),
                          headers: options.headers,
                          domainId: domain_id,
                          hostname: `${domain_id}.example.test`,
                      }
            )
        )
    )

const invitation_code_from_email = (email: EmailSendInput): string => {
    const match = email.text.match(/[?&]organisation_invitation=([^&\s]+)/)
    const encoded_code = match?.[1]

    if (encoded_code === undefined) {
        throw new Error("Expected an organisation invitation acceptance code")
    }

    return decodeURIComponent(encoded_code)
}

const make_runtime = (
    contact_id: string,
    domain_id: string | undefined,
    sent_emails: Ref.Ref<ReadonlyArray<EmailSendInput>>
) => {
    const email_transport_test_live = Layer.succeed(
        EmailTransport,
        EmailTransport.of({
            send: (email) =>
                Ref.update(sent_emails, (emails) => [...emails, email]).pipe(
                    Effect.as({ status: "skipped", reason: "disabled" })
                ),
        })
    )

    return ManagedRuntime.make(
        Layer.mergeAll(
            OrganisationsRpcLive.pipe(
                Layer.provide(
                    AuditEventPersistenceLive.pipe(
                        Layer.provide(database_test_live)
                    )
                ),
                Layer.provide(email_transport_test_live),
                Layer.provide(ServerConfigTestLive),
                Layer.provide(database_test_live)
            ),
            authenticated_rpc_middleware_test_live(contact_id, domain_id)
        )
    )
}

type OrganisationRuntime = ReturnType<typeof make_runtime>

const invite = (
    runtime: OrganisationRuntime,
    email: string,
    role: "admin" | "member" = "member"
) =>
    runtime.runPromise(
        Effect.gen(function* () {
            const client = yield* RpcTest.makeClient(OrganisationsRpcs)
            return yield* client["organisations.members.invite"]({
                email,
                role,
            })
        }).pipe(Effect.scoped)
    )

const accept = (runtime: OrganisationRuntime, code: string) =>
    runtime.runPromise(
        Effect.gen(function* () {
            const client = yield* RpcTest.makeClient(OrganisationsRpcs)
            return yield* client["organisations.invitations.accept"]({ code })
        }).pipe(Effect.scoped)
    )

const update_member = (
    runtime: OrganisationRuntime,
    contact_id: string,
    role: "admin" | "member",
    status: "active" | "suspended"
) =>
    runtime.runPromise(
        Effect.gen(function* () {
            const client = yield* RpcTest.makeClient(OrganisationsRpcs)
            return yield* client["organisations.members.update"]({
                contact_id,
                role,
                status,
            })
        }).pipe(Effect.scoped)
    )

beforeAll(async () => {
    await Effect.runPromise(migrator().pipe(Effect.provide(migrator_test_live)))
})

beforeEach(async () => {
    await Effect.runPromise(
        clean_test_database.pipe(Effect.provide(database_test_live))
    )
    await Effect.runPromise(
        seed_test_database.pipe(Effect.provide(database_test_live))
    )
})

afterAll(async () => {
    await Effect.runPromise(
        clean_test_database.pipe(Effect.provide(database_test_live))
    )
})

describe("organisation invitations", () => {
    it("creates a hashed invitation, accepts it once, and records both audit events", async () => {
        const sent_emails = await Effect.runPromise(
            Ref.make<ReadonlyArray<EmailSendInput>>([])
        )
        const administrator = make_runtime(
            admin_a_contact_id,
            domain_a_id,
            sent_emails
        )
        const recipient = make_runtime(
            recipient_contact_id,
            undefined,
            sent_emails
        )

        const invitation = await invite(
            administrator,
            "organisation-invitation-recipient@example.test"
        )
        const emails = await Effect.runPromise(Ref.get(sent_emails))
        const email = emails[0]

        if (email === undefined) {
            throw new Error("Expected an invitation email")
        }

        const code = invitation_code_from_email(email)
        const accepted = await accept(recipient, code)

        expect(accepted).toMatchObject({
            contact_id: recipient_contact_id,
            role: "member",
            status: "active",
        })
        await expect(accept(recipient, code)).rejects.toMatchObject({
            _tag: "ValidationError",
        })

        const results = await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                const [invitations, memberships, audit_events] =
                    yield* Effect.all([
                        db
                            .select()
                            .from(schema.org_invitations)
                            .where(
                                eq(
                                    schema.org_invitations.id,
                                    invitation.invitation_id
                                )
                            ),
                        db
                            .select()
                            .from(schema.org_contacts)
                            .where(
                                and(
                                    eq(schema.org_contacts.org_id, org_a_id),
                                    eq(
                                        schema.org_contacts.contact_id,
                                        recipient_contact_id
                                    )
                                )
                            ),
                        db
                            .select({
                                action: schema.audit_events.action,
                                actor_contact_id:
                                    schema.audit_events.actor_contact_id,
                            })
                            .from(schema.audit_events)
                            .where(
                                inArray(schema.audit_events.action, [
                                    "organisation.invitation.created",
                                    "organisation.invitation.accepted",
                                ])
                            ),
                    ])
                return { invitations, memberships, audit_events }
            }).pipe(Effect.provide(database_test_live))
        )

        expect(results.invitations).toHaveLength(1)
        expect(results.invitations[0]?.code_hash).not.toBe(code)
        expect(results.invitations[0]?.consumed_at).not.toBeNull()
        expect(results.memberships).toHaveLength(1)
        expect(results.audit_events).toEqual(
            expect.arrayContaining([
                {
                    action: "organisation.invitation.created",
                    actor_contact_id: admin_a_contact_id,
                },
                {
                    action: "organisation.invitation.accepted",
                    actor_contact_id: recipient_contact_id,
                },
            ])
        )
    })

    it("rejects a wrong recipient, central-host bypasses, and cross-organisation member updates", async () => {
        const sent_emails = await Effect.runPromise(
            Ref.make<ReadonlyArray<EmailSendInput>>([])
        )
        const administrator = make_runtime(
            admin_a_contact_id,
            domain_a_id,
            sent_emails
        )
        const recipient = make_runtime(
            recipient_contact_id,
            undefined,
            sent_emails
        )
        const wrong_recipient = make_runtime(
            wrong_recipient_contact_id,
            undefined,
            sent_emails
        )
        const domain_scoped_recipient = make_runtime(
            recipient_contact_id,
            domain_b_id,
            sent_emails
        )
        const other_organisation_administrator = make_runtime(
            admin_b_contact_id,
            domain_b_id,
            sent_emails
        )

        await invite(
            administrator,
            "organisation-invitation-recipient@example.test"
        )
        const emails = await Effect.runPromise(Ref.get(sent_emails))
        const email = emails[0]

        if (email === undefined) {
            throw new Error("Expected an invitation email")
        }

        const code = invitation_code_from_email(email)
        await expect(accept(wrong_recipient, code)).rejects.toMatchObject({
            _tag: "ValidationError",
        })
        await expect(
            accept(domain_scoped_recipient, code)
        ).rejects.toMatchObject({ _tag: "AuthorizationError" })
        await expect(
            update_member(
                other_organisation_administrator,
                member_a_contact_id,
                "admin",
                "active"
            )
        ).rejects.toMatchObject({ _tag: "ValidationError" })
        await expect(accept(recipient, code)).resolves.toMatchObject({
            contact_id: recipient_contact_id,
        })
    })

    it("protects owners from organisation administrators", async () => {
        const sent_emails = await Effect.runPromise(
            Ref.make<ReadonlyArray<EmailSendInput>>([])
        )
        const administrator = make_runtime(
            admin_a_contact_id,
            domain_a_id,
            sent_emails
        )

        await expect(
            update_member(
                administrator,
                owner_a_contact_id,
                "member",
                "suspended"
            )
        ).rejects.toMatchObject({ _tag: "ValidationError" })

        const owner = await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                const rows = yield* db
                    .select({
                        role: schema.org_contacts.role,
                        status: schema.org_contacts.status,
                    })
                    .from(schema.org_contacts)
                    .where(
                        and(
                            eq(schema.org_contacts.org_id, org_a_id),
                            eq(
                                schema.org_contacts.contact_id,
                                owner_a_contact_id
                            )
                        )
                    )
                return rows[0]
            }).pipe(Effect.provide(database_test_live))
        )

        expect(owner).toEqual({ role: "owner", status: "active" })
    })

    it("applies role and suspension changes to organisation authority and audits them", async () => {
        const sent_emails = await Effect.runPromise(
            Ref.make<ReadonlyArray<EmailSendInput>>([])
        )
        const administrator = make_runtime(
            admin_a_contact_id,
            domain_a_id,
            sent_emails
        )
        const member = make_runtime(
            member_a_contact_id,
            domain_a_id,
            sent_emails
        )

        await expect(
            update_member(administrator, member_a_contact_id, "admin", "active")
        ).resolves.toMatchObject({ role: "admin", status: "active" })
        await expect(
            update_member(
                administrator,
                member_a_contact_id,
                "admin",
                "suspended"
            )
        ).resolves.toMatchObject({ role: "admin", status: "suspended" })
        await expect(
            invite(member, "suspended-member-target@example.test")
        ).rejects.toMatchObject({ _tag: "AuthorizationError" })
        await expect(
            update_member(
                administrator,
                member_a_contact_id,
                "member",
                "active"
            )
        ).resolves.toMatchObject({ role: "member", status: "active" })

        const audit_events = await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                return yield* db
                    .select({
                        action: schema.audit_events.action,
                        contact_id: schema.audit_events.contact_id,
                    })
                    .from(schema.audit_events)
                    .where(
                        eq(
                            schema.audit_events.action,
                            "organisation.member.updated"
                        )
                    )
            }).pipe(Effect.provide(database_test_live))
        )

        expect(audit_events).toHaveLength(3)
        expect(audit_events).toEqual(
            expect.arrayContaining([
                {
                    action: "organisation.member.updated",
                    contact_id: member_a_contact_id,
                },
            ])
        )
    })
})
