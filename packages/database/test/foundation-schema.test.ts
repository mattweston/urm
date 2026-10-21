import { PGlite } from "@electric-sql/pglite"
import { eq, getTableName, is } from "drizzle-orm"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/pglite"
import { readFile, readdir } from "node:fs/promises"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import * as schema from "../src/schema/index.ts"
import { relations } from "../src/schema/relations.ts"

const pg = new PGlite()
const database = drizzle({ client: pg, relations })
const now = 1_789_819_200_000
const timestamps = { created_at: now, updated_at: now }

beforeAll(async () => {
    const migrations_url = new URL("../src/migrations/", import.meta.url)
    const directories = await readdir(migrations_url, { withFileTypes: true })
    for (const directory of directories
        .filter((entry) => entry.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name))) {
        const migration = await readFile(
            new URL(`${directory.name}/migration.sql`, migrations_url),
            "utf8"
        )
        await pg.exec(migration)
    }
}, 30_000)

afterAll(async () => {
    await pg.close()
})

beforeEach(async () => {
    await pg.exec(
        "TRUNCATE organizations, users, organization_members, organization_invitations, auth_sessions, domains, contacts, contact_email_addresses, domain_contacts CASCADE"
    )
})

const seed_tenant = async () => {
    await database.insert(schema.organizations).values({
        id: "org-1",
        name: "Acme",
        slug: "acme",
        kind: "customer",
        max_domains: 3,
        ...timestamps,
    })
    await database.insert(schema.users).values({
        id: "user-1",
        auth_provider: "workos",
        provider_subject: "workos-user-1",
        token_identifier: "issuer|user-1",
        ...timestamps,
    })
    await database.insert(schema.organization_members).values({
        id: "membership-1",
        organization_id: "org-1",
        user_id: "user-1",
        role: "owner",
        status: "active",
        ...timestamps,
    })
    await database.insert(schema.domains).values({
        id: "domain-1",
        organization_id: "org-1",
        created_by_user_id: "user-1",
        name: "Acme",
        slug: "acme",
        publication_status: "draft",
        publication_access: "public",
        ...timestamps,
    })
}

const seed_contact = async () => {
    await database
        .insert(schema.contacts)
        .values({ id: "contact-1", name: "Ada", ...timestamps })
    await database.insert(schema.contact_email_addresses).values({
        id: "email-1",
        contact_id: "contact-1",
        email: "ada@example.com",
        is_primary: true,
        ...timestamps,
    })
}

describe("PostgreSQL foundation migration", () => {
    it("creates exactly the canonical tables and columns including owned account tables", async () => {
        const result = await pg.query<{
            table_name: string
            column_name: string
        }>(`
            SELECT table_name, column_name FROM information_schema.columns
            WHERE table_schema = 'public' ORDER BY table_name, column_name
        `)
        const expected = Object.values(schema)
            .flatMap((value) =>
                is(value, PgTable)
                    ? getTableConfig(value).columns.map((column) => ({
                          table_name: getTableName(value),
                          column_name: column.name,
                      }))
                    : []
            )
            .sort(
                (left, right) =>
                    left.table_name.localeCompare(right.table_name) ||
                    left.column_name.localeCompare(right.column_name)
            )
        expect(result.rows).toEqual(expected)
        expect([...new Set(result.rows.map((row) => row.table_name))]).toEqual(
            expect.arrayContaining([
                "products",
                "product_variants",
                "product_collections",
                "product_collection_memberships",
                "shop_customers",
                "carts",
                "cart_items",
                "orders",
                "order_items",
                "shop_payments",
                "shop_payment_events",
            ])
        )
    })

    it("keeps Shop catalog and cart references inside their domain", async () => {
        await seed_tenant()
        await database.insert(schema.domains).values({
            id: "domain-2",
            organization_id: "org-1",
            created_by_user_id: "user-1",
            name: "Other",
            slug: "other",
            publication_status: "draft",
            publication_access: "public",
            ...timestamps,
        })
        const product = {
            id: "product-1",
            domain_id: "domain-1",
            name: "Book",
            slug: "book",
            price: 1200,
            image_url: "https://example.com/book.png",
            is_active: true,
            is_featured: false,
            ...timestamps,
        }
        await database.insert(schema.products).values(product)
        await expect(
            database.insert(schema.products).values({
                ...product,
                id: "product-duplicate",
            })
        ).rejects.toMatchObject({ cause: { code: "23505" } })
        await database.insert(schema.products).values({
            ...product,
            id: "product-2",
            domain_id: "domain-2",
        })
        const variant = {
            id: "variant-1",
            domain_id: "domain-1",
            product_id: "product-1",
            name: "Default",
            price: 1200,
            currency: "USD",
            stock: 5,
            is_active: true,
            ...timestamps,
        }
        await expect(
            database.insert(schema.product_variants).values({
                ...variant,
                id: "wrong-domain-variant",
                domain_id: "domain-2",
            })
        ).rejects.toMatchObject({ cause: { code: "23503" } })
        await expect(
            database.insert(schema.product_variants).values({
                ...variant,
                id: "negative-stock",
                stock: -1,
            })
        ).rejects.toMatchObject({ cause: { code: "23514" } })
        await database.insert(schema.product_variants).values(variant)
        await database.insert(schema.product_collections).values({
            id: "collection-2",
            domain_id: "domain-2",
            name: "Books",
            slug: "books",
            is_active: true,
            ...timestamps,
        })
        await expect(
            database.insert(schema.product_collection_memberships).values({
                id: "cross-domain-membership",
                domain_id: "domain-1",
                product_id: "product-1",
                collection_id: "collection-2",
                ...timestamps,
            })
        ).rejects.toMatchObject({ cause: { code: "23503" } })
        await database.insert(schema.carts).values({
            id: "cart-1",
            domain_id: "domain-1",
            session_id: "session-1",
            currency: "USD",
            ...timestamps,
        })
        await expect(
            database.insert(schema.cart_items).values({
                id: "wrong-cart-item",
                domain_id: "domain-2",
                cart_id: "cart-1",
                product_id: "product-2",
                variant_id: "variant-1",
                quantity: 1,
                product_name: "Book",
                product_slug: "book",
                product_image_url: product.image_url,
                product_price: 1200,
                variant_name: "Default",
                ...timestamps,
            })
        ).rejects.toMatchObject({ cause: { code: "23503" } })
    })

    it("keeps checkout keys unique and order item snapshots independent of catalog rows", async () => {
        await seed_tenant()
        const order = {
            id: "order-1",
            domain_id: "domain-1",
            cart_id: "archived-cart",
            session_id: "checkout-session",
            checkout_key: "archived-cart:123",
            email: "ada@example.com",
            status: "pending",
            total_price: 1200,
            currency: "USD",
            shipping_address: {
                firstName: "Ada",
                lastName: "Reader",
                line1: "1 Main Street",
                city: "Town",
                province: "Region",
                country: "US",
                postal: "12345",
            },
            ...timestamps,
        } satisfies typeof schema.orders.$inferInsert
        await database.insert(schema.orders).values(order)
        await database.insert(schema.order_items).values({
            id: "order-item-1",
            domain_id: "domain-1",
            order_id: "order-1",
            product_id: "catalog-product-no-longer-present",
            variant_id: "catalog-variant-no-longer-present",
            quantity: 1,
            product_name: "Book",
            product_slug: "book",
            product_image_url: "https://example.com/book.png",
            product_price: 1200,
            variant_name: "Default",
            created_at: now,
        })
        await expect(
            database.insert(schema.orders).values({ ...order, id: "order-2" })
        ).rejects.toMatchObject({ cause: { code: "23505" } })
        await expect(
            database.insert(schema.orders).values({
                ...order,
                id: "order-negative",
                checkout_key: "other-key",
                total_price: -1,
            })
        ).rejects.toMatchObject({ cause: { code: "23514" } })
    })

    it("keeps payment attempts domain-bound and Stripe events unique", async () => {
        await seed_tenant()
        await database.insert(schema.domains).values({
            id: "domain-2",
            organization_id: "org-1",
            created_by_user_id: "user-1",
            name: "Other",
            slug: "other",
            publication_status: "draft",
            publication_access: "public",
            ...timestamps,
        })
        await database.insert(schema.orders).values({
            id: "order-1",
            domain_id: "domain-1",
            cart_id: "cart-1",
            session_id: "session-1",
            checkout_key: "cart-1:1",
            email: "ada@example.com",
            status: "pending",
            total_price: 1200,
            currency: "USD",
            shipping_address: {},
            ...timestamps,
        })
        const payment = {
            id: "payment-1",
            domain_id: "domain-1",
            order_id: "order-1",
            request_key: "initial",
            provider_idempotency_key: "shop:checkout:payment-1",
            amount: 1200,
            currency: "USD",
            ...timestamps,
        }
        await database.insert(schema.shop_payments).values(payment)
        await expect(
            database.insert(schema.shop_payments).values({
                ...payment,
                id: "payment-2",
                domain_id: "domain-2",
                provider_idempotency_key: "shop:checkout:payment-2",
                request_key: "other",
            })
        ).rejects.toMatchObject({ cause: { code: "23503" } })
        await expect(
            database.insert(schema.shop_payments).values({
                ...payment,
                id: "payment-3",
            })
        ).rejects.toMatchObject({ cause: { code: "23505" } })
        await expect(
            database.insert(schema.shop_payments).values({
                ...payment,
                id: "payment-4",
                provider_idempotency_key: "shop:checkout:payment-4",
                request_key: "negative",
                amount: -1,
            })
        ).rejects.toMatchObject({ cause: { code: "23514" } })

        const event = {
            id: "evt_1",
            event_type: "checkout.session.completed",
            provider_object_id: "cs_1",
            payload_sha256: "a".repeat(64),
            domain_id: "domain-1",
            payment_id: "payment-1",
            occurred_at: now,
            received_at: now,
        }
        await database.insert(schema.shop_payment_events).values(event)
        await expect(
            database.insert(schema.shop_payment_events).values({
                ...event,
                event_type: "payment_intent.succeeded",
            })
        ).rejects.toMatchObject({ cause: { code: "23505" } })
        await expect(
            database.insert(schema.shop_payment_events).values({
                ...event,
                id: "evt_2",
                domain_id: "domain-2",
            })
        ).rejects.toMatchObject({ cause: { code: "23503" } })
        await expect(
            database.insert(schema.shop_payment_events).values({
                ...event,
                id: "evt_3",
                status: "applied",
            })
        ).rejects.toMatchObject({ cause: { code: "23514" } })
        await expect(
            database
                .delete(schema.domains)
                .where(eq(schema.domains.id, "domain-1"))
        ).rejects.toMatchObject({ cause: { code: "23001" } })
    })

    it("keeps legacy storefront customers and checkout links within one domain", async () => {
        await seed_tenant()
        await database.insert(schema.domains).values({
            id: "domain-2",
            organization_id: "org-1",
            created_by_user_id: "user-1",
            name: "Other",
            slug: "other",
            publication_status: "draft",
            publication_access: "public",
            ...timestamps,
        })
        const customer = {
            id: "customer-1",
            domain_id: "domain-1",
            email: "ada@example.com",
            ...timestamps,
        }
        await database.insert(schema.shop_customers).values(customer)
        await expect(
            database.insert(schema.shop_customers).values({
                ...customer,
                id: "customer-duplicate",
            })
        ).rejects.toMatchObject({ cause: { code: "23505" } })
        await database.insert(schema.shop_customers).values({
            ...customer,
            id: "customer-2",
            domain_id: "domain-2",
        })
        await expect(
            database.insert(schema.carts).values({
                id: "cross-domain-cart",
                domain_id: "domain-2",
                session_id: "session-2",
                customer_id: "customer-1",
                currency: "USD",
                ...timestamps,
            })
        ).rejects.toMatchObject({ cause: { code: "23503" } })
        await expect(
            database.insert(schema.carts).values({
                id: "invalid-abandonment",
                domain_id: "domain-1",
                session_id: "session-3",
                currency: "USD",
                is_abandoned: true,
                ...timestamps,
            })
        ).rejects.toMatchObject({ cause: { code: "23514" } })
        await expect(
            database.insert(schema.orders).values({
                id: "cross-domain-order",
                domain_id: "domain-2",
                cart_id: "cart-2",
                session_id: "session-2",
                checkout_key: "cart-2:123",
                email: "ada@example.com",
                customer_id: "customer-1",
                status: "pending",
                total_price: 100,
                currency: "USD",
                shipping_address: {},
                ...timestamps,
            })
        ).rejects.toMatchObject({ cause: { code: "23503" } })
    })

    it("rejects invalid legacy prices and preserves cart preferences", async () => {
        await seed_tenant()
        const product = {
            id: "product-1",
            domain_id: "domain-1",
            name: "Book",
            slug: "book",
            price: 1200,
            image_url: "https://example.com/book.png",
            is_active: true,
            is_featured: false,
            ...timestamps,
        }
        await expect(
            database
                .insert(schema.products)
                .values({ ...product, discount: 1300 })
        ).rejects.toMatchObject({ cause: { code: "23514" } })
        await database
            .insert(schema.products)
            .values({ ...product, discount: 100 })
        const variant = {
            id: "variant-1",
            domain_id: "domain-1",
            product_id: "product-1",
            name: "Hardback",
            price: 1200,
            currency: "USD",
            stock: 5,
            is_active: true,
            options: { binding: "hardback" },
            ...timestamps,
        }
        await expect(
            database.insert(schema.product_variants).values({
                ...variant,
                price_override: -1,
            })
        ).rejects.toMatchObject({ cause: { code: "23514" } })
        await database.insert(schema.product_variants).values(variant)
        await database.insert(schema.carts).values({
            id: "cart-1",
            domain_id: "domain-1",
            session_id: "session-1",
            currency: "USD",
            ...timestamps,
        })
        await database.insert(schema.cart_items).values({
            id: "item-1",
            domain_id: "domain-1",
            cart_id: "cart-1",
            product_id: "product-1",
            variant_id: "variant-1",
            quantity: 1,
            product_name: "Book",
            product_slug: "book",
            product_image_url: product.image_url,
            product_price: 1100,
            variant_name: "Hardback",
            variant_options: { binding: "hardback" },
            is_selected: false,
            note: "Gift wrap",
            ...timestamps,
        })
        const items = await database.select().from(schema.cart_items)
        expect(items[0]).toMatchObject({
            variant_options: { binding: "hardback" },
            is_selected: false,
            note: "Gift wrap",
        })
        await expect(
            database.update(schema.cart_items).set({ note: "x".repeat(501) })
        ).rejects.toMatchObject({ cause: { code: "23514" } })
    })

    it("keeps identity separate from contacts and round-trips epoch milliseconds through relations", async () => {
        await seed_tenant()
        await seed_contact()
        await database.insert(schema.domain_contacts).values({
            id: "domain-contact-1",
            domain_id: "domain-1",
            contact_id: "contact-1",
            status: "active",
            ...timestamps,
        })
        const contacts = await database.query.contacts.findMany({
            with: {
                email_addresses: true,
                domains: { with: { domain: true } },
            },
        })
        expect(contacts).toMatchObject([
            {
                id: "contact-1",
                created_at: now,
                email_addresses: [
                    { email: "ada@example.com", is_primary: true },
                ],
                domains: [
                    {
                        domain: {
                            organization_id: "org-1",
                            created_by_user_id: "user-1",
                        },
                    },
                ],
            },
        ])
        await expect(
            database.insert(schema.organization_members).values({
                id: "bad-member",
                organization_id: "org-1",
                user_id: "contact-1",
                role: "member",
                status: "active",
                ...timestamps,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23503",
                constraint: "organization_members_user_id_users_id_fkey",
            },
        })
        await expect(
            database.insert(schema.auth_sessions).values({
                id: "bad-session",
                provider_session_id: "session-bad",
                user_id: "contact-1",
                created_at: now,
                last_seen_at: now,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23503",
                constraint: "auth_sessions_user_id_users_id_fkey",
            },
        })
    })

    it("rejects duplicate provider identities and session IDs while allowing users without claims", async () => {
        await seed_tenant()
        await database.insert(schema.users).values([
            { id: "unclaimed-1", ...timestamps },
            { id: "unclaimed-2", ...timestamps },
        ])
        await expect(
            database.insert(schema.users).values({
                id: "duplicate-token",
                token_identifier: "issuer|user-1",
                ...timestamps,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23505",
                constraint: "users_token_identifier_unique",
            },
        })
        await expect(
            database.insert(schema.users).values({
                id: "duplicate-subject",
                auth_provider: "workos",
                provider_subject: "workos-user-1",
                ...timestamps,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23505",
                constraint: "users_auth_provider_subject_unique",
            },
        })
        await database.insert(schema.auth_sessions).values({
            id: "session-1",
            provider_session_id: "workos-session-1",
            user_id: "user-1",
            created_at: now,
            last_seen_at: now,
        })
        await expect(
            database.insert(schema.auth_sessions).values({
                id: "session-2",
                provider_session_id: "workos-session-1",
                user_id: "unclaimed-1",
                created_at: now,
                last_seen_at: now,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23505",
                constraint: "auth_sessions_provider_session_unique",
            },
        })
    })

    it("enforces membership uniqueness and retains soft-deleted link identities", async () => {
        await seed_tenant()
        await database
            .update(schema.organization_members)
            .set({ deleted_at: now })
            .where(eq(schema.organization_members.id, "membership-1"))
        await expect(
            database.insert(schema.organization_members).values({
                id: "membership-2",
                organization_id: "org-1",
                user_id: "user-1",
                role: "member",
                status: "active",
                ...timestamps,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23505",
                constraint: "organization_members_organization_user_unique",
            },
        })
        await seed_contact()
        await database.insert(schema.domain_contacts).values({
            id: "link-1",
            domain_id: "domain-1",
            contact_id: "contact-1",
            status: "archived",
            deleted_at: now,
            ...timestamps,
        })
        await expect(
            database.insert(schema.domain_contacts).values({
                id: "link-2",
                domain_id: "domain-1",
                contact_id: "contact-1",
                status: "active",
                ...timestamps,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23505",
                constraint: "domain_contacts_domain_contact_unique",
            },
        })
    })

    it("requires existing tenant parents and reserves slugs without making display names unique", async () => {
        await seed_tenant()
        await database.insert(schema.domains).values({
            id: "domain-2",
            organization_id: "org-1",
            created_by_user_id: "user-1",
            name: "Acme",
            slug: "acme-two",
            publication_status: "draft",
            publication_access: "public",
            updated_at: now,
        })
        await expect(
            database.insert(schema.domains).values({
                id: "domain-3",
                organization_id: "missing-org",
                created_by_user_id: "user-1",
                name: "Other",
                slug: "other",
                publication_status: "draft",
                publication_access: "public",
                updated_at: now,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23503",
                constraint: "domains_organization_id_organizations_id_fkey",
            },
        })
        await expect(
            database.insert(schema.domains).values({
                id: "domain-4",
                organization_id: "org-1",
                created_by_user_id: "user-1",
                name: "Other",
                slug: "acme",
                publication_status: "draft",
                publication_access: "public",
                updated_at: now,
            })
        ).rejects.toMatchObject({
            cause: { code: "23505", constraint: "domains_slug_unique" },
        })
        await expect(
            database
                .delete(schema.organizations)
                .where(eq(schema.organizations.id, "org-1"))
        ).rejects.toMatchObject({
            cause: {
                code: "23001",
                constraint: "domains_organization_id_organizations_id_fkey",
            },
        })
        await expect(
            database.delete(schema.users).where(eq(schema.users.id, "user-1"))
        ).rejects.toMatchObject({
            cause: {
                code: "23001",
                constraint: "domains_created_by_user_id_users_id_fkey",
            },
        })
    })

    it("distinguishes unspecified modules from an explicitly empty module list", async () => {
        await seed_tenant()
        const initial = await database.select().from(schema.domains)
        expect(initial[0]?.enabled_modules).toBeNull()
        await database.update(schema.domains).set({ enabled_modules: [] })
        const disabled = await database.select().from(schema.domains)
        expect(disabled[0]?.enabled_modules).toEqual([])
        await expect(
            pg.query(
                "UPDATE domains SET enabled_modules = ARRAY['Unknown']::module_id[]"
            )
        ).rejects.toMatchObject({ code: "22P02" })
    })

    it("supports multiple contact emails with one primary and globally unique normalized addresses", async () => {
        await seed_contact()
        await database
            .insert(schema.contacts)
            .values({ id: "contact-2", name: "Grace", ...timestamps })
        await database.insert(schema.contact_email_addresses).values({
            id: "email-2",
            contact_id: "contact-1",
            email: "ada@work.example",
            is_primary: false,
            verified_at: now,
            ...timestamps,
        })
        await expect(
            database.insert(schema.contact_email_addresses).values({
                id: "duplicate-address",
                contact_id: "contact-2",
                email: "ada@example.com",
                is_primary: true,
                ...timestamps,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23505",
                constraint: "contact_email_addresses_email_unique",
            },
        })
        await expect(
            database.insert(schema.contact_email_addresses).values({
                id: "second-primary",
                contact_id: "contact-1",
                email: "another@example.com",
                is_primary: true,
                ...timestamps,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23505",
                constraint: "contact_email_addresses_primary_unique",
            },
        })
        await expect(
            database.insert(schema.contact_email_addresses).values({
                id: "unnormalized",
                contact_id: "contact-2",
                email: " Ada@Example.com ",
                is_primary: true,
                ...timestamps,
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23514",
                constraint: "contact_email_addresses_email_normalized",
            },
        })
        await database.transaction(async (transaction) => {
            await transaction
                .update(schema.contact_email_addresses)
                .set({ is_primary: false })
                .where(eq(schema.contact_email_addresses.id, "email-1"))
            await transaction
                .update(schema.contact_email_addresses)
                .set({ is_primary: true })
                .where(eq(schema.contact_email_addresses.id, "email-2"))
        })
        const primary = await database
            .select()
            .from(schema.contact_email_addresses)
            .where(eq(schema.contact_email_addresses.is_primary, true))
        expect(primary).toMatchObject([
            { email: "ada@work.example", verified_at: now },
        ])
        await database
            .delete(schema.contacts)
            .where(eq(schema.contacts.id, "contact-1"))
        expect(
            await database.select().from(schema.contact_email_addresses)
        ).toEqual([])
    })

    it("validates invitation hashes and supports renewal history for the same email", async () => {
        await seed_tenant()
        const invitation = {
            organization_id: "org-1",
            email: "invitee@example.com",
            invited_by_user_id: "user-1",
            expires_at: now + 60_000,
            ...timestamps,
        }
        await database.insert(schema.organization_invitations).values({
            ...invitation,
            id: "invite-1",
            role: "sysadmin",
            token_hash: "a".repeat(64),
            revoked_at: now,
        })
        await database.insert(schema.organization_invitations).values({
            ...invitation,
            id: "invite-2",
            role: "member",
            token_hash: "b".repeat(64),
        })
        await expect(
            database.insert(schema.organization_invitations).values({
                ...invitation,
                id: "invite-3",
                role: "member",
                token_hash: "a".repeat(64),
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23505",
                constraint: "organization_invitations_token_hash_unique",
            },
        })
        await expect(
            database.insert(schema.organization_invitations).values({
                ...invitation,
                id: "invite-4",
                role: "member",
                token_hash: "not-a-sha256-hash",
            })
        ).rejects.toMatchObject({
            cause: {
                code: "23514",
                constraint: "organization_invitations_token_hash_format",
            },
        })
        await expect(
            database.update(schema.organizations).set({ max_domains: 0 })
        ).rejects.toMatchObject({
            cause: {
                code: "23514",
                constraint: "organizations_max_domains_positive",
            },
        })
    })
})
