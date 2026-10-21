import { Schema as S } from "effect"

export const FolderId = S.Literals([
    "inbox",
    "starred",
    "sent",
    "drafts",
    "archive",
    "outbox",
])
export type FolderId = typeof FolderId.Type

export const MessageFolder = S.Literals(["inbox", "sent", "archive"])

export const MailMessage = S.Struct({
    id: S.String,
    subject: S.String,
    sender: S.String,
    body: S.String,
    read: S.Boolean,
    starred: S.Boolean,
    folder: MessageFolder,
    received_at: S.Number,
})
export type MailMessage = typeof MailMessage.Type

export const MailDraft = S.Struct({
    id: S.String,
    to: S.String,
    subject: S.String,
    body: S.String,
    updated_at: S.Number,
})
export type MailDraft = typeof MailDraft.Type

export const OutboxItem = S.Struct({
    id: S.String,
    to: S.String,
    subject: S.String,
    body: S.String,
    queued_at: S.Number,
})
export type OutboxItem = typeof OutboxItem.Type

export const Submission = S.Literals(["idle", "saved", "failed"])

export const Model = S.Struct({
    messages: S.Array(MailMessage),
    drafts: S.Array(MailDraft),
    outbox: S.Array(OutboxItem),
    loaded: S.Boolean,
    compose_to: S.String,
    compose_subject: S.String,
    compose_body: S.String,
    compose_draft_id: S.String,
    compose_dirty: S.Boolean,
    submission: Submission,
    error: S.String,
    pending_href: S.String,
    view_path: S.String,
})
export type Model = typeof Model.Type

export const StoredMailroom = S.Struct({
    messages: S.Array(MailMessage),
    drafts: S.Array(MailDraft),
    outbox: S.Array(OutboxItem),
})
export type StoredMailroom = typeof StoredMailroom.Type

export const folder_order: ReadonlyArray<FolderId> = [
    "inbox",
    "starred",
    "sent",
    "drafts",
    "archive",
    "outbox",
]

export const folder_labels: Record<FolderId, string> = {
    inbox: "Inbox",
    starred: "Starred",
    sent: "Sent",
    drafts: "Drafts",
    archive: "Archive",
    outbox: "Outbox",
}

export const folder_icons: Record<FolderId, string> = {
    inbox: "⌁",
    starred: "✦",
    sent: "↗",
    drafts: "◇",
    archive: "▱",
    outbox: "◴",
}

export const isFolderId = (value: string): value is FolderId =>
    folder_order.some((folder) => folder === value)

const now = 1_723_900_000_000

export const initialModel: Model = {
    messages: [
        {
            id: "welcome",
            subject: "Welcome to the team",
            sender: "ada@urm.dev",
            body: "Your first week is mostly reading and meeting people. Start with the documents workspace, then send a note when you are settled in.",
            read: false,
            starred: true,
            folder: "inbox",
            received_at: now,
        },
        {
            id: "deploy-green",
            subject: "Deploy is green",
            sender: "grace@urm.dev",
            body: "Deploy went out at 14:20 and everything is green. Error rates are flat and latency came down slightly.",
            read: true,
            starred: false,
            folder: "inbox",
            received_at: now - 86_400_000,
        },
    ],
    drafts: [],
    outbox: [],
    loaded: false,
    compose_to: "",
    compose_subject: "",
    compose_body: "",
    compose_draft_id: "new",
    compose_dirty: false,
    submission: "idle",
    error: "",
    pending_href: "",
    view_path: "/labs/mail/inbox/",
}
