import { Effect, Schema as S } from "effect"
import { Command, Navigation } from "foldkit"

import {
    archiveMessage,
    discardDraft,
    markRead,
    receiveMessage,
    replay,
    saveDraft,
    sendDraft,
    toggleStarred,
} from "./mailroom.event-log.ts"
import {
    CompletedMailroomNavigation,
    FailedMailroomStorage,
    LoadedMailroom,
    PersistedMailroom,
} from "./mailroom.message.ts"

const DraftInput = S.Struct({
    id: S.String,
    to: S.String,
    subject: S.String,
    body: S.String,
})

const persistResult = <A, E>(effect: Effect.Effect<A, E>) =>
    effect.pipe(
        Effect.as(PersistedMailroom()),
        Effect.catch(() => Effect.succeed(FailedMailroomStorage()))
    )

export const LoadMailroom = Command.define("LoadMailroom", {
    messages: [LoadedMailroom, FailedMailroomStorage],
    execute: replay.pipe(
        Effect.map((stored) => LoadedMailroom({ stored })),
        Effect.catch(() => Effect.succeed(FailedMailroomStorage()))
    ),
})

export const ReceiveMailroomMessage = Command.define("ReceiveMailroomMessage", {
    args: {
        id: S.String,
        subject: S.String,
        sender: S.String,
        body: S.String,
    },
    messages: [PersistedMailroom, FailedMailroomStorage],
    execute: (input) => persistResult(receiveMessage(input)),
})

export const MarkMailroomMessageRead = Command.define(
    "MarkMailroomMessageRead",
    {
        args: { id: S.String },
        messages: [PersistedMailroom, FailedMailroomStorage],
        execute: ({ id }) => persistResult(markRead(id)),
    }
)

export const ArchiveMailroomMessage = Command.define("ArchiveMailroomMessage", {
    args: { id: S.String },
    messages: [PersistedMailroom, FailedMailroomStorage],
    execute: ({ id }) => persistResult(archiveMessage(id)),
})

export const ToggleMailroomMessageStarred = Command.define(
    "ToggleMailroomMessageStarred",
    {
        args: { id: S.String },
        messages: [PersistedMailroom, FailedMailroomStorage],
        execute: ({ id }) => persistResult(toggleStarred(id)),
    }
)

export const SaveMailroomDraft = Command.define("SaveMailroomDraft", {
    args: { draft: DraftInput },
    messages: [PersistedMailroom, FailedMailroomStorage],
    execute: ({ draft }) => persistResult(saveDraft(draft)),
})

export const DiscardMailroomDraft = Command.define("DiscardMailroomDraft", {
    args: { id: S.String },
    messages: [PersistedMailroom, FailedMailroomStorage],
    execute: ({ id }) => persistResult(discardDraft(id)),
})

export const SendMailroomDraft = Command.define("SendMailroomDraft", {
    args: { draft: DraftInput },
    messages: [PersistedMailroom, FailedMailroomStorage],
    execute: ({ draft }) => persistResult(sendDraft(draft)),
})

const NavigateMailroom = Command.define("NavigateMailroom", {
    args: { href: S.String },
    messages: [CompletedMailroomNavigation],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(Effect.as(CompletedMailroomNavigation())),
})

export const navigateMailroom = (href: string) => NavigateMailroom({ href })
