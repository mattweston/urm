import { Option } from "effect"
import { describe, expect, it } from "vitest"
import {
    ClickedEditBookmark,
    DeletedBookmark,
    LoadedBookmarks,
    SavedBookmark,
    SubmittedBookmark,
    UpdatedBookmarkHref,
    UpdatedBookmarkTags,
    UpdatedBookmarkTitle,
    init,
    update,
} from "../../src/content/bookmarks/index.ts"

const bookmark = {
    id: "bookmark:one",
    title: "Documentation",
    href: "#documentation",
    tags: ["docs"],
    updated_at: 1,
}

describe("content saved links update", () => {
    it("loads bookmarks and submits normalized form data", () => {
        const [initial] = init()
        const [loaded] = update(
            initial,
            LoadedBookmarks({ bookmarks: [bookmark] })
        )
        const [with_title] = update(
            loaded,
            UpdatedBookmarkTitle({ value: "Support" })
        )
        const [with_href] = update(
            with_title,
            UpdatedBookmarkHref({ value: " #support " })
        )
        const [with_tags] = update(
            with_href,
            UpdatedBookmarkTags({ value: " Help, docs, help " })
        )
        const [saving, commands] = update(with_tags, SubmittedBookmark())

        expect(saving.status).toBe("saving")
        expect(commands[0]?.args).toEqual({
            bookmark_id: null,
            title: "Support",
            href: "#support",
            tags: ["help", "docs"],
        })
    })

    it("edits, saves, and deletes bookmarks", () => {
        const [initial] = init()
        const [editing] = update(initial, ClickedEditBookmark({ bookmark }))
        expect(Option.getOrUndefined(editing.editing_id)).toBe(bookmark.id)

        const [saved] = update(
            editing,
            SavedBookmark({ bookmark: { ...bookmark, title: "Docs" } })
        )
        expect(saved.bookmarks[0]?.title).toBe("Docs")
        expect(Option.isNone(saved.editing_id)).toBe(true)

        const [deleted] = update(
            saved,
            DeletedBookmark({ bookmark_id: bookmark.id })
        )
        expect(deleted.bookmarks).toEqual([])
    })
})
