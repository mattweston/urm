import { Effect, Layer } from "effect"

import {
    ActiveDomainRequestContext,
    AuthenticatedRequestContext,
} from "@urm/contracts/auth-legacy"
import { authRateLimitKey, checkAuthRateLimit } from "@urm/auth/rate-limiter"
import { type AuthPersistence } from "@urm/auth/auth-persistence"
import { ChatThreadRpcs } from "@urm/contracts/chat-bkup"
import {
    ConflictError,
    DatabaseError,
    type ChatContactParticipant,
    type ChatThread,
    type ChatTurn,
} from "@urm/domain/schemas/chat"

import {
    loadPublicChatSources,
    selectPublicChatSource,
    type PublicChatSource,
} from "./public-sources.ts"
import { ChatThreadRpcHandlersTag } from "./thread-tag.ts"
import {
    UrmbotLanguageModel,
    type UrmbotLanguageModelService,
} from "./urmbot-model.ts"

const maximumTurnsPerContactThread = 20
const maximumTurnsPerContactPerMinute = 10

type ContactThread = Readonly<{
    domain_id: string
    thread: ChatThread
    contact: ChatContactParticipant
    turns: ReadonlyArray<ChatTurn>
}>

const contactThreads = new Map<string, ContactThread>()

const createContactThread = (
    domain_id: string,
    participantId: string
): ContactThread => {
    const createdAt = Date.now()
    const threadId = crypto.randomUUID()
    const contact: ChatContactParticipant = {
        id: participantId,
        kind: "contact",
        label: "Contact",
    }

    return {
        domain_id,
        thread: {
            id: threadId,
            kind: "agent",
            participants: [
                contact,
                {
                    id: "urmbot",
                    kind: "agent",
                    label: "URMBot",
                },
            ],
            created_at: createdAt,
            updated_at: createdAt,
        },
        contact,
        turns: [],
    }
}

const userTurn = (
    threadId: string,
    text: string,
    author: ChatContactParticipant
): ChatTurn => ({
    id: crypto.randomUUID(),
    thread_id: threadId,
    author,
    status: "completed",
    text,
    blocks: [],
    citations: [],
    created_at: Date.now(),
})

const assistantTurn = (
    threadId: string,
    text: string,
    source: PublicChatSource
): ChatTurn => ({
    id: crypto.randomUUID(),
    thread_id: threadId,
    author: {
        id: "urmbot",
        kind: "agent",
        label: "URMBot",
    },
    status: "completed",
    text,
    blocks: [],
    citations: [
        {
            source_id: `public/${source.id}`,
            label: source.title,
        },
    ],
    created_at: Date.now(),
})

const contactOwnsThread = (
    contactThread: ContactThread,
    domain_id: string,
    contact_id: string
): boolean =>
    contactThread.domain_id === domain_id &&
    contactThread.contact.id === contact_id

const consumeContactTurn = (
    domain_id: string,
    contact_id: string
): Effect.Effect<boolean, never, AuthPersistence> =>
    checkAuthRateLimit({
        route: "chat/submit_turn",
        key: authRateLimitKey(["chat", domain_id, contact_id]),
        limit: maximumTurnsPerContactPerMinute,
        window_seconds: 60,
        block_seconds: 60,
    }).pipe(
        Effect.map((decision) => decision.allowed),
        Effect.catch(() => Effect.succeed(false))
    )

const answerWithUrmbot = (
    languageModel: UrmbotLanguageModelService,
    source: PublicChatSource,
    question: string,
    turns: ReadonlyArray<ChatTurn>
): Effect.Effect<string, DatabaseError> =>
    languageModel.answer({
        sourceTitle: source.title,
        sourceReference: source.sourceReference,
        sourceBody: source.body,
        question,
        conversationContext: turns
            .map((turn) => `${turn.author.label}: ${turn.text}`)
            .join("\n"),
    })

const ChatThreadRpcHandlersLive = Effect.gen(function* () {
    const languageModel = yield* UrmbotLanguageModel
    const publicSources = yield* loadPublicChatSources

    return ChatThreadRpcs.of({
        open_thread: () =>
            Effect.gen(function* () {
                const context = yield* AuthenticatedRequestContext
                const active_domain = yield* ActiveDomainRequestContext
                const contactThread = createContactThread(
                    active_domain.domainId,
                    context.contactId
                )

                contactThreads.set(contactThread.thread.id, contactThread)

                return contactThread.thread
            }),
        list_turns: ({ thread_id }) =>
            Effect.gen(function* () {
                const context = yield* AuthenticatedRequestContext
                const active_domain = yield* ActiveDomainRequestContext
                const contactThread = contactThreads.get(thread_id)

                if (
                    contactThread === undefined ||
                    !contactOwnsThread(
                        contactThread,
                        active_domain.domainId,
                        context.contactId
                    )
                ) {
                    return yield* Effect.fail(
                        new DatabaseError({ message: "Chat thread not found." })
                    )
                }

                return [...contactThread.turns]
            }),
        submit_turn: ({ data }) =>
            Effect.gen(function* () {
                const context = yield* AuthenticatedRequestContext
                const active_domain = yield* ActiveDomainRequestContext
                const maybeContactThread = contactThreads.get(data.thread_id)
                const contactThread =
                    maybeContactThread ??
                    createContactThread(
                        active_domain.domainId,
                        context.contactId
                    )

                if (
                    maybeContactThread !== undefined &&
                    !contactOwnsThread(
                        contactThread,
                        active_domain.domainId,
                        context.contactId
                    )
                ) {
                    return yield* Effect.fail(
                        new DatabaseError({ message: "Chat thread not found." })
                    )
                }

                if (
                    contactThread.turns.length >= maximumTurnsPerContactThread
                ) {
                    return yield* Effect.fail(
                        new ConflictError({
                            message: "This chat has reached its turn limit.",
                        })
                    )
                }

                const isAllowed = yield* consumeContactTurn(
                    active_domain.domainId,
                    context.contactId
                )

                if (!isAllowed) {
                    return yield* Effect.fail(
                        new ConflictError({
                            message:
                                "Please wait before sending another message.",
                        })
                    )
                }

                const submittedTurn = userTurn(
                    contactThread.thread.id,
                    data.text,
                    contactThread.contact
                )
                const source = selectPublicChatSource(publicSources, data.text)

                if (source === undefined) {
                    return yield* Effect.fail(
                        new DatabaseError({
                            message: "No public help source is available.",
                        })
                    )
                }
                const answer = yield* answerWithUrmbot(
                    languageModel,
                    source,
                    data.text,
                    [...contactThread.turns, submittedTurn]
                )
                const repliedTurn = assistantTurn(
                    contactThread.thread.id,
                    answer,
                    source
                )
                const nextContactThread: ContactThread = {
                    domain_id: contactThread.domain_id,
                    thread: {
                        ...contactThread.thread,
                        updated_at: repliedTurn.created_at,
                    },
                    contact: contactThread.contact,
                    turns: [...contactThread.turns, submittedTurn, repliedTurn],
                }

                contactThreads.set(
                    nextContactThread.thread.id,
                    nextContactThread
                )

                return {
                    thread: nextContactThread.thread,
                    user_turn: submittedTurn,
                    assistant_turn: repliedTurn,
                }
            }),
    })
})

export const ChatThreadRpcLive = ChatThreadRpcs.toLayer(
    ChatThreadRpcHandlersLive
)
export const ChatThreadRpcHandlersTagLive = Layer.effect(
    ChatThreadRpcHandlersTag,
    ChatThreadRpcHandlersLive
)
