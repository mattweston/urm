import { describe, expect, test } from "vitest"
import {
    ChangedBookmarkUrl,
    ClickedDiscardPostEdit,
    InsertedBookmarkUrl,
    init,
    update,
} from "./submodel.ts"

describe("Social Bookmark insertion", () => {
    test("snapshots the URL without changing delivery settings or issuing commands", () => {
        const initial = {
            ...init(),
            content: "Read more",
            selected_account_ids: ["account-1"],
        }
        const [selected] = update(
            initial,
            ChangedBookmarkUrl({ value: "https://example.com/article" })
        )
        const [inserted, commands] = update(selected, InsertedBookmarkUrl())
        expect(inserted.content).toBe(
            "Read more\n\nhttps://example.com/article"
        )
        expect(inserted.selected_account_ids).toEqual(
            initial.selected_account_ids
        )
        expect(inserted.schedule_date).toEqual(initial.schedule_date)
        expect(inserted.selected_media_ids).toEqual(initial.selected_media_ids)
        expect(inserted.bookmark_url).toBe("")
        expect(commands).toEqual([])
    })

    test.each([
        "javascript:alert(1)",
        "https://user:password@example.com",
        "not a url",
    ])("rejects %s", (value) => {
        const initial = { ...init(), content: "Unchanged", bookmark_url: value }
        const [result, commands] = update(initial, InsertedBookmarkUrl())
        expect(result.content).toBe(initial.content)
        expect(result.bookmark_error).not.toBe("")
        expect(commands).toEqual([])
    })

    test("enforces the caption limit and clears pending insertion on discard", () => {
        const initial = {
            ...init(),
            content: "x".repeat(4990),
            bookmark_url: "https://example.com",
        }
        const [rejected] = update(initial, InsertedBookmarkUrl())
        expect(rejected.content).toBe(initial.content)
        expect(rejected.bookmark_error).toContain("5,000")
        const [discarded] = update(rejected, ClickedDiscardPostEdit())
        expect(discarded.bookmark_url).toBe("")
        expect(discarded.bookmark_error).toBe("")
    })
})
