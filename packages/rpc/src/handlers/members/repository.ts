import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { Sql, query_rows } from "@urm/db/sql"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import {
    MemberRecord,
    MembersWriteError,
    type SaveMemberCommand,
} from "@urm/domain/members"
export interface Principal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new MembersWriteError({
        message: "Member operation unavailable or access denied",
    })
const scope = Effect.fn("Members.authorize")(function* (
    principal: Principal,
    domain_id: string,
    write = false
) {
    if (principal.domain_id !== domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write)
})
const read = Effect.fn("Members.read")(function* (
    principal: Principal,
    ids: ReadonlyArray<string>
) {
    yield* scope(principal, principal.domain_id)
    if (ids.length === 0) return []
    return yield* query_rows(
        MemberRecord,
        sql`SELECT id,domain_id,first,last,twitter,avatar,notes,updated_at::float8 AS updated_at
        FROM members WHERE domain_id=${principal.domain_id} AND id IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`,`
        )})`
    )
})
const save = Effect.fn("Members.save")(function* (
    principal: Principal,
    input: SaveMemberCommand,
    create: boolean
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const db = yield* Sql
            yield* scope(principal, input.domain_id, true)
            yield* db.query(
                sql`SELECT id FROM domains WHERE id=${input.domain_id} FOR UPDATE`
            )
            const current = (yield* read(principal, [input.id]))[0]
            if (create && current !== undefined) {
                if (
                    current.first !== input.first ||
                    current.last !== input.last ||
                    current.twitter !== input.twitter ||
                    current.avatar !== input.avatar ||
                    current.notes !== input.notes
                )
                    return yield* Effect.fail(denied())
            } else if (create) {
                const now = Date.now()
                yield* db.query(sql`INSERT INTO members (id,domain_id,first,last,twitter,avatar,notes,created_at,updated_at)
                VALUES (${input.id},${input.domain_id},${input.first},${input.last},${input.twitter},${input.avatar},${input.notes},${now},${now})`)
            } else {
                if (current === undefined) return yield* Effect.fail(denied())
                yield* db.query(sql`UPDATE members SET first=${input.first},last=${input.last},twitter=${input.twitter},avatar=${input.avatar},notes=${input.notes},updated_at=${Date.now()}
                WHERE id=${input.id} AND domain_id=${input.domain_id}`)
            }
            const records = yield* read(principal, [input.id])
            return records
        })
    )
})
const list_members = Effect.fn("Members.list")(function* (
    principal: Principal,
    domain_id: string,
    count: number
) {
    yield* scope(principal, domain_id)
    return yield* query_rows(
        Schema.Struct({ id: Schema.String }),
        sql`SELECT id FROM members WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id DESC LIMIT ${count}`
    )
})
const delete_member = Effect.fn("Members.delete")(function* (
    principal: Principal,
    domain_id: string,
    id: string
) {
    const db = yield* Sql
    yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            yield* scope(principal, domain_id, true)
            yield* tx.query(
                sql`DELETE FROM members WHERE id=${id} AND domain_id=${domain_id}`
            )
        })
    )
})

const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    return {
        scope: (...args: Parameters<typeof scope>) =>
            scope(...args).pipe(Effect.provideService(Sql, db)),
        read: (...args: Parameters<typeof read>) =>
            read(...args).pipe(Effect.provideService(Sql, db)),
        save: (...args: Parameters<typeof save>) =>
            save(...args).pipe(Effect.provideService(Sql, db)),
        list_members: (...args: Parameters<typeof list_members>) =>
            list_members(...args).pipe(Effect.provideService(Sql, db)),
        delete_member: (...args: Parameters<typeof delete_member>) =>
            delete_member(...args).pipe(Effect.provideService(Sql, db)),
    }
})

export class MembersRepository extends Context.Service<
    MembersRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/MembersRepository") {}
export const MembersRepositoryLive = Layer.effect(
    MembersRepository,
    make_repository
)
