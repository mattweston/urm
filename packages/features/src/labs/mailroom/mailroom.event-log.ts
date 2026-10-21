import { Effect, Layer, Redacted, Schema as S } from "effect"
import * as Msgpack from "effect/encoding/Msgpack"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"

import { randomHexId } from "@urm/utils"

import type {
    MailDraft,
    MailMessage,
    OutboxItem,
    StoredMailroom,
} from "./mailroom.model.ts"
import { initialModel } from "./mailroom.model.ts"

const DATABASE_NAME = "urm-dev-octane:mail-seam"
const IDENTITY_STORAGE_KEY = "urm-dev-octane:mail-seam-identity"

const ReceivedPayload = S.Struct({
    id: S.String,
    subject: S.String,
    sender: S.String,
    body: S.optionalKey(S.String),
})
const IdPayload = S.Struct({ id: S.String })
const DraftPayload = S.Struct({
    id: S.String,
    to: S.String,
    subject: S.String,
    body: S.String,
})

const received_codec = Msgpack.schema(ReceivedPayload)
const id_codec = Msgpack.schema(IdPayload)
const draft_codec = Msgpack.schema(DraftPayload)

const MailGroup = EventGroup.empty
    .add({
        tag: "MessageReceived",
        primaryKey: (payload) => payload.id,
        payload: ReceivedPayload,
    })
    .add({
        tag: "MessageRead",
        primaryKey: (payload) => payload.id,
        payload: IdPayload,
    })
    .add({
        tag: "MessageArchived",
        primaryKey: (payload) => payload.id,
        payload: IdPayload,
    })
    .add({
        tag: "MessageStarred",
        primaryKey: (payload) => payload.id,
        payload: IdPayload,
    })
    .add({
        tag: "DraftSaved",
        primaryKey: (payload) => payload.id,
        payload: DraftPayload,
    })
    .add({
        tag: "DraftDiscarded",
        primaryKey: (payload) => payload.id,
        payload: IdPayload,
    })
    .add({
        tag: "DraftSent",
        primaryKey: (payload) => payload.id,
        payload: IdPayload,
    })
    .add({
        tag: "DraftQueued",
        primaryKey: (payload) => payload.id,
        payload: IdPayload,
    })

const schema = EventLog.schema(MailGroup)

const handlers = EventLog.group(MailGroup, (builder) =>
    builder
        .handle("MessageReceived", () => Effect.void)
        .handle("MessageRead", () => Effect.void)
        .handle("MessageArchived", () => Effect.void)
        .handle("MessageStarred", () => Effect.void)
        .handle("DraftSaved", () => Effect.void)
        .handle("DraftDiscarded", () => Effect.void)
        .handle("DraftSent", () => Effect.void)
        .handle("DraftQueued", () => Effect.void)
).pipe(Layer.provide(EventLog.layerRegistry))

const makeIdentity = (): {
    readonly publicKey: string
    readonly privateKey: Redacted.Redacted<Uint8Array<ArrayBuffer>>
} => {
    const stored = localStorage.getItem(IDENTITY_STORAGE_KEY)
    const publicKey = stored ?? randomHexId()
    if (stored === null) {
        localStorage.setItem(IDENTITY_STORAGE_KEY, publicKey)
    }
    const privateKey = new Uint8Array(new ArrayBuffer(32))
    crypto.getRandomValues(privateKey)
    return { publicKey, privateKey: Redacted.make(privateKey) }
}

const log_layer = EventLog.layer(schema, handlers).pipe(
    Layer.provide(EventJournal.layerIndexedDb({ database: DATABASE_NAME })),
    Layer.provide(Layer.sync(EventLog.Identity, makeIdentity))
)

const withLog = <A, E>(effect: Effect.Effect<A, E, EventLog.EventLog>) =>
    effect.pipe(Effect.provide(log_layer), Effect.scoped)

export const receiveMessage = (input: {
    readonly id: string
    readonly subject: string
    readonly sender: string
    readonly body: string
}) =>
    withLog(
        Effect.gen(function* () {
            const log = yield* EventLog.EventLog
            yield* log.write({
                schema,
                event: "MessageReceived",
                payload: input,
            })
        })
    )

export const markRead = (id: string) =>
    withLog(
        Effect.gen(function* () {
            const log = yield* EventLog.EventLog
            yield* log.write({ schema, event: "MessageRead", payload: { id } })
        })
    )

export const archiveMessage = (id: string) =>
    withLog(
        Effect.gen(function* () {
            const log = yield* EventLog.EventLog
            yield* log.write({
                schema,
                event: "MessageArchived",
                payload: { id },
            })
        })
    )

export const toggleStarred = (id: string) =>
    withLog(
        Effect.gen(function* () {
            const log = yield* EventLog.EventLog
            yield* log.write({
                schema,
                event: "MessageStarred",
                payload: { id },
            })
        })
    )

export const saveDraft = (draft: Omit<MailDraft, "updated_at">) =>
    withLog(
        Effect.gen(function* () {
            const log = yield* EventLog.EventLog
            yield* log.write({
                schema,
                event: "DraftSaved",
                payload: draft,
            })
        })
    )

export const discardDraft = (id: string) =>
    withLog(
        Effect.gen(function* () {
            const log = yield* EventLog.EventLog
            yield* log.write({
                schema,
                event: "DraftDiscarded",
                payload: { id },
            })
        })
    )

export const sendDraft = (draft: Omit<MailDraft, "updated_at">) =>
    withLog(
        Effect.gen(function* () {
            const log = yield* EventLog.EventLog
            yield* log.write({
                schema,
                event: "DraftSaved",
                payload: draft,
            })
            yield* log.write({
                schema,
                event: "DraftSent",
                payload: { id: draft.id },
            })
        })
    )

export const replay = withLog(
    Effect.gen(function* () {
        const log = yield* EventLog.EventLog
        const existing = yield* log.entries
        if (existing.length === 0) {
            for (const message of initialModel.messages) {
                yield* log.write({
                    schema,
                    event: "MessageReceived",
                    payload: {
                        id: message.id,
                        subject: message.subject,
                        sender: message.sender,
                        body: message.body,
                    },
                })
                if (message.read) {
                    yield* log.write({
                        schema,
                        event: "MessageRead",
                        payload: { id: message.id },
                    })
                }
                if (message.starred) {
                    yield* log.write({
                        schema,
                        event: "MessageStarred",
                        payload: { id: message.id },
                    })
                }
            }
        }
        const entries = [...(yield* log.entries)].sort(
            (left, right) =>
                left.createdAtMillis - right.createdAtMillis ||
                left.idString.localeCompare(right.idString)
        )
        const messages = new Map<string, MailMessage>()
        const drafts = new Map<string, MailDraft>()
        const outbox = new Map<string, OutboxItem>()

        for (const entry of entries) {
            if (entry.event === "MessageReceived") {
                const payload = yield* S.decodeUnknownEffect(received_codec)(
                    entry.payload
                )
                messages.set(payload.id, {
                    ...payload,
                    body: payload.body ?? "",
                    read: false,
                    starred: false,
                    folder: "inbox",
                    received_at: entry.createdAtMillis,
                })
            } else if (entry.event === "MessageRead") {
                const payload = yield* S.decodeUnknownEffect(id_codec)(
                    entry.payload
                )
                const message = messages.get(payload.id)
                if (message !== undefined) {
                    messages.set(payload.id, { ...message, read: true })
                }
            } else if (entry.event === "MessageArchived") {
                const payload = yield* S.decodeUnknownEffect(id_codec)(
                    entry.payload
                )
                const message = messages.get(payload.id)
                if (message !== undefined) {
                    messages.set(payload.id, {
                        ...message,
                        folder: "archive",
                    })
                }
            } else if (entry.event === "MessageStarred") {
                const payload = yield* S.decodeUnknownEffect(id_codec)(
                    entry.payload
                )
                const message = messages.get(payload.id)
                if (message !== undefined) {
                    messages.set(payload.id, {
                        ...message,
                        starred: !message.starred,
                    })
                }
            } else if (entry.event === "DraftSaved") {
                const payload = yield* S.decodeUnknownEffect(draft_codec)(
                    entry.payload
                )
                drafts.set(payload.id, {
                    ...payload,
                    updated_at: entry.createdAtMillis,
                })
            } else if (entry.event === "DraftDiscarded") {
                const payload = yield* S.decodeUnknownEffect(id_codec)(
                    entry.payload
                )
                drafts.delete(payload.id)
            } else if (entry.event === "DraftSent") {
                const payload = yield* S.decodeUnknownEffect(id_codec)(
                    entry.payload
                )
                const draft = drafts.get(payload.id)
                if (draft !== undefined) {
                    messages.set(payload.id, {
                        id: draft.id,
                        subject: draft.subject,
                        sender: draft.to,
                        body: draft.body,
                        read: true,
                        starred: false,
                        folder: "sent",
                        received_at: entry.createdAtMillis,
                    })
                    drafts.delete(payload.id)
                }
            } else if (entry.event === "DraftQueued") {
                const payload = yield* S.decodeUnknownEffect(id_codec)(
                    entry.payload
                )
                const draft = drafts.get(payload.id)
                if (draft !== undefined) {
                    outbox.set(payload.id, {
                        id: draft.id,
                        to: draft.to,
                        subject: draft.subject,
                        body: draft.body,
                        queued_at: entry.createdAtMillis,
                    })
                    drafts.delete(payload.id)
                }
            }
        }

        return {
            messages: [...messages.values()],
            drafts: [...drafts.values()],
            outbox: [...outbox.values()],
        } satisfies StoredMailroom
    })
)
