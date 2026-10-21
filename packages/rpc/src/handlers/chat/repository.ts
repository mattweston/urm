/** # Chat contracts */
import { randomUUID } from "node:crypto"
import { Context, Effect, Layer, Schema } from "effect"
import { sql } from "drizzle-orm"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    ChatMessage,
    ChatCatalogRecord,
    ChatAdmin,
    ChatWriteError,
    SendChatInput,
    chat_catalog_id,
    mentions_urmbot,
} from "@urm/domain/chat"
import { upsert_directory_tag } from "../tags/directory.ts"
export interface ChatPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new ChatWriteError({
        message:
            "Chat or mentioned administrator is unavailable or access was denied.",
    })
const authorize = Effect.fn("Chat.authorize")(function* (
    principal: ChatPrincipal
) {
    yield* require_account_domain(principal, principal.domain_id, true, null)
})
/**
 * Loads the newest bounded conversation window, returned in chronological order.
 * Read access requires the same workspace write authority as sending because this
 * is an administrator conversation, not a public or ordinary-member channel.
 */
const load_catalog = Effect.fn("Chat.load")(function* (
    principal: ChatPrincipal
) {
    yield* authorize(principal)
    const messages = yield* query_rows(
        ChatMessage,
        sql`SELECT id,domain_id,author_kind,author_user_id,author_name,body,mentions,mentioned_user_ids,created_at::float8 AS created_at FROM (SELECT * FROM chat_messages WHERE domain_id=${principal.domain_id} ORDER BY created_at DESC,id DESC LIMIT 100) latest ORDER BY created_at,id`
    )
    const admins = yield* query_rows(
        ChatAdmin,
        sql`SELECT u.id AS user_id,coalesce(u.name,u.email,'Admin') AS name
        FROM organization_members m JOIN domains d ON d.organization_id=m.organization_id JOIN users u ON u.id=m.user_id
        WHERE d.id=${principal.domain_id} AND m.status='active' AND m.deleted_at IS NULL AND u.deleted_at IS NULL
        AND m.role IN ('owner','admin','sysadmin') AND u.id<>${principal.account_id}
        ORDER BY m.created_at,m.id LIMIT 100`
    )
    return ChatCatalogRecord.make({
        id: chat_catalog_id(principal.domain_id, principal.account_id),
        messages,
        admins,
    })
})
const send = Effect.fn("Chat.send")(function* (
    principal: ChatPrincipal,
    input: SendChatInput
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            yield* authorize(principal)
            const message =
                yield* Schema.decodeUnknownEffect(SendChatInput)(input)
            const mentioned_ids = [
                ...new Set(message.mentioned_user_ids),
            ].sort()
            const previous = yield* query_rows(
                ChatMessage,
                sql`SELECT id,domain_id,author_kind,author_user_id,author_name,body,mentions,mentioned_user_ids,created_at::float8 AS created_at FROM chat_messages WHERE id=${message.id}`
            )
            if (previous.length > 0) {
                const row = previous[0]
                if (
                    row?.domain_id !== d ||
                    row.author_user_id !== principal.account_id ||
                    row.body !== message.body ||
                    JSON.stringify(row.mentioned_user_ids) !==
                        JSON.stringify(mentioned_ids)
                )
                    return yield* Effect.fail(denied())
                return yield* load_catalog(principal)
            }
            const mentioned_tags: string[] = []
            for (const user_id of mentioned_ids) {
                const rows = yield* query_rows(
                    Schema.Struct({
                        id: Schema.String,
                        name: Schema.String,
                        email: Schema.NullOr(Schema.String),
                        role: Schema.String,
                    }),
                    sql`
                SELECT u.id,coalesce(u.name,u.email,'Admin') AS name,u.email,m.role
                FROM organization_members m JOIN domains d ON d.organization_id=m.organization_id JOIN users u ON u.id=m.user_id
                WHERE d.id=${d} AND u.id=${user_id} AND m.status='active' AND m.deleted_at IS NULL AND u.deleted_at IS NULL AND m.role IN ('owner','admin','sysadmin') FOR SHARE OF m,u`
                )
                const person = rows[0]
                if (!person) return yield* Effect.fail(denied())
                mentioned_tags.push(
                    yield* upsert_directory_tag(
                        d,
                        `user:${person.id}`,
                        "person",
                        `@${person.name}`,
                        "var(--chart-4)",
                        [person.role, person.email]
                            .filter((value) => value !== null)
                            .join(" · ")
                    )
                )
            }
            const authors = yield* query_rows(
                Schema.Struct({ name: Schema.String }),
                sql`SELECT coalesce(name,email,'Admin') AS name FROM users WHERE id=${principal.account_id}`
            )
            const author = authors[0]
            if (!author) return yield* Effect.fail(denied())
            const now = Date.now()
            yield* tx.query(sql`INSERT INTO chat_messages (id,domain_id,author_kind,author_user_id,author_name,body,mentions,mentioned_user_ids,created_at)
            VALUES (${message.id},${d},'admin',${principal.account_id},${author.name},${message.body},${JSON.stringify(mentions_urmbot(message.body) ? ["urmbot"] : [])}::jsonb,${JSON.stringify(mentioned_ids)}::jsonb,${now})`)
            for (const tag_id of mentioned_tags)
                yield* tx.query(
                    sql`INSERT INTO entity_tags (id,domain_id,entity_type,entity_id,tag_id,created_at,updated_at) VALUES (${randomUUID()},${d},'chat_message',${message.id},${tag_id},${now},${now})`
                )
            return yield* load_catalog(principal)
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        load_catalog: (principal: ChatPrincipal) =>
            load_catalog(principal).pipe(Effect.provideService(Sql, db)),
        send: (principal: ChatPrincipal, message: SendChatInput) =>
            send(principal, message).pipe(Effect.provideService(Sql, db)),
    }
})
export class ChatRepository extends Context.Service<
    ChatRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/ChatRepository") {}
export const ChatRepositoryLive = Layer.effect(ChatRepository, make)
