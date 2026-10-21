import { describe, expect, it } from "vitest"
import type { RichTextDocument } from "@urm/domain/schemas/rich-text"

import {
    parseBlogDocumentContent,
    serializeBlogDocumentContent,
} from "../../src/blog/platform/blog.document.ts"

const document: RichTextDocument = {
    type: "doc",
    children: [
        {
            type: "paragraph",
            children: [{ type: "text", text: "Hello" }],
        },
    ],
}

describe("blog document content", () => {
    it("writes versioned rich-text JSON", () => {
        const serialized = serializeBlogDocumentContent({
            author: "Ada",
            document,
            tags: ["effect", "foldkit"],
        })

        expect(JSON.parse(serialized)).toEqual({
            schema_version: 1,
            author: "Ada",
            document,
            tags: ["effect", "foldkit"],
        })
    })

    it("normalizes legacy unversioned content", () => {
        const parsed = parseBlogDocumentContent(
            JSON.stringify({ author: "Ada", document })
        )

        expect(parsed).toEqual({
            schema_version: 1,
            author: "Ada",
            document,
        })
    })

    it("rejects malformed rich-text JSON", () => {
        expect(
            parseBlogDocumentContent(
                JSON.stringify({
                    schema_version: 1,
                    author: "Ada",
                    document: { type: "doc", children: [{ type: "table" }] },
                })
            )
        ).toBeNull()
    })
})
