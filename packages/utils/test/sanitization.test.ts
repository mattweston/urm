import { describe, expect, it } from "@effect/vitest"
import {
    containsMaliciousContent,
    containsProfanity,
    processComment,
    sanitizeHtml,
} from "../src/sanitization.ts"

describe("containsMaliciousContent", () => {
    it("detects a javascript: URL", () => {
        expect(containsMaliciousContent("javascript:alert(1)")).toBe(true)
    })

    // The patterns are shared module-level regexes. With a /g flag `.test()`
    // advances lastIndex between calls, and the same input alternated
    // true/false/true.
    it("returns the same verdict on repeated calls with the same input", () => {
        const input = "javascript:alert(1)"

        expect(containsMaliciousContent(input)).toBe(true)
        expect(containsMaliciousContent(input)).toBe(true)
        expect(containsMaliciousContent(input)).toBe(true)
    })

    it("stays stable across inputs that only some patterns match", () => {
        expect(containsMaliciousContent("vbscript:msgbox(1)")).toBe(true)
        expect(containsMaliciousContent("harmless text")).toBe(false)
        expect(containsMaliciousContent("vbscript:msgbox(1)")).toBe(true)
    })

    it("accepts ordinary prose", () => {
        expect(
            containsMaliciousContent("Hello, this is a normal comment!")
        ).toBe(false)
    })
})

describe("sanitizeHtml", () => {
    it("strips plain tags", () => {
        expect(sanitizeHtml("<p>Hello <strong>world</strong></p>")).toBe(
            "Hello world"
        )
    })

    // Decoding after stripping turned encoded markup back into live markup.
    it("does not resurrect entity-encoded markup", () => {
        expect(sanitizeHtml("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe(
            "alert(1)"
        )
    })

    it("decodes &amp; last so double-encoded markup stays inert", () => {
        expect(sanitizeHtml("&amp;lt;script&amp;gt;")).toBe("&lt;script&gt;")
    })

    it("decodes ordinary entities", () => {
        expect(sanitizeHtml("Tom &amp; Jerry")).toBe("Tom & Jerry")
        expect(sanitizeHtml("&quot;quoted&quot;")).toBe('"quoted"')
    })
})

describe("containsProfanity", () => {
    it("matches whole words only", () => {
        expect(containsProfanity("I love classic music")).toBe(false)
        expect(containsProfanity("This is a shit comment")).toBe(true)
    })
})

describe("processComment", () => {
    it("returns sanitised values with no errors for clean input", () => {
        expect(processComment("John Doe", "Great article!")).toEqual({
            sanitizedAuthor: "John Doe",
            sanitizedContent: "Great article!",
            errors: [],
        })
    })

    it("reports an error and stores no live markup for encoded script input", () => {
        const result = processComment(
            "User",
            "&lt;script&gt;alert(1)&lt;/script&gt;"
        )

        expect(result.sanitizedContent).toBe("alert(1)")
        expect(result.errors).toEqual([])
    })

    // Sanitisation runs first, so tag-shaped input is stripped rather than
    // reported. Only payloads sanitizeHtml leaves behind reach the reject-list.
    it("strips raw markup instead of reporting it", () => {
        const result = processComment("User", '<script>alert("xss")</script>')

        expect(result.sanitizedContent).toBe('alert("xss")')
        expect(result.errors).toEqual([])
    })

    it("reports tagless payloads that survive sanitisation", () => {
        const result = processComment("User", "javascript:alert(1)")

        expect(result.errors).toContain(
            "Comment contains invalid characters or potentially malicious content"
        )
    })
})
