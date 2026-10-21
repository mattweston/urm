import type { LinkSuggestion } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import { Submodel, Subscription } from "foldkit"

import {
    ChangedBlogTemplateMetadata,
    ChangedUrl,
    CompletedLoadExternal,
    CompletedNavigateInternal,
    FailedLoadingBlogDraft,
    FailedSavingBlogDraft,
    FailedSavingBlogTemplate,
    GotBlogRichTextEditorMessage,
    LoadedBlogAssignments,
    LoadedBlogDraft,
    SavedBlogDraft,
    SavedBlogTemplate,
    SubmittedBlogTemplate,
    UpdatedBlogExcerpt,
    UpdatedBlogSeoDescription,
    UpdatedBlogSeoTitle,
    contentView,
    createBlogModel,
    init,
    isAppScope,
    Message,
    Model,
    subscriptions as blogSubscriptions,
    titleForRoute,
    update,
} from "./main.ts"
import type { Message as BlogMessage, Model as BlogModel } from "./main.ts"
export { blogHref } from "./platform/route.ts"

export {
    ChangedBlogTemplateMetadata,
    ChangedUrl,
    CompletedLoadExternal,
    CompletedNavigateInternal,
    FailedLoadingBlogDraft,
    FailedSavingBlogDraft,
    FailedSavingBlogTemplate,
    GotBlogRichTextEditorMessage,
    LoadedBlogAssignments,
    LoadedBlogDraft,
    SavedBlogDraft,
    SavedBlogTemplate,
    SubmittedBlogTemplate,
    UpdatedBlogExcerpt,
    UpdatedBlogSeoDescription,
    UpdatedBlogSeoTitle,
    createBlogModel,
    init,
    isAppScope,
    Message,
    Model,
    titleForRoute,
    update,
}
export {
    BLOG_DOCUMENT_ID,
    BLOG_ENTITY_TYPE,
    serializeBlogDocumentContent,
} from "./platform/blog.document.ts"
export type { Message as MessageType, Model as ModelType } from "./main.ts"

export type ViewInputs = Readonly<{
    link_suggestions?: ReadonlyArray<LinkSuggestion>
}>
export const view = Submodel.defineView<BlogModel, BlogMessage, ViewInputs>(
    (model, inputs, h) => contentView(model, h, inputs.link_suggestions ?? [])
)

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (parentModel: ParentModel) => BlogModel
    readonly toParentMessage: (message: BlogMessage) => ParentMessage
    readonly when?: (parentModel: ParentModel) => boolean
}) => Subscription.lift(blogSubscriptions)<ParentModel, ParentMessage>(config)
