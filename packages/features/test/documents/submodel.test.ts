import { Schema as S } from "effect"
import { describe, expect, test } from "vitest"

import {
    ChangedDocumentTemplateMetadata,
    ClickedSaveDocument,
    InternalDocument,
    LoadedDocuments,
    SubmittedDocumentTemplate,
    ToggledDocumentEditing,
    init,
    update,
} from "../../src/documents/submodel.ts"

const document = S.decodeUnknownSync(InternalDocument)({
    id: "j4700000000000000000000000000001",
    title: "Internal plan",
    content: JSON.stringify({
        schema_version: 1,
        document: {
            type: "doc",
            children: [
                {
                    type: "paragraph",
                    children: [{ type: "text", text: "Private notes" }],
                },
            ],
        },
    }),
    content_type: "rich_text_json",
    status: "draft",
    template_source: null,
    created_at: 1,
    updated_at: 2,
})

describe("internal documents submodel", () => {
    test("loads organization documents into the collection", () => {
        const [model] = init("/content/documents")
        const [loaded] = update(
            model,
            LoadedDocuments({ documents: [document] })
        )

        expect(loaded.route).toBe("Index")
        expect(loaded.load_status).toBe("ready")
        expect(loaded.documents).toEqual([document])
    })

    test("hydrates a canonical item in preview mode and keeps inline editing", () => {
        const [model] = init(`/content/document/${document.id}`)
        const [loaded] = update(
            model,
            LoadedDocuments({ documents: [document] })
        )
        const [editing] = update(loaded, ToggledDocumentEditing())

        expect(loaded.route).toBe("Document")
        expect(loaded.title).toBe("Internal plan")
        expect(loaded.is_editing).toBe(false)
        expect(editing.is_editing).toBe(true)
    })

    test("creates a versioned rich-text save command for a blank document", () => {
        const [model] = init("/content/documents/new")
        const [loaded] = update(model, LoadedDocuments({ documents: [] }))
        const [saving, commands] = update(loaded, ClickedSaveDocument())

        expect(saving.load_status).toBe("saving")
        expect(commands[0]?.name).toBe("SaveDocument")
        expect(commands[0]?.args).toMatchObject({
            document_id: null,
            title: "Untitled document",
            status: "draft",
        })
        expect(JSON.stringify(commands[0]?.args)).toContain("schema_version")
    })

    test("saves the current inline document as a reusable template", () => {
        const [model] = init("/content/documents/new")
        const [named] = update(
            model,
            ChangedDocumentTemplateMetadata({
                field: "name",
                value: "Meeting notes",
            })
        )
        const [tagged] = update(
            named,
            ChangedDocumentTemplateMetadata({
                field: "tags",
                value: "Meetings, meetings, Team",
            })
        )
        const [saving, commands] = update(tagged, SubmittedDocumentTemplate())

        expect(saving.template_save_status).toBe("saving")
        expect(commands[0]?.name).toBe("SaveDocumentTemplate")
        expect(commands[0]?.args).toMatchObject({
            name: "Meeting notes",
            tags: ["meetings", "team"],
            content_type: "rich_text_json",
        })
    })
})
