import { Match as M } from "effect"
import { Command } from "foldkit"

import {
    ArchiveMailroomMessage,
    DiscardMailroomDraft,
    LoadMailroom,
    MarkMailroomMessageRead,
    ReceiveMailroomMessage,
    SaveMailroomDraft,
    SendMailroomDraft,
    ToggleMailroomMessageStarred,
    navigateMailroom,
} from "./mailroom.command.ts"
import type { Message } from "./mailroom.message.ts"
import type { MailDraft, Model } from "./mailroom.model.ts"
import { initialModel } from "./mailroom.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const nextTimestamp = (model: Model) =>
    Math.max(
        1_723_900_000_000,
        ...model.messages.map(({ received_at }) => received_at),
        ...model.drafts.map(({ updated_at }) => updated_at),
        ...model.outbox.map(({ queued_at }) => queued_at)
    ) + 1

const draftFromModel = (model: Model): MailDraft => ({
    id:
        model.compose_draft_id === "new"
            ? `draft-${nextTimestamp(model)}`
            : model.compose_draft_id,
    to: model.compose_to.trim(),
    subject: model.compose_subject.trim(),
    body: model.compose_body,
    updated_at: nextTimestamp(model),
})

const draftInput = (draft: MailDraft) => ({
    id: draft.id,
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
})

const isInvalidDraft = (model: Model) =>
    model.compose_to.trim() === "" ||
    model.compose_subject.trim() === "" ||
    model.compose_body.trim() === ""

export const init = (): UpdateReturn => [initialModel, [LoadMailroom()]]
export const initDeferred = (): UpdateReturn => [initialModel, []]

export const openDraft = (model: Model, draftId: string): Model => {
    if (draftId === "new") {
        return {
            ...model,
            compose_to: "",
            compose_subject: "",
            compose_body: "",
            compose_draft_id: "new",
            compose_dirty: false,
            submission: "idle",
            error: "",
        }
    }

    const draft = model.drafts.find(({ id }) => id === draftId)
    return draft === undefined
        ? { ...model, error: "Draft not found." }
        : {
              ...model,
              compose_to: draft.to,
              compose_subject: draft.subject,
              compose_body: draft.body,
              compose_draft_id: draft.id,
              compose_dirty: false,
              submission: "idle",
              error: "",
          }
}

export const update = (
    model: Model,
    message: Message,
    navigation: "Browser" | "Model" = "Browser"
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            LoadedMailroom: ({ stored: value }) => [
                {
                    ...model,
                    messages:
                        value.messages.length === 0
                            ? model.messages
                            : value.messages,
                    drafts: value.drafts,
                    outbox: value.outbox,
                    loaded: true,
                    error: "",
                },
                [],
            ],
            FailedMailroomStorage: () => [
                {
                    ...model,
                    loaded: true,
                    error: "Mailroom storage is unavailable. Changes will remain in this tab.",
                },
                [],
            ],
            ChangedComposeTo: ({ value }) => [
                {
                    ...model,
                    compose_to: value,
                    compose_dirty: true,
                    submission: "idle",
                    error: "",
                },
                [],
            ],
            ChangedComposeSubject: ({ value }) => [
                {
                    ...model,
                    compose_subject: value,
                    compose_dirty: true,
                    submission: "idle",
                    error: "",
                },
                [],
            ],
            ChangedComposeBody: ({ value }) => [
                {
                    ...model,
                    compose_body: value,
                    compose_dirty: true,
                    submission: "idle",
                    error: "",
                },
                [],
            ],
            ClickedSaveDraft: () => {
                if (isInvalidDraft(model)) {
                    return [
                        {
                            ...model,
                            submission: "failed",
                            error: "Add a recipient, subject, and message first.",
                        },
                        [],
                    ]
                }
                const draft = draftFromModel(model)
                const drafts = [
                    ...model.drafts.filter(({ id }) => id !== draft.id),
                    draft,
                ]
                return [
                    {
                        ...model,
                        drafts,
                        compose_draft_id: draft.id,
                        compose_dirty: false,
                        submission: "saved",
                        error: "",
                    },
                    [SaveMailroomDraft({ draft: draftInput(draft) })],
                ]
            },
            ClickedSendDraft: () => {
                if (isInvalidDraft(model)) {
                    return [
                        {
                            ...model,
                            submission: "failed",
                            error: "Add a recipient, subject, and message first.",
                        },
                        [],
                    ]
                }
                const draft = draftFromModel(model)
                const sent: Model = {
                    ...model,
                    messages: [
                        ...model.messages,
                        {
                            id: `sent-${draft.id}`,
                            subject: draft.subject,
                            sender: `To: ${draft.to}`,
                            body: draft.body,
                            read: true,
                            starred: false,
                            folder: "sent",
                            received_at: draft.updated_at,
                        },
                    ],
                    drafts: model.drafts.filter(({ id }) => id !== draft.id),
                    compose_dirty: false,
                    submission: "saved",
                    error: "Message sent.",
                }
                return [
                    {
                        ...sent,
                        compose_to: "",
                        compose_subject: "",
                        compose_body: "",
                        compose_draft_id: "new",
                        view_path: "/mail/sent/",
                    },
                    [
                        SendMailroomDraft({ draft: draftInput(draft) }),
                        ...(navigation === "Browser"
                            ? [navigateMailroom("/mail/sent/")]
                            : []),
                    ],
                ]
            },
            ClickedDiscardDraft: () => {
                const discarded: Model = {
                    ...model,
                    drafts: model.drafts.filter(
                        ({ id }) => id !== model.compose_draft_id
                    ),
                    compose_to: "",
                    compose_subject: "",
                    compose_body: "",
                    compose_draft_id: "new",
                    compose_dirty: false,
                    submission: "idle",
                    error: "Draft discarded.",
                    view_path: "/mail/drafts/",
                }
                return [
                    discarded,
                    [
                        DiscardMailroomDraft({ id: model.compose_draft_id }),
                        ...(navigation === "Browser"
                            ? [navigateMailroom("/mail/drafts/")]
                            : []),
                    ],
                ]
            },
            ClickedToggleStar: ({ id }) => [
                {
                    ...model,
                    messages: model.messages.map((item) =>
                        item.id === id
                            ? { ...item, starred: !item.starred }
                            : item
                    ),
                },
                [ToggleMailroomMessageStarred({ id })],
            ],
            ClickedArchive: ({ id }) => [
                {
                    ...model,
                    messages: model.messages.map((item) =>
                        item.id === id ? { ...item, folder: "archive" } : item
                    ),
                },
                [ArchiveMailroomMessage({ id })],
            ],
            ClickedMarkRead: ({ id }) => [
                {
                    ...model,
                    messages: model.messages.map((item) =>
                        item.id === id ? { ...item, read: true } : item
                    ),
                },
                [MarkMailroomMessageRead({ id })],
            ],
            ClickedReceiveMessage: () => {
                const received_at = nextTimestamp(model)
                const subjects = [
                    "Re: Q3 pipeline",
                    "Lunch tomorrow?",
                    "Invoice #4021",
                    "Standup notes",
                ]
                const senders = [
                    "ada@urm.dev",
                    "grace@urm.dev",
                    "margaret@urm.dev",
                    "edsger@urm.dev",
                ]
                const index = model.messages.length % subjects.length
                const received: Model = {
                    ...model,
                    messages: [
                        ...model.messages,
                        {
                            id: `received-${received_at}`,
                            subject: subjects[index] ?? "New message",
                            sender: senders[index] ?? "hello@urm.dev",
                            body: "A newly received demo message. It is stored with the rest of this local mailbox and survives a reload.",
                            read: false,
                            starred: false,
                            folder: "inbox",
                            received_at,
                        },
                    ],
                }
                const message = received.messages.at(-1)
                return message === undefined
                    ? [model, []]
                    : [
                          received,
                          [
                              ReceiveMailroomMessage({
                                  id: message.id,
                                  subject: message.subject,
                                  sender: message.sender,
                                  body: message.body,
                              }),
                          ],
                      ]
            },
            PersistedMailroom: () => [model, []],
            RequestedMailroomNavigation: ({ href }) =>
                model.compose_dirty
                    ? [{ ...model, pending_href: href }, []]
                    : navigation === "Browser"
                      ? [model, [navigateMailroom(href)]]
                      : [{ ...model, view_path: href }, []],
            ConfirmedDiscardChanges: () => [
                {
                    ...model,
                    compose_dirty: false,
                    pending_href: "",
                    view_path:
                        navigation === "Model" && model.pending_href !== ""
                            ? model.pending_href
                            : model.view_path,
                },
                model.pending_href === ""
                    ? []
                    : navigation === "Browser"
                      ? [navigateMailroom(model.pending_href)]
                      : [],
            ],
            CancelledDiscardChanges: () => [{ ...model, pending_href: "" }, []],
            CompletedMailroomNavigation: () => [model, []],
        })
    )
