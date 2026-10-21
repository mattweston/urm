import { describe, expect, it } from "vitest"
import type { RichTextDocument } from "@urm/domain/schemas/rich-text"

import {
    createRichTextHtmlDownload,
    htmlFilenameForTitle,
} from "../../src/documents/html/download.client.ts"

const document: RichTextDocument = {
    type: "doc",
    children: [
        {
            type: "paragraph",
            children: [{ type: "text", text: "Download me" }],
        },
    ],
}

describe("rich-text HTML downloads", () => {
    it.each([
        ["Quarterly Report", "quarterly-report.html"],
        ["  A/B: Test  ", "a-b-test.html"],
        ["", "document.html"],
    ])("creates a safe filename for %s", (title, filename) => {
        expect(htmlFilenameForTitle(title)).toBe(filename)
    })

    it("creates a standalone HTML blob", async () => {
        const download = createRichTextHtmlDownload({
            title: "Example Document",
            document,
        })

        expect(download.filename).toBe("example-document.html")
        expect(download.blob.type).toBe("text/html;charset=utf-8")
        await expect(download.blob.text()).resolves.toContain(
            "<p>Download me</p>"
        )
    })
})
