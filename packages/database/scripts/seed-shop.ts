#!/usr/bin/env tsx

import { config } from "dotenv"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, "../.env.local")
config({ path: envPath })

import { Effect } from "effect"
import { databaseOperationError } from "../src/database-operation-error.ts"
import { makeDatabaseDevLive } from "../src/services/database-dev.ts"
import { DB } from "../src/layer.ts"
import { domains } from "../src/legacy-schema/domains/index.ts"
import {
    products,
    product_collections,
    product_variants,
    carts,
    orders,
} from "../src/legacy-schema/shop/index.ts"
import { eq, or } from "drizzle-orm"

const now = Date.now()
const domain_selector = process.argv[2] ?? "test"

const demoProducts = [
    {
        id: "astro-t-shirt",
        name: "Astro T-Shirt",
        slug: "astro-t-shirt",
        tagline: "Comfortable cotton tee with Astro logo",
        description:
            "A comfortable cotton t-shirt featuring the Astro logo. Perfect for developers who want to show their love for the all-in-one web framework.",
        price: 2500,
        discount: 500,
        imageUrl: "/assets/shop/astro-unisex-tshirt.png",
        images: ["/assets/shop/shirts.png"],
        collectionIds: ["apparel", "featured"],
        isActive: true,
        isFeatured: true,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-sticker-pack",
        name: "Astro Sticker Pack",
        slug: "astro-sticker-pack",
        tagline: "Vinyl stickers for your laptop",
        description:
            "A pack of 5 high-quality vinyl stickers featuring Astro mascots and logos. Waterproof and durable.",
        price: 800,
        imageUrl: "/assets/shop/astro-sticker-pack.png",
        images: [],
        collectionIds: ["accessories", "featured"],
        isActive: true,
        isFeatured: true,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-hoodie",
        name: "Astro Zip-Up Hoodie",
        slug: "astro-hoodie",
        tagline: "Warm hoodie for late-night coding",
        description:
            "A premium heavyweight zip-up hoodie with the Astro logo. Features a kangaroo pocket and ribbed cuffs.",
        price: 5500,
        discount: 1000,
        imageUrl: "/assets/shop/astro-zip-up-hoodie.png",
        images: [],
        collectionIds: ["apparel", "featured"],
        isActive: true,
        isFeatured: true,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-cap",
        name: "Astro Cap",
        slug: "astro-cap",
        tagline: "Adjustable cap with embroidered logo",
        description:
            "A classic adjustable cap with an embroidered Astro logo. One size fits most.",
        price: 2200,
        imageUrl: "/assets/shop/astro-cap.png",
        images: [],
        collectionIds: ["apparel"],
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-beanie",
        name: "Astro Beanie",
        slug: "astro-beanie",
        tagline: "Warm knit beanie for winter coding",
        description:
            "A cozy knit beanie featuring the Astro logo. Perfect for keeping warm while shipping code.",
        price: 1800,
        imageUrl: "/assets/shop/astro-beanie.png",
        images: [],
        collectionIds: ["apparel"],
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-backpack",
        name: "Astro Backpack",
        slug: "astro-backpack",
        tagline: "Durable backpack for your gear",
        description:
            "A sturdy backpack with plenty of compartments for your laptop, accessories, and daily essentials.",
        price: 4500,
        discount: 500,
        imageUrl: "/assets/shop/astro-backpack-1.png",
        images: [],
        collectionIds: ["accessories"],
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-lighthouse-sticker",
        name: "Astro Lighthouse Sticker",
        slug: "astro-lighthouse-sticker",
        tagline: "Vinyl sticker featuring the Astro lighthouse",
        description:
            "A durable vinyl sticker featuring the Astro lighthouse mascot.",
        price: 300,
        imageUrl: "/assets/shop/astro-lighthouse-sticker.png",
        images: [],
        collectionIds: ["accessories"],
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-icon-sticker",
        name: "Astro Icon Sticker",
        slug: "astro-icon-sticker",
        tagline: "Vinyl sticker featuring the Astro icon",
        description: "A durable vinyl sticker featuring the Astro icon logo.",
        price: 300,
        imageUrl: "/assets/shop/astro-icon-sticker.png",
        images: [],
        collectionIds: ["accessories"],
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-houston-sticker",
        name: "Astro Houston Sticker",
        slug: "astro-houston-sticker",
        tagline: "Vinyl sticker featuring Houston",
        description:
            "A durable vinyl sticker featuring the Astro Houston mascot.",
        price: 300,
        imageUrl: "/assets/shop/astro-houston-sticker.png",
        images: [],
        collectionIds: ["accessories"],
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-universe-stickers",
        name: "Astro Universe Stickers",
        slug: "astro-universe-stickers",
        tagline: "A sheet of Astro universe stickers",
        description:
            "A full sheet of Astro-themed stickers featuring various mascots and icons.",
        price: 1200,
        imageUrl: "/assets/shop/astro-universe-stickers.png",
        images: [],
        collectionIds: ["accessories"],
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
    },
]

const demoCollections = [
    {
        id: "apparel",
        name: "Apparel",
        slug: "apparel",
        description: "T-shirts, hoodies, beanies, and caps for developers",
        imageUrl: "/assets/shop/shirts.png",
        isActive: true,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "accessories",
        name: "Accessories",
        slug: "accessories",
        description: "Stickers, backpacks, and more",
        imageUrl: "/assets/shop/astro-backpack-1.png",
        isActive: true,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "featured",
        name: "Featured",
        slug: "featured",
        description: "Our most popular items",
        imageUrl: "/assets/shop/astro-unisex-tshirt.png",
        isActive: true,
        createdAt: now,
        updatedAt: now,
    },
]

const demoVariants = [
    {
        id: "astro-t-shirt-default",
        productId: "astro-t-shirt",
        name: "Default",
        priceOverride: 2500,
        stock: 42,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-t-shirt-xs",
        productId: "astro-t-shirt",
        name: "XS",
        sku: "ASTRO-TS-XS",
        priceOverride: 2500,
        stock: 5,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-t-shirt-s",
        productId: "astro-t-shirt",
        name: "S",
        sku: "ASTRO-TS-S",
        priceOverride: 2500,
        stock: 12,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-t-shirt-m",
        productId: "astro-t-shirt",
        name: "M",
        sku: "ASTRO-TS-M",
        priceOverride: 2500,
        stock: 20,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-t-shirt-l",
        productId: "astro-t-shirt",
        name: "L",
        sku: "ASTRO-TS-L",
        priceOverride: 2500,
        stock: 10,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-t-shirt-xl",
        productId: "astro-t-shirt",
        name: "XL",
        sku: "ASTRO-TS-XL",
        priceOverride: 2500,
        stock: 8,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-sticker-pack-default",
        productId: "astro-sticker-pack",
        name: "Default",
        sku: "ASTRO-STK-001",
        priceOverride: 800,
        stock: 100,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-hoodie-s",
        productId: "astro-hoodie",
        name: "S",
        sku: "ASTRO-HD-S",
        priceOverride: 5500,
        stock: 8,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-hoodie-m",
        productId: "astro-hoodie",
        name: "M",
        sku: "ASTRO-HD-M",
        priceOverride: 5500,
        stock: 15,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-hoodie-l",
        productId: "astro-hoodie",
        name: "L",
        sku: "ASTRO-HD-L",
        priceOverride: 5500,
        stock: 12,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-hoodie-xl",
        productId: "astro-hoodie",
        name: "XL",
        sku: "ASTRO-HD-XL",
        priceOverride: 5500,
        stock: 6,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-cap-default",
        productId: "astro-cap",
        name: "Default",
        sku: "ASTRO-CP-001",
        priceOverride: 2200,
        stock: 18,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-beanie-default",
        productId: "astro-beanie",
        name: "Default",
        sku: "ASTRO-BN-001",
        priceOverride: 1800,
        stock: 22,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-backpack-default",
        productId: "astro-backpack",
        name: "Default",
        sku: "ASTRO-BP-001",
        priceOverride: 4500,
        stock: 15,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-lighthouse-default",
        productId: "astro-lighthouse-sticker",
        name: "Default",
        sku: "ASTRO-LST-001",
        priceOverride: 300,
        stock: 50,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-icon-default",
        productId: "astro-icon-sticker",
        name: "Default",
        sku: "ASTRO-IST-001",
        priceOverride: 300,
        stock: 50,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-houston-default",
        productId: "astro-houston-sticker",
        name: "Default",
        sku: "ASTRO-HST-001",
        priceOverride: 300,
        stock: 50,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: "astro-universe-default",
        productId: "astro-universe-stickers",
        name: "Default",
        sku: "ASTRO-UST-001",
        priceOverride: 1200,
        stock: 30,
        createdAt: now,
        updatedAt: now,
    },
]

const seedShop = Effect.gen(function* () {
    const db = yield* DB

    const domain_rows = yield* db
        .select({ id: domains.id })
        .from(domains)
        .where(
            or(
                eq(domains.id, domain_selector),
                eq(domains.name, domain_selector)
            )
        )
        .limit(1)
        .pipe(
            Effect.mapError((cause) =>
                databaseOperationError(
                    "SeedShop.findDomain",
                    "Failed to find domain",
                    cause
                )
            )
        )

    const domain = domain_rows[0]

    if (domain === undefined) {
        return yield* Effect.fail(
            databaseOperationError(
                "SeedShop.findDomain",
                `Domain ${domain_selector} not found`
            )
        )
    }

    const domain_id = domain.id

    const scoped_collections = demoCollections.map((collection) => ({
        ...collection,
        id: `${domain_id}-${collection.id}`,
        domain_id,
    }))
    const scoped_products = demoProducts.map((product) => ({
        ...product,
        id: `${domain_id}-${product.id}`,
        domain_id,
        collectionIds: product.collectionIds.map(
            (collection_id) => `${domain_id}-${collection_id}`
        ),
    }))
    const scoped_variants = demoVariants.map((variant) => ({
        ...variant,
        id: `${domain_id}-${variant.id}`,
        productId: `${domain_id}-${variant.productId}`,
    }))

    console.log("Clearing existing shop data for domain", domain_id)
    yield* db
        .delete(carts)
        .where(eq(carts.domain_id, domain_id))
        .pipe(
            Effect.mapError((cause) =>
                databaseOperationError(
                    "SeedShop.clearCarts",
                    "Failed to clear carts",
                    cause
                )
            )
        )
    yield* db
        .delete(orders)
        .where(eq(orders.domain_id, domain_id))
        .pipe(
            Effect.mapError((cause) =>
                databaseOperationError(
                    "SeedShop.clearOrders",
                    "Failed to clear orders",
                    cause
                )
            )
        )
    yield* db
        .delete(products)
        .where(eq(products.domain_id, domain_id))
        .pipe(
            Effect.mapError((cause) =>
                databaseOperationError(
                    "SeedShop.clearProducts",
                    "Failed to clear products",
                    cause
                )
            )
        )
    yield* db
        .delete(product_collections)
        .where(eq(product_collections.domain_id, domain_id))
        .pipe(
            Effect.mapError((cause) =>
                databaseOperationError(
                    "SeedShop.clearCollections",
                    "Failed to clear product_collections",
                    cause
                )
            )
        )
    console.log("Cleared existing shop data")

    console.log("Seeding collections...")
    const insertedCollections = yield* db
        .insert(product_collections)
        .values(scoped_collections)
        .returning()
        .pipe(
            Effect.mapError((err) => {
                console.error("Collection insert error:", err)
                return databaseOperationError(
                    "SeedShop.insertCollections",
                    "Failed to insert collections",
                    err
                )
            })
        )
    console.log(`✓ Inserted ${insertedCollections.length} collections`)

    console.log("Seeding products...")
    const insertedProducts = yield* db
        .insert(products)
        .values(scoped_products)
        .returning()
        .pipe(
            Effect.mapError((cause) =>
                databaseOperationError(
                    "SeedShop.insertProducts",
                    "Failed to insert products",
                    cause
                )
            )
        )
    console.log(`✓ Inserted ${insertedProducts.length} products`)

    console.log("Seeding variants...")
    const insertedVariants = yield* db
        .insert(product_variants)
        .values(scoped_variants)
        .returning()
        .pipe(
            Effect.mapError((cause) =>
                databaseOperationError(
                    "SeedShop.insertVariants",
                    "Failed to insert variants",
                    cause
                )
            )
        )
    console.log(`✓ Inserted ${insertedVariants.length} variants`)

    return {
        collections: insertedCollections.length,
        products: insertedProducts.length,
        variants: insertedVariants.length,
    }
})

const database_url = process.env.DATABASE_URL_DEV || ""

if (!database_url) {
    console.error("DATABASE_URL_DEV not set")
    process.exit(1)
}

const program = seedShop.pipe(Effect.provide(makeDatabaseDevLive(database_url)))

Effect.runPromise(program)
    .then((result) => {
        console.log(
            `\n✅ Shop seeded: ${result.collections} collections, ${result.products} products, ${result.variants} variants`
        )
        process.exit(0)
    })
    .catch((error) => {
        console.error("\n❌ Seed failed:", error)
        process.exit(1)
    })
