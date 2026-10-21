import { describe, expect, it } from "vitest"
import {
    ChangedRoute,
    ClickedCancelLayoutEditing,
    ClickedEditLayout,
} from "../src/shop/admin.message.ts"
import { ShopCartRoute, ShopCheckoutRoute } from "../src/shop/admin.route.ts"
import { init, update } from "../src/shop/admin.update.ts"

describe("shop builder layout editing", () => {
    it("opens the route-local editing overlay", () => {
        const [model] = init(ShopCartRoute())
        const [editingModel, commands] = update(model, ClickedEditLayout())

        expect(editingModel.editorState._tag).toBe("Editing")
        expect(commands).toEqual([])
    })

    it("returns to viewing when editing is cancelled", () => {
        const [model] = init(ShopCartRoute())
        const [editingModel] = update(model, ClickedEditLayout())
        const [viewingModel] = update(
            editingModel,
            ClickedCancelLayoutEditing()
        )

        expect(viewingModel.editorState._tag).toBe("Viewing")
    })

    it("closes editing when the builder changes layout routes", () => {
        const [model] = init(ShopCartRoute())
        const [editingModel] = update(model, ClickedEditLayout())
        const [checkoutModel] = update(
            editingModel,
            ChangedRoute({ route: ShopCheckoutRoute() })
        )

        expect(checkoutModel.route._tag).toBe("ShopCheckout")
        expect(checkoutModel.editorState._tag).toBe("Viewing")
    })
})
