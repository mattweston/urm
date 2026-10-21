import { sql } from "drizzle-orm"
import {
    bigint,
    boolean,
    check,
    foreignKey,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { contacts } from "./contacts.ts"
import { domains } from "./domains.ts"

const timestamp = (name: string) => bigint(name, { mode: "number" }).notNull()

export const shop_order_status = pgEnum("shop_order_status", [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
])
export const shop_fulfillment_status = pgEnum("shop_fulfillment_status", [
    "unfulfilled",
    "partial",
    "fulfilled",
    "cancelled",
])
export const shop_payment_status = pgEnum("shop_payment_status", [
    "reserved",
    "checkout_open",
    "processing",
    "succeeded",
    "failed",
    "cancelled",
    "refunded",
])
export const shop_payment_event_status = pgEnum("shop_payment_event_status", [
    "pending",
    "applied",
    "ignored",
])

export const products = pgTable(
    "products",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        slug: text("slug").notNull(),
        legacy_external_id: text("legacy_external_id"),
        tagline: text("tagline"),
        description: text("description"),
        price: integer("price").notNull(),
        discount: integer("discount").notNull().default(0),
        image_url: text("image_url").notNull(),
        images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
        image_id: text("image_id"),
        is_active: boolean("is_active").notNull(),
        is_featured: boolean("is_featured").notNull(),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (t) => [
        uniqueIndex("products_domain_id_unique").on(t.domain_id, t.id),
        uniqueIndex("products_domain_slug_unique").on(t.domain_id, t.slug),
        uniqueIndex("products_domain_legacy_id_unique").on(
            t.domain_id,
            t.legacy_external_id
        ),
        index("products_domain_updated_idx").on(
            t.domain_id,
            t.updated_at,
            t.id
        ),
        check("products_price_nonnegative", sql`${t.price} >= 0`),
        check(
            "products_discount_range",
            sql`${t.discount} BETWEEN 0 AND ${t.price}`
        ),
        check(
            "products_slug_format",
            sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`
        ),
    ]
)

export const product_variants = pgTable(
    "product_variants",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        product_id: text("product_id").notNull(),
        legacy_external_id: text("legacy_external_id"),
        name: text("name").notNull(),
        description: text("description"),
        sku: text("sku"),
        price: integer("price").notNull(),
        price_override: integer("price_override"),
        options: jsonb("options").notNull().default(sql`'{}'::jsonb`),
        currency: text("currency").notNull(),
        stock: integer("stock").notNull(),
        is_active: boolean("is_active").notNull(),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        uniqueIndex("product_variants_domain_product_id_unique").on(
            t.domain_id,
            t.product_id,
            t.id
        ),
        uniqueIndex("product_variants_domain_legacy_id_unique").on(
            t.domain_id,
            t.legacy_external_id
        ),
        foreignKey({
            columns: [t.domain_id, t.product_id],
            foreignColumns: [products.domain_id, products.id],
        }).onDelete("cascade"),
        index("product_variants_domain_updated_idx").on(
            t.domain_id,
            t.updated_at,
            t.id
        ),
        index("product_variants_product_updated_idx").on(
            t.product_id,
            t.updated_at,
            t.id
        ),
        check("product_variants_price_nonnegative", sql`${t.price} >= 0`),
        check(
            "product_variants_price_override_nonnegative",
            sql`${t.price_override} IS NULL OR ${t.price_override} >= 0`
        ),
        check("product_variants_stock_nonnegative", sql`${t.stock} >= 0`),
        check(
            "product_variants_currency_format",
            sql`${t.currency} ~ '^[A-Z]{3}$'`
        ),
    ]
)

export const product_collections = pgTable(
    "product_collections",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        slug: text("slug").notNull(),
        legacy_external_id: text("legacy_external_id"),
        description: text("description"),
        image_url: text("image_url"),
        is_active: boolean("is_active").notNull(),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (t) => [
        uniqueIndex("product_collections_domain_id_unique").on(
            t.domain_id,
            t.id
        ),
        uniqueIndex("product_collections_domain_slug_unique").on(
            t.domain_id,
            t.slug
        ),
        uniqueIndex("product_collections_domain_legacy_id_unique").on(
            t.domain_id,
            t.legacy_external_id
        ),
        index("product_collections_domain_updated_idx").on(
            t.domain_id,
            t.updated_at,
            t.id
        ),
        check(
            "product_collections_slug_format",
            sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`
        ),
    ]
)

export const shop_customers = pgTable(
    "shop_customers",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        legacy_external_id: text("legacy_external_id"),
        email: text("email").notNull(),
        first_name: text("first_name"),
        last_name: text("last_name"),
        phone: text("phone"),
        stripe_customer_id: text("stripe_customer_id"),
        is_active: boolean("is_active").notNull().default(true),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (t) => [
        uniqueIndex("shop_customers_domain_id_unique").on(t.domain_id, t.id),
        uniqueIndex("shop_customers_domain_email_unique").on(
            t.domain_id,
            t.email
        ),
        uniqueIndex("shop_customers_domain_legacy_id_unique").on(
            t.domain_id,
            t.legacy_external_id
        ),
        uniqueIndex("shop_customers_domain_stripe_id_unique").on(
            t.domain_id,
            t.stripe_customer_id
        ),
        check(
            "shop_customers_email_normalized",
            sql`${t.email} = lower(trim(${t.email}))`
        ),
    ]
)

export const product_collection_memberships = pgTable(
    "product_collection_memberships",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        product_id: text("product_id").notNull(),
        collection_id: text("collection_id").notNull(),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        uniqueIndex("product_collection_memberships_pair_unique").on(
            t.product_id,
            t.collection_id
        ),
        foreignKey({
            columns: [t.domain_id, t.product_id],
            foreignColumns: [products.domain_id, products.id],
        }).onDelete("cascade"),
        foreignKey({
            columns: [t.domain_id, t.collection_id],
            foreignColumns: [
                product_collections.domain_id,
                product_collections.id,
            ],
        }).onDelete("cascade"),
        index("product_collection_memberships_domain_updated_idx").on(
            t.domain_id,
            t.updated_at,
            t.id
        ),
        index("product_collection_memberships_collection_updated_idx").on(
            t.collection_id,
            t.updated_at,
            t.id
        ),
    ]
)

export const carts = pgTable(
    "carts",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        session_id: text("session_id").notNull(),
        contact_id: text("contact_id").references(() => contacts.id, {
            onDelete: "set null",
        }),
        customer_id: text("customer_id"),
        currency: text("currency").notNull(),
        is_abandoned: boolean("is_abandoned").notNull().default(false),
        abandoned_at: bigint("abandoned_at", { mode: "number" }),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        uniqueIndex("carts_domain_id_unique").on(t.domain_id, t.id),
        uniqueIndex("carts_domain_session_unique").on(
            t.domain_id,
            t.session_id
        ),
        foreignKey({
            columns: [t.domain_id, t.customer_id],
            foreignColumns: [shop_customers.domain_id, shop_customers.id],
        }),
        index("carts_contact_updated_idx").on(t.contact_id, t.updated_at, t.id),
        check("carts_currency_format", sql`${t.currency} ~ '^[A-Z]{3}$'`),
        check(
            "carts_abandoned_consistent",
            sql`${t.is_abandoned} = (${t.abandoned_at} IS NOT NULL)`
        ),
    ]
)

export const cart_items = pgTable(
    "cart_items",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        cart_id: text("cart_id").notNull(),
        product_id: text("product_id").notNull(),
        variant_id: text("variant_id").notNull(),
        quantity: integer("quantity").notNull(),
        product_name: text("product_name").notNull(),
        product_slug: text("product_slug").notNull(),
        product_image_url: text("product_image_url").notNull(),
        product_price: integer("product_price").notNull(),
        variant_name: text("variant_name").notNull(),
        variant_options: jsonb("variant_options")
            .notNull()
            .default(sql`'{}'::jsonb`),
        is_selected: boolean("is_selected").notNull().default(true),
        note: text("note"),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        uniqueIndex("cart_items_cart_variant_unique").on(
            t.cart_id,
            t.variant_id
        ),
        foreignKey({
            columns: [t.domain_id, t.cart_id],
            foreignColumns: [carts.domain_id, carts.id],
        }).onDelete("cascade"),
        foreignKey({
            columns: [t.domain_id, t.product_id, t.variant_id],
            foreignColumns: [
                product_variants.domain_id,
                product_variants.product_id,
                product_variants.id,
            ],
        }),
        index("cart_items_cart_updated_idx").on(t.cart_id, t.updated_at, t.id),
        index("cart_items_domain_updated_idx").on(
            t.domain_id,
            t.updated_at,
            t.id
        ),
        check("cart_items_quantity_range", sql`${t.quantity} BETWEEN 1 AND 20`),
        check("cart_items_price_nonnegative", sql`${t.product_price} >= 0`),
        check(
            "cart_items_note_length",
            sql`${t.note} IS NULL OR length(${t.note}) <= 500`
        ),
    ]
)

export const orders = pgTable(
    "orders",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        cart_id: text("cart_id").notNull(),
        session_id: text("session_id").notNull(),
        checkout_key: text("checkout_key").notNull(),
        email: text("email").notNull(),
        legacy_external_id: text("legacy_external_id"),
        number: integer("number"),
        customer_id: text("customer_id"),
        status: shop_order_status("status").notNull(),
        total_price: integer("total_price").notNull(),
        subtotal: integer("subtotal"),
        tax_amount: integer("tax_amount").notNull().default(0),
        shipping_amount: integer("shipping_amount").notNull().default(0),
        discount_amount: integer("discount_amount").notNull().default(0),
        currency: text("currency").notNull(),
        billing_address: jsonb("billing_address"),
        shipping_address: jsonb("shipping_address").notNull(),
        stripe_checkout_session_id: text("stripe_checkout_session_id"),
        stripe_payment_intent_id: text("stripe_payment_intent_id"),
        stripe_charge_id: text("stripe_charge_id"),
        shipping_tracking_number: text("shipping_tracking_number"),
        shipping_carrier: text("shipping_carrier"),
        shipped_at: bigint("shipped_at", { mode: "number" }),
        delivered_at: bigint("delivered_at", { mode: "number" }),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (t) => [
        uniqueIndex("orders_domain_id_unique").on(t.domain_id, t.id),
        uniqueIndex("orders_domain_checkout_key_unique").on(
            t.domain_id,
            t.checkout_key
        ),
        uniqueIndex("orders_domain_legacy_id_unique").on(
            t.domain_id,
            t.legacy_external_id
        ),
        uniqueIndex("orders_domain_number_unique").on(t.domain_id, t.number),
        uniqueIndex("orders_domain_stripe_checkout_unique").on(
            t.domain_id,
            t.stripe_checkout_session_id
        ),
        foreignKey({
            columns: [t.domain_id, t.customer_id],
            foreignColumns: [shop_customers.domain_id, shop_customers.id],
        }),
        index("orders_domain_updated_idx").on(t.domain_id, t.updated_at, t.id),
        index("orders_domain_session_updated_idx").on(
            t.domain_id,
            t.session_id,
            t.updated_at,
            t.id
        ),
        check("orders_total_nonnegative", sql`${t.total_price} >= 0`),
        check(
            "orders_amounts_nonnegative",
            sql`(${t.subtotal} IS NULL OR ${t.subtotal} >= 0) AND ${t.tax_amount} >= 0 AND ${t.shipping_amount} >= 0 AND ${t.discount_amount} >= 0`
        ),
        check("orders_currency_format", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    ]
)

export const order_items = pgTable(
    "order_items",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        order_id: text("order_id").notNull(),
        product_id: text("product_id").notNull(),
        variant_id: text("variant_id").notNull(),
        quantity: integer("quantity").notNull(),
        product_name: text("product_name").notNull(),
        product_slug: text("product_slug").notNull(),
        product_image_url: text("product_image_url").notNull(),
        product_price: integer("product_price").notNull(),
        variant_name: text("variant_name").notNull(),
        variant_options: jsonb("variant_options")
            .notNull()
            .default(sql`'{}'::jsonb`),
        fulfillment_status: shop_fulfillment_status("fulfillment_status")
            .notNull()
            .default("unfulfilled"),
        created_at: timestamp("created_at"),
    },
    (t) => [
        foreignKey({
            columns: [t.domain_id, t.order_id],
            foreignColumns: [orders.domain_id, orders.id],
        }),
        index("order_items_order_id_idx").on(t.order_id, t.id),
        check(
            "order_items_quantity_range",
            sql`${t.quantity} BETWEEN 1 AND 20`
        ),
        check("order_items_price_nonnegative", sql`${t.product_price} >= 0`),
    ]
)

export const shop_payments = pgTable(
    "shop_payments",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "restrict" }),
        order_id: text("order_id").notNull(),
        provider: text("provider").notNull().default("stripe"),
        request_key: text("request_key").notNull(),
        provider_idempotency_key: text("provider_idempotency_key").notNull(),
        stripe_checkout_session_id: text("stripe_checkout_session_id"),
        stripe_payment_intent_id: text("stripe_payment_intent_id"),
        status: shop_payment_status("status").notNull().default("reserved"),
        amount: integer("amount").notNull(),
        currency: text("currency").notNull(),
        last_provider_event_at: bigint("last_provider_event_at", {
            mode: "number",
        }),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        uniqueIndex("shop_payments_domain_id_unique").on(t.domain_id, t.id),
        uniqueIndex("shop_payments_domain_order_request_unique").on(
            t.domain_id,
            t.order_id,
            t.request_key
        ),
        uniqueIndex("shop_payments_provider_idempotency_unique").on(
            t.provider,
            t.provider_idempotency_key
        ),
        uniqueIndex("shop_payments_provider_checkout_unique").on(
            t.provider,
            t.stripe_checkout_session_id
        ),
        uniqueIndex("shop_payments_provider_intent_unique").on(
            t.provider,
            t.stripe_payment_intent_id
        ),
        index("shop_payments_domain_order_created_idx").on(
            t.domain_id,
            t.order_id,
            t.created_at
        ),
        foreignKey({
            columns: [t.domain_id, t.order_id],
            foreignColumns: [orders.domain_id, orders.id],
        }),
        check("shop_payments_provider_check", sql`${t.provider} = 'stripe'`),
        check("shop_payments_amount_positive", sql`${t.amount} > 0`),
        check(
            "shop_payments_currency_format",
            sql`${t.currency} ~ '^[A-Z]{3}$'`
        ),
        check(
            "shop_payments_request_key_nonempty",
            sql`length(${t.request_key}) BETWEEN 1 AND 255`
        ),
        check(
            "shop_payments_idempotency_nonempty",
            sql`length(${t.provider_idempotency_key}) BETWEEN 1 AND 255`
        ),
    ]
)

export const shop_payment_events = pgTable(
    "shop_payment_events",
    {
        id: text("id").primaryKey(),
        provider: text("provider").notNull().default("stripe"),
        event_type: text("event_type").notNull(),
        provider_object_id: text("provider_object_id").notNull(),
        payload_sha256: text("payload_sha256").notNull(),
        domain_id: text("domain_id"),
        payment_id: text("payment_id"),
        status: shop_payment_event_status("status")
            .notNull()
            .default("pending"),
        occurred_at: timestamp("occurred_at"),
        received_at: timestamp("received_at"),
        applied_at: bigint("applied_at", { mode: "number" }),
    },
    (t) => [
        index("shop_payment_events_provider_object_idx").on(
            t.provider,
            t.provider_object_id,
            t.occurred_at
        ),
        index("shop_payment_events_payment_occurred_idx").on(
            t.domain_id,
            t.payment_id,
            t.occurred_at
        ),
        foreignKey({
            columns: [t.domain_id, t.payment_id],
            foreignColumns: [shop_payments.domain_id, shop_payments.id],
        }),
        check(
            "shop_payment_events_provider_check",
            sql`${t.provider} = 'stripe'`
        ),
        check(
            "shop_payment_events_hash_format",
            sql`${t.payload_sha256} ~ '^[a-f0-9]{64}$'`
        ),
        check(
            "shop_payment_events_link_consistent",
            sql`(${t.domain_id} IS NULL) = (${t.payment_id} IS NULL)`
        ),
        check(
            "shop_payment_events_status_consistent",
            sql`(${t.status} = 'pending') = (${t.applied_at} IS NULL)`
        ),
    ]
)
