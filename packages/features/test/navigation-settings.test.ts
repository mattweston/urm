import { describe, expect, test } from "vitest"
import { Option } from "effect"
import {
    module_ids,
    normalize_sidebar_order,
    sidebar_item_ids,
} from "@urm/domain/schemas/modules"
import * as Navigation from "../src/settings/navigation/index.ts"

const snapshot: typeof Navigation.Snapshot.Type = {
    domain_id: "domain-a",
    sidebar_order: normalize_sidebar_order([]),
    hidden_modules: [],
    enabled_modules: module_ids,
    can_manage_modules: true,
}
const loaded = () =>
    Navigation.update(
        Navigation.init("domain-a"),
        Navigation.Received({ snapshot })
    )[0]

describe("navigation settings drafts", () => {
    test("presents the compatible Pages preference as Web", () => {
        expect(Navigation.sidebar_item_label("Pages")).toBe("Web")
        expect(Navigation.sidebar_item_label("Documents")).toBe(
            "Documents (inside Content)"
        )
        expect(Navigation.sidebar_item_label("Blog")).toBe("Blog (inside Web)")
        expect(Navigation.module_label("Blog")).toBe("Blog (Web)")
        expect(Navigation.module_label("Documents")).toBe("Documents (Content)")
    })

    test("adds Content and keeps the nested Blog preference with Web", () => {
        const normalized = normalize_sidebar_order(["Stats", "Pages"])
        const content_index = normalized.indexOf("Content")
        const web_index = normalized.indexOf("Pages")

        expect(normalized).toContain("Content")
        expect(normalized[content_index + 1]).toBe("Documents")
        expect(normalized[web_index + 1]).toBe("Blog")
    })

    test("places Learn immediately after Dev in existing saved orders", () => {
        const existing_order = sidebar_item_ids.filter((id) => id !== "Learn")
        const normalized = normalize_sidebar_order(existing_order)
        const dev_index = normalized.indexOf("Dev")

        expect(normalized[dev_index + 1]).toBe("Learn")
    })

    test("dividers can be added, saved, removed, cancelled, and reset", () => {
        let model = Navigation.update(loaded(), Navigation.AddedDivider())[0]
        model = Navigation.update(model, Navigation.AddedDivider())[0]
        expect(model.sidebar_order.slice(-2)).toEqual([
            "divider-1",
            "divider-2",
        ])
        model = Navigation.update(
            model,
            Navigation.GotDragAndDropMessage({
                message: {
                    _tag: "ActivatedKeyboardDrag",
                    itemId: "divider-1",
                    containerId: "sidebar-order",
                    index: model.sidebar_order.length - 2,
                },
            })
        )[0]
        model = Navigation.update(
            model,
            Navigation.GotDragAndDropMessage({
                message: {
                    _tag: "CompletedResolveKeyboardMove",
                    targetContainerId: "sidebar-order",
                    targetIndex: 1,
                },
            })
        )[0]
        model = Navigation.update(
            model,
            Navigation.GotDragAndDropMessage({
                message: { _tag: "ConfirmedKeyboardDrop" },
            })
        )[0]
        expect(model.sidebar_order.slice(0, 2)).toEqual(["Stats", "divider-1"])
        const saved_snapshot = {
            ...snapshot,
            sidebar_order: model.sidebar_order,
        }
        model = Navigation.update(
            model,
            Navigation.Saved({ kind: "sidebar", snapshot: saved_snapshot })
        )[0]
        model = Navigation.update(
            model,
            Navigation.RemovedDivider({ id: "divider-1" })
        )[0]
        expect(model.sidebar_order).not.toContain("divider-1")
        model = Navigation.update(
            model,
            Navigation.Cancel({ kind: "sidebar" })
        )[0]
        expect(model.sidebar_order).toEqual(saved_snapshot.sidebar_order)
        model = Navigation.update(model, Navigation.Reset())[0]
        expect(model.sidebar_order).toEqual(snapshot.sidebar_order)
    })
    test("keyboard reordering stays in the draft until saved and Cancel restores it", () => {
        let model = loaded()
        model = Navigation.update(
            model,
            Navigation.GotDragAndDropMessage({
                message: {
                    _tag: "ActivatedKeyboardDrag",
                    itemId: "Stats",
                    containerId: "sidebar-order",
                    index: 0,
                },
            })
        )[0]
        model = Navigation.update(
            model,
            Navigation.GotDragAndDropMessage({
                message: {
                    _tag: "CompletedResolveKeyboardMove",
                    targetContainerId: "sidebar-order",
                    targetIndex: 2,
                },
            })
        )[0]
        model = Navigation.update(
            model,
            Navigation.GotDragAndDropMessage({
                message: { _tag: "ConfirmedKeyboardDrop" },
            })
        )[0]
        expect(model.sidebar_order.slice(0, 3)).toEqual([
            ...snapshot.sidebar_order.slice(1, 3),
            "Stats",
        ])
        expect(model.dirty_sidebar).toBe(true)
        expect(Option.getOrThrow(model.snapshot).sidebar_order[0]).toBe("Stats")
        model = Navigation.update(
            model,
            Navigation.Cancel({ kind: "sidebar" })
        )[0]
        expect(model.sidebar_order).toEqual(snapshot.sidebar_order)
    })
    test("reactive updates preserve unsaved edits and successful saves clear only their own draft", () => {
        let model = Navigation.update(
            loaded(),
            Navigation.ToggleHidden({ id: "Events" })
        )[0]
        model = Navigation.update(
            model,
            Navigation.ToggleModule({ id: "Media" })
        )[0]
        model = Navigation.update(model, Navigation.Received({ snapshot }))[0]
        expect(model.hidden_modules).toEqual(["Events"])
        expect(model.enabled_modules).not.toContain("Media")
        model = Navigation.update(
            model,
            Navigation.Saved({
                kind: "sidebar",
                snapshot: { ...snapshot, hidden_modules: ["Events"] },
            })
        )[0]
        expect(model.dirty_sidebar).toBe(false)
        expect(model.dirty_modules).toBe(true)
        expect(model.enabled_modules).not.toContain("Media")
    })
    test("ignores stale responses from another domain and retains drafts after save failure", () => {
        let model = Navigation.update(
            loaded(),
            Navigation.ToggleHidden({ id: "Media" })
        )[0]
        model = Navigation.update(
            model,
            Navigation.Save({ kind: "sidebar" })
        )[0]
        const stale = Navigation.update(
            model,
            Navigation.Saved({
                kind: "sidebar",
                snapshot: { ...snapshot, domain_id: "domain-b" },
            })
        )[0]
        expect(stale).toBe(model)
        model = Navigation.update(
            model,
            Navigation.Failed({ domain_id: "domain-a", details: "Save failed" })
        )[0]
        expect(model.hidden_modules).toEqual(["Media"])
        expect(model.saving).toBe("idle")
        expect(model.error).toBe("Save failed")
    })
    test("reset restores defaults without enabling modules or touching persistence", () => {
        let model = Navigation.update(
            loaded(),
            Navigation.ToggleModule({ id: "Media" })
        )[0]
        model = Navigation.update(
            model,
            Navigation.ToggleHidden({ id: "Events" })
        )[0]
        model = Navigation.update(model, Navigation.Reset())[0]
        expect(model.hidden_modules).toEqual([])
        expect(model.enabled_modules).not.toContain("Media")
        expect(model.dirty_sidebar).toBe(true)
    })
})
