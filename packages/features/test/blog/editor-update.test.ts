import { Option } from "effect"
import { describe, expect, it } from "vitest"

import {
    ChangedBlogTemplateMetadata,
    ClickedSaveBlogDraft,
    LoadedBlogAssignments,
    LoadedBlogDraft,
    SubmittedBlogTemplate,
    UpdatedBlogSlug,
    blogPostLink,
    createBlogModel,
    isAppScope,
    update,
} from "../../src/blog/main.ts"

describe("blog editor update", () => {
    it("treats canonical Content Blog items as internal navigation", () => {
        expect(isAppScope("/content/blog/post-1")).toBe(true)
    })

    it("links subdomain collection entries to canonical Content editing", () => {
        expect(
            blogPostLink("/blog/subdomains/docs", {
                id: "post-1",
                title: "First post",
                content: "Body",
                content_type: "rich_text_json",
                published: false,
                created_at: 1,
                updated_at: 2,
            })
        ).toBe("/content/blog/post-1?mode=edit&subdomain=docs")
    })

    it("normalizes a valid slug before saving", () => {
        const model = createBlogModel("/blog/new/")
        const [with_slug] = update(
            model,
            UpdatedBlogSlug({ value: "  First-Post  " })
        )
        const [saving, commands] = update(with_slug, ClickedSaveBlogDraft())

        expect(saving.slug).toBe("first-post")
        expect(commands[0]?.args).toMatchObject({
            model: { slug: "first-post" },
        })
    })

    it("reports an invalid slug before persistence", () => {
        const model = createBlogModel("/blog/new/")
        const [with_slug] = update(
            model,
            UpdatedBlogSlug({ value: "first post" })
        )
        const [failed, commands] = update(with_slug, ClickedSaveBlogDraft())

        expect(failed.status).toBe("error")
        expect(Option.getOrUndefined(failed.maybeError)).toContain(
            "lowercase letters"
        )
        expect(commands).toEqual([])
    })

    it("saves the current inline Blog draft as a reusable template", () => {
        const model = createBlogModel("/blog/new/")
        const [named] = update(
            model,
            ChangedBlogTemplateMetadata({
                field: "name",
                value: "Article starter",
            })
        )
        const [tagged] = update(
            named,
            ChangedBlogTemplateMetadata({
                field: "tags",
                value: "News, news, Editorial",
            })
        )
        const [saving, commands] = update(tagged, SubmittedBlogTemplate())

        expect(saving.template_save_status).toBe("saving")
        expect(commands[0]?.name).toBe("SaveBlogTemplate")
        expect(commands[0]?.args).toMatchObject({
            name: "Article starter",
            tags: ["news", "editorial"],
        })
    })

    it("applies owner-local publication assignments to reusable posts", () => {
        const model = createBlogModel("/blog/drafts/")
        const [with_posts] = update(
            model,
            LoadedBlogDraft({
                documents: [
                    {
                        id: "post-1",
                        title: "First post",
                        content: "Body",
                        content_type: "rich_text_json",
                        published: false,
                        created_at: 1,
                        updated_at: 2,
                    },
                ],
                postMetadata: [
                    {
                        blog_post_id: "post-1",
                        excerpt: "A short summary",
                        seo_title: "First post SEO",
                        seo_description: "Search summary",
                        template_source: null,
                    },
                ],
                tags: [],
                entityTags: [],
            })
        )
        const [assigned] = update(
            with_posts,
            LoadedBlogAssignments({
                assignments: [
                    {
                        id: "assignment-1",
                        blog_post_id: "post-1",
                        slug: "first-post",
                        publication_state: "published",
                    },
                ],
            })
        )

        expect(assigned.documents).toMatchObject([
            { id: "post-1", slug: "first-post", published: true },
        ])
    })

    it("loads excerpt and SEO metadata for an assigned post", () => {
        const model = createBlogModel("/blog/first-post/")
        const [loaded] = update(
            model,
            LoadedBlogDraft({
                documents: [
                    {
                        id: "post-1",
                        title: "First post",
                        content: "Body",
                        content_type: "rich_text_json",
                        slug: "first-post",
                        published: false,
                        created_at: 1,
                        updated_at: 2,
                    },
                ],
                postMetadata: [
                    {
                        blog_post_id: "post-1",
                        excerpt: "A short summary",
                        seo_title: "First post SEO",
                        seo_description: "Search summary",
                        template_source: null,
                    },
                ],
                tags: [],
                entityTags: [],
            })
        )

        expect(loaded).toMatchObject({
            excerpt: "A short summary",
            seoTitle: "First post SEO",
            seoDescription: "Search summary",
        })
    })
})
