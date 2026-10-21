import { Option } from "effect"
import { describe, expect, test } from "vitest"

import * as Blog from "./submodel.ts"
import { Remote } from "foldkit-remote"
import { content_blog_path } from "./submodel.ts"

const blog_post_id = "j4700000000000000000000000000001"

describe("blog host adapter", () => {
    test("maps canonical Blog creation to the existing editor", () => {
        expect(content_blog_path("/content/blog/new", "")).toEqual(
            Option.some("/blog/new")
        )
    })

    test("maps a canonical Blog item to the existing main-domain route", () => {
        expect(
            content_blog_path(`/content/blog/${blog_post_id}`, "?mode=edit")
        ).toEqual(Option.some(`/blog/${blog_post_id}`))
    })

    test("accepts legacy 32-character ids regardless of their leading character", () => {
        const non_j_blog_post_id = "rs71sy8gfdeqk6agc8kjrpsz8h8ecf17"

        expect(
            content_blog_path(
                `/content/blog/${non_j_blog_post_id}`,
                "?mode=edit"
            )
        ).toEqual(Option.some(`/blog/${non_j_blog_post_id}`))
    })

    test("preserves checked subdomain context for the Blog editor", () => {
        expect(
            content_blog_path(
                `/content/blog/${blog_post_id}`,
                "?mode=edit&subdomain=docs"
            )
        ).toEqual(Option.some(`/blog/subdomains/docs/${blog_post_id}`))
    })

    test("rejects invalid Blog item ids", () => {
        expect(
            Option.isNone(content_blog_path("/content/blog/post-1", ""))
        ).toBe(true)
    })
})

describe("PostgreSQL Blog state", () => {
    const scope = {
        account_id: "account",
        domain_id: "domain",
        can_write: true,
    }
    test("accepts PostgreSQL post IDs", () => {
        const id = "a334108d-5732-4ec1-ac26-c97c9c974b8e"
        expect(content_blog_path(`/content/blog/${id}`, "")).toEqual(
            Option.some(`/blog/${id}`)
        )
    })
    test("loads once and clears drafts when the publication owner changes", () => {
        const [loading, commands] = Blog.synchronize(
            Blog.init("/blog/new"),
            scope
        )
        expect(commands[0]?.name).toBe("LoadBlogLibrary")
        expect(Blog.synchronize(loading, scope)[1]).toEqual([])
        const ready = { ...loading, pending: false }
        const [draft] = Blog.update(ready, {
            _tag: "UpdatedBlogTitle",
            value: "Draft",
        })
        expect(draft.ui.title).toBe("Draft")
        expect(draft.ui).not.toHaveProperty("documents")
        const [switched, requests] = Blog.changed_url(
            draft,
            "/blog/subdomains/docs/new"
        )
        expect(switched.subdomain_slug).toBe("docs")
        expect(switched.ui.title).toBe("")
        expect(requests[0]?.name).toBe("LoadBlogLibrary")
        expect(
            Blog.update(switched, {
                _tag: "BlogLoaded",
                epoch: ready.epoch,
                editor_epoch: ready.editor_epoch,
                remote: Remote.initial,
                saved_id: null,
                saved_template: false,
                from_template: false,
            })[0]
        ).toEqual(switched)
    })
    test("blocks pending and read-only saves and retains drafts on failure", () => {
        const [loading] = Blog.synchronize(Blog.init("/blog/new"), scope)
        const save: Blog.Message = { _tag: "ClickedSaveBlogDraft" }
        expect(Blog.update(loading, save)[1]).toEqual([])
        const [draft] = Blog.update(
            { ...loading, pending: false },
            { _tag: "UpdatedBlogTitle", value: "Draft" }
        )
        expect(Blog.update({ ...draft, can_write: false }, save)[1]).toEqual([])
        const [saving, commands] = Blog.update(draft, save)
        expect(commands[0]?.name).toBe("ChangeBlogLibrary")
        const [failed] = Blog.update(saving, {
            _tag: "BlogFailed",
            epoch: saving.epoch,
            editor_epoch: saving.editor_epoch,
            template: false,
            error: "Slug already used",
        })
        expect(failed.pending).toBe(false)
        expect(failed.ui.title).toBe("Draft")
        expect(failed.ui.maybeError).toEqual(Option.some("Slug already used"))
    })
})
