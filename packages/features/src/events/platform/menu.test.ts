import { expect, test } from "vitest"
import { init, update } from "./app.update.ts"
import { blankMenuItemDraft } from "./events.data.ts"
import { category_key, menu_categories } from "./menu-categories.ts"

const item = (id: string, category: string, order_position: string) => ({
    ...blankMenuItemDraft(),
    id,
    category,
    order_position,
    updated_at: 1,
})

test("keeps default categories first, aliases legacy items, and includes custom categories", () => {
    expect(
        menu_categories([
            item("a", "appetizer", "0"),
            item("b", "Rice", "1"),
            item("c", "rice", "2"),
        ])
    ).toEqual(["main", "condiments", "appetisers", "rice"])
    expect(category_key("appetizer")).toBe("appetisers")
})

test("meal selections are independent of category and toggle individually", () => {
    const [model] = init("/events/menu/new")
    const [breakfast] = update(model, {
        _tag: "ToggledMenuService",
        service: "breakfast",
    })
    const [both] = update(breakfast, {
        _tag: "ToggledMenuService",
        service: "lunch",
    })
    expect(both.menuDraft.served_at).toEqual(["breakfast", "lunch"])
    expect(both.menuDraft.category).toBe("main")
    const [lunch] = update(both, {
        _tag: "ToggledMenuService",
        service: "breakfast",
    })
    expect(lunch.menuDraft.served_at).toEqual(["lunch"])
})

test("drop into another category sends its full order without changing server-backed records", () => {
    const [initial] = init("/events/menu")
    const model = {
        ...initial,
        dragged_menu_item: "a",
        menuItems: [item("a", "main", "0"), item("b", "rice", "0")],
    }
    const [pending, commands] = update(model, {
        _tag: "DroppedMenuItem",
        category: "rice",
        before_id: "b",
    })
    expect(commands.map((command) => command.args)).toEqual([
        { category: "rice", ids: ["a", "b"] },
    ])
    expect(pending.menuItems).toBe(model.menuItems)
    expect(pending.dragged_menu_item).toBeNull()
    const [, duplicate] = update(pending, {
        _tag: "DroppedMenuItem",
        category: "rice",
        before_id: null,
    })
    expect(duplicate).toEqual([])
})

test("keyboard move respects item order and boundaries", () => {
    const [initial] = init("/events/menu")
    const model = {
        ...initial,
        menuItems: [item("b", "main", "2"), item("a", "main", "1")],
    }
    const [, commands] = update(model, {
        _tag: "MovedMenuItem",
        id: "b",
        direction: "up",
    })
    expect(commands.map((command) => command.args)).toEqual([
        { category: "main", ids: ["b", "a"] },
    ])
    expect(
        update(model, { _tag: "MovedMenuItem", id: "a", direction: "up" })[1]
    ).toEqual([])
})
