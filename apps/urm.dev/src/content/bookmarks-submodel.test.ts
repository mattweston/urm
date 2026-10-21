import { describe, expect, test } from "vitest"
import { Option } from "effect"
import { Remote } from "foldkit-remote"
import { init, synchronize, update, project } from "./bookmarks-submodel.ts"

const scope = { account_id: "account", domain_id: "workspace", can_write: true }
const opened = synchronize(init(), scope)[0]
const ready = { ...opened, pending: false }

describe("PostgreSQL bookmark state", () => {
    test("resets drafts and rejects late results when the workspace changes", () => {
        const draft = update(ready, {
            _tag: "UpdatedBookmarkTitle",
            value: "Draft",
        })[0]
        const switched = synchronize(draft, { ...scope, domain_id: "other" })[0]
        expect(switched.ui.title).toBe("")
        expect(
            update(switched, {
                _tag: "BookmarksLoaded",
                epoch: ready.epoch,
                remote: Remote.initial,
                result: null,
            })[0]
        ).toEqual(switched)
        expect(synchronize(switched, null)[0].domain_id).toBe("")
    })
    test("blocks pending and read-only writes without accepting legacy records", () => {
        const draft = {
            ...ready,
            ui: { ...ready.ui, title: "Docs", href: "#docs" },
        }
        const [pending, commands] = update(draft, { _tag: "SubmittedBookmark" })
        expect(commands[0]?.name).toBe("SaveCatalogBookmark")
        expect(project(pending).can_write).toBe(false)
        expect(update(pending, { _tag: "SubmittedBookmark" })[1]).toEqual([])
        expect(
            update(
                { ...draft, can_write: false },
                { _tag: "SubmittedBookmark" }
            )[1]
        ).toEqual([])
        expect(
            update(ready, { _tag: "LoadedBookmarks", bookmarks: [] })[0]
        ).toEqual(ready)
        expect(draft.ui).not.toHaveProperty("bookmarks")
    })
    test("retains drafts and exposes errors on failed saves", () => {
        const draft = { ...ready, ui: { ...ready.ui, title: "Docs" } }
        const failed = update(draft, {
            _tag: "BookmarksFailed",
            epoch: ready.epoch,
            error: "Duplicate URL",
        })[0]
        expect(failed.ui.title).toBe("Docs")
        expect(failed.ui.error).toEqual(Option.some("Duplicate URL"))
        expect(update(failed, { _tag: "BookmarksRefreshed" })[1][0]?.name).toBe(
            "LoadBookmarkCatalog"
        )
    })
})
