import { describe, expect, test } from "vitest"
import { Remote } from "foldkit-remote"
import * as Documents from "./submodel.ts"
import * as Feature from "@urm/features/documents/submodel"

const scope = { account_id: "account", domain_id: "workspace", can_write: true }
describe("PostgreSQL Documents state", () => {
    test("loads once per scope and discards late responses and drafts on switches", () => {
        const [loading, commands] = Documents.synchronize(
            Documents.init("/content/documents/new"),
            scope
        )
        expect(commands[0]?.name).toBe("LoadDocumentLibrary")
        expect(Documents.synchronize(loading, scope)[1]).toEqual([])
        const ready = { ...loading, pending: false }
        const [draft] = Documents.update(
            ready,
            Feature.UpdatedDocumentTitle({ value: "Draft" })
        )
        expect(draft.ui.title).toBe("Draft")
        expect(draft.ui).not.toHaveProperty("documents")
        const [switched] = Documents.synchronize(draft, {
            ...scope,
            domain_id: "other",
        })
        expect(switched.ui.title).toBe("")
        expect(
            Documents.update(switched, {
                _tag: "DocumentsLoaded",
                epoch: ready.epoch,
                editor_epoch: ready.editor_epoch,
                remote: Remote.initial,
                saved_id: null,
                saved_template: false,
                from_template: false,
            })[0]
        ).toEqual(switched)
    })
    test("ignores an image upload that finishes after navigating to a different editor", () => {
        const [loading] = Documents.synchronize(
            Documents.init("/content/documents/new"),
            scope
        )
        const ready = { ...loading, pending: false }
        const [navigated] = Documents.changed_url(
            ready,
            "/content/documents/new"
        )
        const [late] = Documents.update(navigated, {
            _tag: "DocumentImageResult",
            epoch: ready.epoch,
            editor_epoch: ready.editor_epoch,
            message: {
                _tag: "UploadedImage",
                src: "/api/uploads/test",
                alt: "Late image",
            },
        })
        expect(late).toEqual(navigated)
    })
    test("blocks writes while pending or read-only and preserves failed drafts", () => {
        const [loading] = Documents.synchronize(
            Documents.init("/content/documents/new"),
            scope
        )
        expect(
            Documents.update(loading, Feature.ClickedSaveDocument())[1]
        ).toEqual([])
        const [draft] = Documents.update(
            { ...loading, pending: false },
            Feature.UpdatedDocumentTitle({ value: "Draft" })
        )
        expect(
            Documents.update(
                { ...draft, can_write: false },
                Feature.ClickedSaveDocument()
            )[1]
        ).toEqual([])
        const [saving, commands] = Documents.update(
            draft,
            Feature.ClickedSaveDocument()
        )
        expect(commands[0]?.name).toBe("ChangeDocumentLibrary")
        expect(saving.pending).toBe(true)
        const [failed] = Documents.update(saving, {
            _tag: "DocumentsFailed",
            epoch: saving.epoch,
            editor_epoch: saving.editor_epoch,
            template: false,
            error: "Unavailable",
        })
        expect(failed.ui.title).toBe("Draft")
        expect(failed.ui.is_dirty).toBe(true)
        expect(failed.pending).toBe(false)
    })
})
