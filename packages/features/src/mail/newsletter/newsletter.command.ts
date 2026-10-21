import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateSource,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"

import {
    NewsletterDraftActionFailed,
    NewsletterDraftDeleted,
    NewsletterDraftSaved,
    NewsletterDraftsLoaded,
    NewsletterDispatchCompleted,
    NewsletterDispatchFailed,
    NewsletterSendsLoaded,
    NewsletterTemplateSaved,
    NewsletterTemplateSaveFailed,
} from "./newsletter.message.ts"
import { NewsletterDraft } from "./newsletter.model.ts"

export const LoadNewsletterDrafts = Command.define("LoadNewsletterDrafts", {
    messages: [NewsletterDraftsLoaded, NewsletterDraftActionFailed],
    execute: Effect.succeed(NewsletterDraftsLoaded({ drafts: [] })),
})

export const LoadNewsletterSends = Command.define("LoadNewsletterSends", {
    messages: [NewsletterSendsLoaded, NewsletterDraftActionFailed],
    execute: Effect.succeed(NewsletterSendsLoaded({ sends: [] })),
})

export const SaveNewsletterDraft = Command.define("SaveNewsletterDraft", {
    args: {
        draftId: S.NullOr(S.String),
        expected_updated_at: S.Number,
        draft: NewsletterDraft,
        template_source: S.NullOr(ContentTemplateSource),
    },
    messages: [NewsletterDraftSaved, NewsletterDraftActionFailed],
    execute: () =>
        Effect.succeed(
            NewsletterDraftActionFailed({
                action: "save",
                error: "Newsletter drafts require a host persistence adapter",
            })
        ),
})

export const SaveNewsletterTemplate = Command.define("SaveNewsletterTemplate", {
    args: {
        name: ContentTemplateName,
        description: ContentTemplateDescription,
        tags: ContentTemplateTags,
        subject: S.String,
        headline: S.String,
        body_text: S.String,
        cta_url: S.NullOr(S.String),
        cta_label: S.NullOr(S.String),
    },
    messages: [NewsletterTemplateSaved, NewsletterTemplateSaveFailed],
    execute: () =>
        Effect.succeed(
            NewsletterTemplateSaveFailed({
                error: "Newsletter templates require a host persistence adapter",
            })
        ),
})

export const DeleteNewsletterDraft = Command.define("DeleteNewsletterDraft", {
    args: { draftId: S.String },
    messages: [NewsletterDraftDeleted, NewsletterDraftActionFailed],
    execute: () =>
        Effect.succeed(
            NewsletterDraftActionFailed({
                action: "delete",
                error: "Newsletter drafts require a host persistence adapter",
            })
        ),
})

export const SendNewsletterTest = Command.define("SendNewsletterTest", {
    args: {
        draftId: S.String,
        email: S.String,
        name: S.String,
    },
    messages: [NewsletterDispatchCompleted, NewsletterDispatchFailed],
    execute: () =>
        Effect.succeed(
            NewsletterDispatchFailed({
                error: "Newsletter sending requires a host persistence adapter",
            })
        ),
})

export const SendNewsletterSubscribers = Command.define(
    "SendNewsletterSubscribers",
    {
        args: { draftId: S.String },
        messages: [NewsletterDispatchCompleted, NewsletterDispatchFailed],
        execute: () =>
            Effect.succeed(
                NewsletterDispatchFailed({
                    error: "Newsletter sending requires a host persistence adapter",
                })
            ),
    }
)
