import { describe, expect, test } from "vitest"
import { Remote } from "foldkit-remote"
import { init, synchronize, update, project } from "./submodel.ts"

const scope = { account_id: "account", domain_id: "workspace", can_write: true }
const opened = synchronize(init("/media/gallery"), scope)[0]
const ready = { ...opened, pending: false }

describe("Media account state", () => {
    test("loads once per scope and drops drafts and late results after a switch", () => {
        expect(synchronize(ready, scope)[1]).toEqual([])
        const editing = update(ready, {
            _tag: "SearchQueryChanged",
            value: "draft",
        })[0]
        const switched = synchronize(editing, {
            ...scope,
            domain_id: "other",
        })[0]
        expect(switched.ui.searchQuery).toBe("")
        expect(
            update(switched, {
                _tag: "LibraryLoaded",
                epoch: ready.epoch,
                remote: Remote.initial,
                result: null,
            })[0]
        ).toEqual(switched)
        expect(synchronize(switched, null)[0].domain_id).toBe("")
    })

    test("keeps pending writes locked during local UI interactions", () => {
        const pending = update(opened, {
            _tag: "SearchQueryChanged",
            value: "query",
        })[0]
        expect(pending.pending).toBe(true)
        expect(project(pending).can_write).toBe(false)
        expect(update(pending, { _tag: "SubmittedNewVideo" })[1]).toEqual([])
        expect(
            update(
                { ...ready, can_write: false },
                { _tag: "ToggledUploadPanel" }
            )[0].ui.uploadPanelOpen
        ).toBe(false)
    })

    test("ignores obsolete LoadedMedia messages", () => {
        expect(
            update(ready, {
                _tag: "LoadedMedia",
                images: [],
                tags: [],
                entityTags: [],
                videos: [],
            })[0]
        ).toEqual(ready)
        expect(ready).not.toHaveProperty("images")
        expect(ready.ui).not.toHaveProperty("images")
    })

    test("preserves drafts after a failed write and permits explicit refresh", () => {
        const failed = update(
            { ...opened, ui: { ...opened.ui, editingAlt: "draft" } },
            {
                _tag: "LibraryFailed",
                epoch: opened.epoch,
                error: "Try again",
                upload: false,
            }
        )[0]
        expect(failed.pending).toBe(false)
        expect(failed.ui.editingAlt).toBe("draft")
        expect(failed.ui.error).toBe("Try again")
        expect(update(failed, { _tag: "Refreshed" })[1][0]?.name).toBe(
            "LoadMediaLibrary"
        )
    })
})
