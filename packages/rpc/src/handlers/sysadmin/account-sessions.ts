import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import type { AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    SysadminSessionsEntity,
    SysadminSessionsQuery,
    SysadminRemote,
} from "@urm/contracts/sysadmin"
import { SysadminAccountSession } from "@urm/domain/schemas/sysadmin-sessions"

interface Principal extends AccountPrincipal {
    readonly domain_id: string
}
const Key = Schema.Struct({
    domain_id: Schema.String,
    all_tenants: Schema.Boolean,
    as_of: Schema.Number,
})
const Access = Schema.Struct({
    organization_id: Schema.String,
    scope_name: Schema.String,
    can_view_all: Schema.Boolean,
})
const Row = Schema.Struct({
    id: Schema.String,
    user_id: Schema.String,
    user_name: Schema.NullOr(Schema.String),
    user_email: Schema.NullOr(Schema.String),
    status: SysadminAccountSession.fields.status,
    created_at: Schema.Number,
    last_seen_at: Schema.Number,
    expires_at: Schema.Number,
    revoked_at: Schema.NullOr(Schema.Number),
})
const denied = () =>
    new RemoteServerError({ message: "Sysadmin access denied" })
const key = (input: typeof Key.Type) => JSON.stringify(input)
export const authorize_sysadmin_scope = Effect.fn("Sysadmin.authorize")(
    function* (principal: Principal, input: typeof Key.Type) {
        if (
            input.domain_id !== principal.domain_id ||
            !Number.isFinite(input.as_of)
        )
            return yield* Effect.fail(denied())
        const rows = yield* query_rows(
            Access,
            sql`SELECT d.organization_id, o.name AS scope_name,
            COALESCE(u.platform_role = 'platform_sysadmin',false) AS can_view_all
        FROM account_sessions s
        JOIN auth_accounts a ON a.id=s.account_id
        JOIN users u ON u.id=a.id
        JOIN domains d ON d.id=${input.domain_id}
        JOIN organizations o ON o.id=d.organization_id
        WHERE s.id=${principal.session_id} AND s.account_id=${principal.account_id}
            AND s.revoked_at IS NULL AND s.expires_at>${Date.now()}
            AND s.absolute_expires_at>${Date.now()} AND a.disabled_at IS NULL
            AND u.deleted_at IS NULL AND o.deleted_at IS NULL
            AND (u.platform_role='platform_sysadmin' OR EXISTS (
                SELECT 1 FROM organization_members m
                WHERE m.organization_id=d.organization_id AND m.user_id=u.id
                    AND m.role='sysadmin' AND m.status='active' AND m.deleted_at IS NULL
            )) LIMIT 1`
        )
        const access = rows[0]
        if (!access || (input.all_tenants && !access.can_view_all))
            return yield* Effect.fail(denied())
        return access
    }
)
const load = Effect.fn("Sysadmin.loadSessions")(function* (
    principal: Principal,
    input: typeof Key.Type
) {
    const access = yield* authorize_sysadmin_scope(principal, input)
    const rows = yield* query_rows(
        Row,
        sql`SELECT s.id, s.account_id AS user_id, u.name AS user_name,
            a.login_email AS user_email,
            CASE WHEN s.revoked_at IS NOT NULL THEN 'revoked'
                 WHEN s.expires_at<=${input.as_of} THEN 'expired'
                 ELSE 'active' END AS status,
            s.created_at::float8 AS created_at,
            s.last_seen_at::float8 AS last_seen_at,
            s.expires_at::float8 AS expires_at,
            s.revoked_at::float8 AS revoked_at
        FROM account_sessions s
        JOIN auth_accounts a ON a.id=s.account_id
        JOIN users u ON u.id=a.id
        WHERE a.disabled_at IS NULL AND u.deleted_at IS NULL
            AND (${input.all_tenants} OR EXISTS (
                SELECT 1 FROM organization_members m
                WHERE m.user_id=s.account_id AND m.organization_id=${access.organization_id}
                    AND m.status='active' AND m.deleted_at IS NULL
            ))
        ORDER BY s.last_seen_at DESC,s.id LIMIT 101`
    )
    const sessions = rows.slice(0, 100).map((session) => ({
        id: session.id,
        user_id: session.user_id,
        status: session.status,
        created_at: session.created_at,
        last_seen_at: session.last_seen_at,
        expires_at: session.expires_at,
        ...(session.user_name === null ? {} : { user_name: session.user_name }),
        ...(session.user_email === null
            ? {}
            : { user_email: session.user_email }),
        ...(session.revoked_at === null
            ? {}
            : { revoked_at: session.revoked_at }),
    }))
    return {
        id: key(input),
        sessions,
        as_of: input.as_of,
        has_more: rows.length > 100,
        scope_name: input.all_tenants ? "All tenants" : access.scope_name,
        can_view_all: access.can_view_all,
    }
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize: (principal: Principal, input: typeof Key.Type) =>
            authorize_sysadmin_scope(principal, input).pipe(
                Effect.provideService(Sql, db)
            ),
        load: (principal: Principal, input: typeof Key.Type) =>
            load(principal, input).pipe(Effect.provideService(Sql, db)),
    }
})
export class SysadminSessionsRepository extends Context.Service<
    SysadminSessionsRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/SysadminSessionsRepository") {}
export const SysadminSessionsRepositoryLive = Layer.effect(
    SysadminSessionsRepository,
    make
)
const terminal: Boundary = { _tag: "Terminal" }
export const SysadminSessionsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<Principal, SysadminSessionsRepository>(
            SysadminSessionsEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.forEach(ids, (id) =>
                        Effect.gen(function* () {
                            const parsed = yield* Effect.try(() =>
                                JSON.parse(id)
                            )
                            const input =
                                yield* Schema.decodeUnknownEffect(Key)(parsed)
                            const repository = yield* SysadminSessionsRepository
                            return {
                                id,
                                values: yield* repository.load(
                                    principal,
                                    input
                                ),
                            }
                        })
                    ).pipe(Effect.mapError(denied)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            SysadminSessionsQuery,
            ({
                input,
                principal,
            }: {
                input: typeof Key.Type
                principal: Principal
            }) =>
                Effect.gen(function* () {
                    const repository = yield* SysadminSessionsRepository
                    yield* repository.authorize(principal, input)
                    const id = key(input)
                    return {
                        edges: [
                            {
                                entity: SysadminSessionsEntity.name,
                                id,
                                key: entityKey(SysadminSessionsEntity.name, id),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(denied))
        ),
    ],
})
RemoteServer.validate(SysadminRemote, SysadminSessionsServer)
export const sysadmin_sessions_handlers = (principal: Principal) =>
    RemoteServer.handlers(SysadminSessionsServer, principal)
