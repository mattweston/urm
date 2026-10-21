import { BlogLibraryRecord, BlogScope, BlogAction } from "@urm/domain/blog"
export {
    BlogFields,
    BlogPost,
    BlogAssignment,
    BlogTemplateFields,
    BlogTemplate,
    BlogLibraryRecord,
    BlogScope,
    BlogAction,
    blog_library_id,
} from "@urm/domain/blog"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"

export const BlogLibrary = Entity.make("BlogLibrary", BlogLibraryRecord)
export const BlogLibrarySummary = BlogLibrary.select({
    id: true,
    posts: true,
    assignments: true,
    templates: true,
})

export const PublicationBlog = Query.make("PublicationBlog", {
    Input: BlogScope,
    Result: BlogLibrary,
})
export const ChangeBlog = Mutation.make("ChangeBlog", {
    Input: {
        ...BlogScope,
        account_id: Schema.optional(Schema.String),
        action: BlogAction,
    },
    Output: { id: Schema.String },
})
export const BlogRemote = Remote.define({
    entities: [BlogLibrary],
    queries: [PublicationBlog],
    mutations: [ChangeBlog],
})
