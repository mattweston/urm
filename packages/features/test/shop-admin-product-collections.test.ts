import { describe, expect, it } from "vitest"
import { Product, ProductCollection } from "@urm/domain/schemas/shop"

import {
    CollectionsLoaded,
    ProductsLoaded,
    SubmittedProductForm,
    UpdatedProductCollection,
} from "../src/shop/admin.message.ts"
import { ShopProductEditRoute } from "../src/shop/admin.route.ts"
import { init, update } from "../src/shop/admin.update.ts"

const summer = ProductCollection.make({
    id: "summer",
    name: "Summer",
    slug: "summer",
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
})
const featured = ProductCollection.make({
    id: "featured",
    name: "Featured",
    slug: "featured",
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
})
const product = Product.make({
    id: "product-1",
    name: "Canvas bag",
    slug: "canvas-bag",
    description: "A reusable bag",
    price: 2400,
    imageUrl: "https://example.com/bag.jpg",
    isActive: true,
    isFeatured: false,
    collectionIds: [summer.id],
    variants: [
        {
            id: "variant-1",
            productId: "product-1",
            name: "Default",
            price: 2400,
            stock: 12,
            createdAt: 1,
            updatedAt: 1,
        },
    ],
    createdAt: 1,
    updatedAt: 1,
})

describe("shop product collection editing", () => {
    it("retains and submits collection assignments from the product editor", () => {
        const [initial_model] = init(
            ShopProductEditRoute({ productId: product.id })
        )
        const [product_model] = update(
            initial_model,
            ProductsLoaded({ products: [product] })
        )
        const [loaded_model] = update(
            product_model,
            CollectionsLoaded({ collections: [summer, featured] })
        )
        const [assigned_model] = update(
            loaded_model,
            UpdatedProductCollection({
                collectionId: featured.id,
                selected: true,
            })
        )
        const [submitting_model, commands] = update(
            assigned_model,
            SubmittedProductForm()
        )

        expect(assigned_model.productDraft.collectionIds).toEqual([
            summer.id,
            featured.id,
        ])
        expect(submitting_model.isSubmitting).toBe(true)
        expect(commands[0]?.args).toEqual({
            id: product.id,
            product: {
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.price,
                inventory: 12,
                imageUrl: product.imageUrl,
                collectionIds: [summer.id, featured.id],
                isActive: true,
                isFeatured: false,
            },
        })
    })

    it("removes a product from a collection without changing the collection", () => {
        const [initial_model] = init(
            ShopProductEditRoute({ productId: product.id })
        )
        const [loaded_model] = update(
            initial_model,
            ProductsLoaded({ products: [product] })
        )
        const [unassigned_model] = update(
            loaded_model,
            UpdatedProductCollection({
                collectionId: summer.id,
                selected: false,
            })
        )

        expect(unassigned_model.productDraft.collectionIds).toEqual([])
    })
})
