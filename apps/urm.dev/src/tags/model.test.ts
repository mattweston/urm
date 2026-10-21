import { describe, expect, test } from "vitest"
import { Remote } from "foldkit-remote"
import { init, synchronize, update, project } from "./submodel.ts"

const scope = { account_id: "account", domain_id: "workspace", can_write: true }
const opened = synchronize(init(), scope)[0]
const ready = {
    ...opened,
    pending: false,
    ui: { ...opened.ui, loading: false },
}

describe("Tags account state", () => {
    test("clears drafts on workspace changes and rejects stale results", () => {
        const draft = update(ready, {
            _tag: "CreateTagNameChanged",
            value: "Draft",
        })[0]
        const switched = synchronize(draft, { ...scope, domain_id: "other" })[0]
        expect(switched.ui.creatingName).toBe("")
        expect(
            update(switched, {
                _tag: "TagsLoaded",
                epoch: ready.epoch,
                remote: Remote.initial,
                result: null,
            })[0]
        ).toEqual(switched)
        expect(synchronize(switched, null)[0].domain_id).toBe("")
    })
    test("blocks read-only and pending writes without storing duplicate tag arrays", () => {
        const draft = update(ready, {
            _tag: "CreateTagNameChanged",
            value: "Draft",
        })[0]
        expect(
            update(
                { ...draft, can_write: false },
                { _tag: "ClickedCreateTag" }
            )[1]
        ).toEqual([])
        const [pending, commands] = update(draft, { _tag: "ClickedCreateTag" })
        expect(commands[0]?.name).toBe("CreateCatalogTag")
        expect(pending.pending).toBe(true)
        expect(project(pending).can_write).toBe(false)
        expect(
            update(pending, { _tag: "SortByChanged", value: "usage" })[0]
                .pending
        ).toBe(true)
        expect(pending.ui).not.toHaveProperty("tags")
        expect(
            update(ready, { _tag: "LoadedTags", tags: [], entityTags: [] })[0]
        ).toEqual(ready)
    })
    test("keeps drafts on failure and permits refresh", () => {
        const draft = update(ready, {
            _tag: "CreateTagNameChanged",
            value: "Draft",
        })[0]
        const failed = update(draft, {
            _tag: "TagsFailed",
            epoch: draft.epoch,
            error: "Duplicate name",
        })[0]
        expect(failed.ui.creatingName).toBe("Draft")
        expect(update(failed, { _tag: "TagsRefreshed" })[1][0]?.name).toBe(
            "LoadTagCatalog"
        )
    })
})
