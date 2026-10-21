import { Option } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, it } from "vitest"
import {
    ClickedAddCartItem,
    SubmittedProductForm,
} from "@urm/features/shop/admin"
import * as DesktopShop from "./submodel-postgres.ts"

const url = Url.make({
    protocol: "http:",
    host: "urm.test",
    port: Option.some("1420"),
    pathname: "/shop/products/new",
    search: Option.none(),
    hash: Option.none(),
})
const scope = { account_id: "account-1", domain_id: "domain-1" }

describe("PostgreSQL Shop client adapter", () => {
    it("loads one account workspace and ignores an older workspace response", () => {
        const [first, commands] = DesktopShop.synchronize(
            DesktopShop.init(url, "/shop"),
            scope
        )
        expect(commands.map((command) => command.name)).toEqual([
            "LoadPostgresShop",
        ])
        const [second] = DesktopShop.synchronize(first, {
            account_id: "account-1",
            domain_id: "domain-2",
        })
        const stale = DesktopShop.shop_remote_loaded({
            ...scope,
            epoch: first.epoch,
            catalog: {
                id: "domain-1",
                products: [],
                variants: [],
                collections: [],
                memberships: [],
            },
            cart: null,
            orders: [],
        })
        expect(DesktopShop.update(second, stale, Option.none())[0]).toBe(second)
        const loaded = DesktopShop.shop_remote_loaded({
            ...stale,
            domain_id: "domain-2",
            epoch: second.epoch,
            catalog: { ...stale.catalog, id: "domain-2" },
        })
        const [ready] = DesktopShop.update(second, loaded, Option.none())
        expect(ready.ui.isLoading).toBe(false)
        expect(ready.ui.isCartLoading).toBe(false)
        expect(ready.ui.areOrdersLoading).toBe(false)
    })

    it("keeps product and cart commands on the Postgres account path", () => {
        const [base] = DesktopShop.synchronize(
            DesktopShop.init(url, "/shop/products/new"),
            scope
        )
        const model = DesktopShop.Model.make({
            ...base,
            ui: {
                ...base.ui,
                productDraft: {
                    name: "Canvas bag",
                    slug: "canvas-bag",
                    description: "A reusable bag",
                    price: "24.00",
                    inventory: "12",
                    imageUrl:
                        "/api/uploads/domain-1/shop/486148d9-3e5a-4168-90fc-a872842dd981",
                    imageId: null,
                    collectionIds: [],
                    isActive: true,
                    isFeatured: true,
                },
            },
        })
        const [, product_commands] = DesktopShop.update(
            model,
            SubmittedProductForm(),
            Option.none()
        )
        expect(product_commands).toHaveLength(1)
        expect(product_commands[0]?.name).toBe("ChangePostgresShopCatalog")
        expect(product_commands[0]?.args).toMatchObject({
            account_id: "account-1",
            domain_id: "domain-1",
            action: {
                _tag: "create_product",
                slug: "canvas-bag",
                price: 2400,
                inventory: 12,
                image_id: null,
            },
        })
        const [, cart_commands] = DesktopShop.update(
            model,
            ClickedAddCartItem({ variantId: "variant-1", quantity: 2 }),
            Option.none()
        )
        expect(cart_commands[0]?.name).toBe("ChangePostgresShopCart")
        expect(cart_commands[0]?.args).toMatchObject({
            domain_id: "domain-1",
            action: {
                _tag: "add_item",
                session_id: DesktopShop.cart_session_id,
                variant_id: "variant-1",
                quantity: 2,
            },
        })
    })
})
