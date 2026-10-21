import { Schema } from "effect"
import { expect, it } from "vitest"
import { ContactEmailInput, ContactEmailRecord } from "../src/contacts.ts"
import { DocumentFields, DocumentRecord } from "../src/documents.ts"
import { BlogPost, BlogFields } from "../src/blog.ts"
import { Video, VideoDetails } from "../src/media.ts"

it("loads historical text that strict write schemas reject", () => {
    const email = { id: "email", email: "OLD@EXAMPLE.COM", is_primary: true }
    expect(Schema.is(ContactEmailRecord)(email)).toBe(true)
    expect(Schema.is(ContactEmailInput)(email)).toBe(false)

    const document = {
        id: "document",
        title: "x".repeat(10000),
        content: "",
        content_type: "text",
        status: "draft",
        template_source: null,
        created_at: 1,
        updated_at: 1,
    }
    expect(Schema.is(DocumentRecord)(document)).toBe(true)
    expect(Schema.is(DocumentFields)(document)).toBe(false)

    const post = {
        ...document,
        excerpt: null,
        seo_title: null,
        seo_description: null,
        editorial_state: "draft",
    }
    expect(Schema.is(BlogPost)(post)).toBe(true)
    expect(Schema.is(BlogFields)(post)).toBe(false)

    const video = {
        id: "video",
        slug: "Historical Slug",
        title: "x".repeat(10000),
        embed_url: "",
        thumbnail_src: "",
        youtube_id: null,
        order_position: 0,
        updated_at: 1,
    }
    expect(Schema.is(Video)(video)).toBe(true)
    expect(Schema.is(VideoDetails)(video)).toBe(false)
})
