import { pgSchema, pgTable, text, varchar, integer, jsonb, bigint, boolean, timestamp, json, char, doublePrecision, interval, index, foreignKey, primaryKey, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const zero = pgSchema("zero");
export const zero0 = pgSchema("zero_0");
export const zero0Cdc = pgSchema("zero_0/cdc");
export const zero0Cvr = pgSchema("zero_0/cvr");

export const cartItems = pgTable("cartItems", {
id: varchar({ length: 255 }).primaryKey(),
cartId: varchar("cart_id", { length: 255 }).notNull(),
productId: varchar("product_id", { length: 255 }).notNull(),
productVariantId: varchar("product_variant_id", { length: 255 }).notNull(),
quantity: integer().notNull(),
productName: varchar("product_name", { length: 255 }).notNull(),
productSlug: varchar("product_slug", { length: 255 }).notNull(),
productImageUrl: varchar("product_image_url", { length: 255 }).notNull(),
productPrice: integer("product_price").notNull(),
variantName: varchar("variant_name", { length: 255 }).notNull(),
variantOptions: text("variant_options"),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const carts = pgTable("carts", {
id: varchar({ length: 255 }).primaryKey(),
sessionId: varchar("session_id", { length: 255 }),
customerId: varchar("customer_id", { length: 255 }),
currency: varchar({ length: 255 }).notNull(),
isAbandoned: boolean("is_abandoned"),
abandonedAt: bigint("abandoned_at", { mode: 'number' }),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const collections = pgTable("collections", {
id: varchar({ length: 255 }).primaryKey(),
name: varchar({ length: 255 }).notNull(),
slug: varchar({ length: 255 }).notNull(),
description: text(),
imageUrl: varchar("image_url", { length: 255 }),
isActive: boolean("is_active").notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
deletedAt: bigint("deleted_at", { mode: 'number' }),
});

export const comments = pgTable("comments", {
id: varchar().primaryKey(),
author: varchar().notNull(),
content: varchar().notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const contacts = pgTable("contacts", {
id: varchar().primaryKey(),
name: varchar().notNull(),
email: varchar(),
tel: varchar(),
title: varchar(),
company: varchar(),
userId: varchar("user_id").notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const csvData = pgTable("csvData", {
id: varchar().primaryKey(),
uploadId: varchar("upload_id").notNull(),
rowIndex: integer("row_index").notNull(),
data: varchar().notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const csvUploads = pgTable("csvUploads", {
id: varchar().primaryKey(),
filename: varchar().notNull(),
rowCount: integer("row_count").notNull(),
status: varchar().notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const customers = pgTable("customers", {
id: varchar({ length: 255 }).primaryKey(),
email: varchar({ length: 255 }).notNull(),
firstName: varchar("first_name", { length: 255 }),
lastName: varchar("last_name", { length: 255 }),
phone: varchar({ length: 255 }),
stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
isActive: boolean("is_active").notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
deletedAt: bigint("deleted_at", { mode: 'number' }),
});

export const documents = pgTable("documents", {
id: varchar({ length: 255 }).primaryKey(),
title: varchar({ length: 255 }).notNull(),
content: text().notNull(),
contentType: varchar("content_type", { length: 255 }).notNull(),
slug: varchar({ length: 255 }),
published: boolean().default(false).notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
}, (table) => [
index("idx_documents_content_type").using("btree", table.contentType.asc().nullsLast()),
index("idx_documents_published").using("btree", table.published.asc().nullsLast()),
index("idx_documents_slug").using("btree", table.slug.asc().nullsLast()).where(sql`(slug IS NOT NULL)`),
]);

export const emailNotifications = pgTable("emailNotifications", {
id: varchar({ length: 255 }).primaryKey(),
emailId: varchar("email_id", { length: 255 }).notNull(),
to: varchar({ length: 255 }).notNull(),
from: varchar({ length: 255 }).notNull(),
subject: varchar({ length: 255 }).notNull(),
type: varchar({ length: 255 }).notNull(),
orderId: varchar("order_id", { length: 255 }),
customerId: varchar("customer_id", { length: 255 }),
status: varchar({ length: 255 }).notNull(),
errorMessage: text("error_message"),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const entityTags = pgTable("entityTags", {
id: varchar().primaryKey(),
entityType: varchar("entity_type").notNull(),
entityId: varchar("entity_id").notNull(),
tagId: varchar("tag_id").notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
}, (table) => [
index("idx_entityTags_entity").using("btree", table.entityType.asc().nullsLast(), table.entityId.asc().nullsLast()),
index("idx_entityTags_tag").using("btree", table.tagId.asc().nullsLast()),
]);

export const events = pgTable("events", {
id: varchar({ length: 255 }).primaryKey(),
title: varchar({ length: 255 }).notNull(),
description: text(),
date: bigint({ mode: 'number' }).notNull(),
startTime: varchar("start_time", { length: 255 }).notNull(),
endTime: varchar("end_time", { length: 255 }),
venueName: varchar("venue_name", { length: 255 }).notNull(),
venueUrl: varchar("venue_url", { length: 255 }),
latitude: varchar({ length: 255 }).notNull(),
longitude: varchar({ length: 255 }).notNull(),
ticketsUrl: varchar("tickets_url", { length: 255 }),
imageUrl: varchar("image_url"),
published: boolean().notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const images = pgTable("images", {
id: varchar().primaryKey(),
url: varchar().notNull(),
alt: varchar().notNull(),
text: varchar().notNull(),
width: integer(),
height: integer(),
orderPosition: integer("order_position").notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
category: varchar(),
});

export const issue = pgTable("issue", {
id: varchar({ length: 255 }).primaryKey(),
title: varchar({ length: 255 }).notNull(),
description: text(),
content: text(),
status: varchar({ length: 255 }).notNull(),
priority: varchar({ length: 255 }),
labels: text(),
assigneeId: varchar("assignee_id", { length: 255 }),
orderPosition: integer("order_position").notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const issueLabel = pgTable("issueLabel", {
id: varchar({ length: 255 }).primaryKey(),
name: varchar({ length: 255 }).notNull(),
color: varchar({ length: 255 }).notNull(),
description: text(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
});

export const medium = pgTable("medium", {
id: varchar().primaryKey(),
name: varchar().notNull(),
});

export const members = pgTable("members", {
id: varchar().primaryKey(),
first: varchar().notNull(),
last: varchar().notNull(),
twitter: varchar(),
avatar: varchar(),
notes: text(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const menuItems = pgTable("menuItems", {
id: varchar({ length: 255 }).primaryKey(),
title: varchar({ length: 255 }).notNull(),
description: text(),
price: integer().notNull(),
category: varchar({ length: 255 }).notNull(),
imageUrl: varchar("image_url"),
dietaryLabels: text("dietary_labels"),
allergens: text(),
slug: varchar().notNull(),
content: text(),
published: boolean().notNull(),
orderPosition: integer("order_position").notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const message = pgTable("message", {
id: varchar().primaryKey(),
senderId: varchar("sender_id"),
mediumId: varchar("medium_id"),
body: varchar().notNull(),
timestamp: timestamp().notNull(),
});

export const orderItems = pgTable("orderItems", {
id: varchar({ length: 255 }).primaryKey(),
orderId: varchar("order_id", { length: 255 }).notNull(),
productId: varchar("product_id", { length: 255 }).notNull(),
productVariantId: varchar("product_variant_id", { length: 255 }).notNull(),
quantity: integer().notNull(),
unitPrice: integer("unit_price").notNull(),
totalPrice: integer("total_price").notNull(),
productName: varchar("product_name", { length: 255 }).notNull(),
productSlug: varchar("product_slug", { length: 255 }).notNull(),
productImageUrl: varchar("product_image_url", { length: 255 }).notNull(),
variantName: varchar("variant_name", { length: 255 }).notNull(),
variantOptions: text("variant_options"),
fulfillmentStatus: varchar("fulfillment_status", { length: 255 }).notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const orders = pgTable("orders", {
id: varchar({ length: 255 }).primaryKey(),
number: integer().notNull(),
customerId: varchar("customer_id", { length: 255 }),
customerEmail: varchar("customer_email", { length: 255 }).notNull(),
currency: varchar({ length: 255 }).notNull(),
subtotal: integer().notNull(),
taxAmount: integer("tax_amount"),
shippingAmount: integer("shipping_amount"),
discountAmount: integer("discount_amount"),
total: integer().notNull(),
billingAddress: text("billing_address"),
shippingAddress: text("shipping_address"),
status: varchar({ length: 255 }).notNull(),
stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
shippingTrackingNumber: varchar("shipping_tracking_number", { length: 255 }),
shippingCarrier: varchar("shipping_carrier", { length: 255 }),
shippedAt: bigint("shipped_at", { mode: 'number' }),
deliveredAt: bigint("delivered_at", { mode: 'number' }),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
deletedAt: bigint("deleted_at", { mode: 'number' }),
});

export const payments = pgTable("payments", {
id: varchar({ length: 255 }).primaryKey(),
text: varchar({ length: 255 }).notNull(),
stripeId: varchar("stripe_id", { length: 255 }),
stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
orderId: varchar("order_id", { length: 255 }),
messageId: varchar("message_id", { length: 255 }),
amount: integer(),
currency: varchar({ length: 255 }),
status: varchar({ length: 255 }).notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const preferences = pgTable("preferences", {
id: varchar().primaryKey(),
userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
theme: varchar().default("system").notNull(),
language: varchar().default("en").notNull(),
notifications: boolean().default(true).notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
}, (table) => [
index("idx_preferences_user_id").using("btree", table.userId.asc().nullsLast()),
]);

export const products = pgTable("products", {
id: varchar({ length: 255 }).primaryKey(),
name: varchar({ length: 255 }).notNull(),
slug: varchar({ length: 255 }).notNull(),
tagline: text(),
description: text(),
price: integer().notNull(),
discount: integer(),
imageUrl: varchar("image_url", { length: 255 }).notNull(),
images: text(),
collectionIds: text("collection_ids"),
isActive: boolean("is_active").notNull(),
isFeatured: boolean("is_featured"),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
deletedAt: bigint("deleted_at", { mode: 'number' }),
});

export const productVariants = pgTable("productVariants", {
id: varchar({ length: 255 }).primaryKey(),
productId: varchar("product_id", { length: 255 }).notNull(),
name: varchar({ length: 255 }).notNull(),
stock: integer().notNull(),
options: text(),
priceOverride: integer("price_override"),
isActive: boolean("is_active").notNull(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const tags = pgTable("tags", {
id: varchar().primaryKey(),
name: varchar().notNull(),
color: varchar().notNull(),
description: text(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
});

export const testEmails = pgTable("testEmails", {
id: varchar({ length: 255 }).primaryKey(),
email: varchar({ length: 255 }).notNull(),
expectation: varchar({ length: 255 }).notNull(),
});

export const todoList = pgTable("todoList", {
id: varchar({ length: 255 }).primaryKey(),
name: varchar({ length: 255 }).notNull(),
description: text(),
color: varchar({ length: 255 }),
isArchived: boolean("is_archived").default(false),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const todoListItems = pgTable("todoListItems", {
id: varchar({ length: 255 }).primaryKey(),
text: text().notNull(),
completed: boolean().notNull(),
status: varchar({ length: 255 }).notNull(),
listId: varchar("list_id", { length: 255 }).notNull(),
priority: varchar({ length: 255 }),
order: integer().notNull(),
userId: varchar("user_id", { length: 255 }),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const user = pgTable("user", {
id: varchar().primaryKey(),
name: varchar().notNull(),
partner: boolean().notNull(),
});

export const users = pgTable("users", {
id: varchar().primaryKey(),
email: varchar().notNull(),
name: varchar().notNull(),
emailVerified: boolean("email_verified").default(false).notNull(),
image: varchar(),
createdAt: bigint("created_at", { mode: 'number' }).notNull(),
updatedAt: bigint("updated_at", { mode: 'number' }).notNull(),
isTestUser: boolean("is_test_user").default(false).notNull(),
});

// export const permissionsInZero = zero.table("permissions", {
// permissions: jsonb(),
// hash: text(),
// lock: boolean().default(true).primaryKey(),
// }, (table) => [
// check("permissions_lock_check", sql`lock`),]);

// export const schemaVersionsInZero = zero.table("schemaVersions", {
// minSupportedVersion: integer(),
// maxSupportedVersion: integer(),
// lock: boolean().default(true).primaryKey(),
// }, (table) => [
// check("schemaVersions_lock_check", sql`lock`),]);

// export const clientsInZero0 = zero0.table("clients", {
// clientGroupID: text().notNull(),
// clientID: text().notNull(),
// lastMutationID: bigint({ mode: 'number' }).notNull(),
// userID: text(),
// }, (table) => [
// primaryKey({ columns: [table.clientGroupID, table.clientID], name: "clients_pkey"}),
// ]);

// export const mutationsInZero0 = zero0.table("mutations", {
// clientGroupID: text().notNull(),
// clientID: text().notNull(),
// mutationID: bigint({ mode: 'number' }).notNull(),
// result: json().notNull(),
// }, (table) => [
// primaryKey({ columns: [table.clientGroupID, table.clientID, table.mutationID], name: "mutations_pkey"}),
// ]);

// export const replicasInZero0 = zero0.table("replicas", {
// slot: text().primaryKey(),
// version: text().notNull(),
// initialSchema: json().notNull(),
// });

// export const shardConfigInZero0 = zero0.table("shardConfig", {
// publications: text().array().notNull(),
// ddlDetection: boolean().notNull(),
// lock: boolean().default(true).primaryKey(),
// }, (table) => [
// check("shardConfig_lock_check", sql`lock`),]);

// export const versionHistoryInZero0 = zero0.table("versionHistory", {
// dataVersion: integer().notNull(),
// schemaVersion: integer().notNull(),
// minSafeVersion: integer().notNull(),
// lock: char({ length: 1 }).default("v").primaryKey(),
// }, (table) => [
// check("ck_schema_meta_lock", sql`(lock = 'v'::bpchar)`),]);

// export const changeLogInZero0Cdc = zero0Cdc.table("changeLog", {
// watermark: text().notNull(),
// pos: bigint({ mode: 'number' }).notNull(),
// change: json().notNull(),
// precommit: text(),
// }, (table) => [
// primaryKey({ columns: [table.watermark, table.pos], name: "changeLog_pkey"}),
// ]);

// export const replicationConfigInZero0Cdc = zero0Cdc.table("replicationConfig", {
// replicaVersion: text().notNull(),
// publications: text().array().notNull(),
// resetRequired: boolean(),
// lock: integer().default(1).primaryKey(),
// }, (table) => [
// check("replicationConfig_lock_check", sql`(lock = 1)`),]);

// export const replicationStateInZero0Cdc = zero0Cdc.table("replicationState", {
// lastWatermark: text().notNull(),
// owner: text(),
// ownerAddress: text(),
// lock: integer().default(1).primaryKey(),
// }, (table) => [
// check("replicationState_lock_check", sql`(lock = 1)`),]);

// export const versionHistoryInZero0Cdc = zero0Cdc.table("versionHistory", {
// dataVersion: integer().notNull(),
// schemaVersion: integer().notNull(),
// minSafeVersion: integer().notNull(),
// lock: char({ length: 1 }).default("v").primaryKey(),
// }, (table) => [
// check("ck_schema_meta_lock", sql`(lock = 'v'::bpchar)`),]);

// export const clientsInZero0Cvr = zero0Cvr.table("clients", {
// clientGroupID: text().notNull().references(() => instancesInZero0Cvr.clientGroupID, { onDelete: "cascade" } ),
// clientID: text().notNull(),
// }, (table) => [
// primaryKey({ columns: [table.clientGroupID, table.clientID], name: "clients_pkey"}),
// ]);

// export const desiresInZero0Cvr = zero0Cvr.table("desires", {
// clientGroupID: text().notNull(),
// clientID: text().notNull(),
// queryHash: text().notNull(),
// patchVersion: text().notNull(),
// deleted: boolean(),
// ttl: interval(),
// ttlMs: doublePrecision(),
// inactivatedAt: timestamp({ withTimezone: true }),
// inactivatedAtMs: doublePrecision(),
// }, (table) => [
// primaryKey({ columns: [table.clientGroupID, table.clientID, table.queryHash], name: "desires_pkey"}),
// foreignKey({
// columns: [table.clientGroupID, table.queryHash],
// foreignColumns: [queriesInZero0Cvr.clientGroupID, queriesInZero0Cvr.queryHash],
// name: "fk_desires_query"
// }).onDelete("cascade"),
// index("desires_inactivated_at").using("btree", table.inactivatedAt.asc().nullsLast()),
// index("desires_patch_version").using("btree", table.patchVersion.asc().nullsLast()),
// ]);

// export const instancesInZero0Cvr = zero0Cvr.table("instances", {
// clientGroupID: text().primaryKey(),
// version: text().notNull(),
// lastActive: timestamp({ withTimezone: true }).notNull(),
// ttlClock: doublePrecision().default(0).notNull(),
// replicaVersion: text(),
// owner: text(),
// grantedAt: timestamp({ withTimezone: true }),
// clientSchema: jsonb(),
// profileID: text(),
// deleted: boolean().default(false),
// }, (table) => [
// index("instances_last_active").using("btree", table.lastActive.asc().nullsLast()).where(sql`(NOT deleted)`),
// index("profile_ids_last_active").using("btree", table.lastActive.asc().nullsLast(), table.profileID.asc().nullsLast()).where(sql`("profileID" IS NOT NULL)`),
// index("tombstones_last_active").using("btree", table.lastActive.asc().nullsLast()).where(sql`deleted`),
// ]);

// export const queriesInZero0Cvr = zero0Cvr.table("queries", {
// clientGroupID: text().notNull().references(() => instancesInZero0Cvr.clientGroupID, { onDelete: "cascade" } ),
// queryHash: text().notNull(),
// clientAST: jsonb(),
// queryName: text(),
// queryArgs: json(),
// patchVersion: text(),
// transformationHash: text(),
// transformationVersion: text(),
// internal: boolean(),
// deleted: boolean(),
// }, (table) => [
// primaryKey({ columns: [table.clientGroupID, table.queryHash], name: "queries_pkey"}),
// index("queries_patch_version").using("btree", table.patchVersion.asc().nullsFirst()),
// ]);

// export const rowsInZero0Cvr = zero0Cvr.table("rows", {
// clientGroupID: text().notNull().references(() => rowsVersionInZero0Cvr.clientGroupID, { onDelete: "cascade" } ),
// schema: text().notNull(),
// table: text().notNull(),
// rowKey: jsonb().notNull(),
// rowVersion: text().notNull(),
// patchVersion: text().notNull(),
// refCounts: jsonb(),
// }, (table) => [
// primaryKey({ columns: [table.clientGroupID, table.schema, table.table, table.rowKey], name: "rows_pkey"}),
// index("row_patch_version").using("btree", table.patchVersion.asc().nullsLast()),
// index("row_ref_counts").using("gin", table.refCounts.asc().nullsLast()),
// ]);

// export const rowsVersionInZero0Cvr = zero0Cvr.table("rowsVersion", {
// clientGroupID: text().primaryKey(),
// version: text().notNull(),
// });

// export const versionHistoryInZero0Cvr = zero0Cvr.table("versionHistory", {
// dataVersion: integer().notNull(),
// schemaVersion: integer().notNull(),
// minSafeVersion: integer().notNull(),
// lock: char({ length: 1 }).default("v").primaryKey(),
// }, (table) => [
// check("ck_schema_meta_lock", sql`(lock = 'v'::bpchar)`),]);
