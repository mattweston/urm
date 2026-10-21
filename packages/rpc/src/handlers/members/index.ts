import { MembersRepository, type Principal } from "./repository.ts"
import { Effect } from "effect"
import {
    CreateMember,
    DeleteMember,
    DomainMembers,
    MembersRemote,
    RemoteMember,
    UpdateMember,
} from "@urm/contracts/members"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"

const denied = () =>
    new RemoteServerError({
        message: "Member operation unavailable or access denied",
    })
const source = RemoteServer.entity<Principal, MembersRepository>(RemoteMember, {
    read: ({ principal, ids }) =>
        Effect.flatMap(MembersRepository, (repository) =>
            repository.read(principal, ids)
        ).pipe(
            Effect.map((records) =>
                records.map((record) => ({
                    id: record.id,
                    values: { ...record },
                }))
            ),
            Effect.mapError(denied)
        ),
})
const terminal: Boundary = { _tag: "Terminal" }
const list = RemoteServer.query(
    DomainMembers,
    ({
        input,
        window,
        principal,
    }: {
        input: typeof DomainMembers.Input.Type
        window: {
            readonly first?: number | undefined
            readonly after?: string | undefined
            readonly last?: number | undefined
            readonly before?: string | undefined
        }
        principal: Principal
    }) =>
        Effect.gen(function* () {
            yield* Effect.flatMap(MembersRepository, (repository) =>
                repository.scope(principal, input.domain_id)
            )
            const count = window.first ?? 200
            if (
                !Number.isInteger(count) ||
                count < 1 ||
                count > 200 ||
                window.after !== undefined ||
                window.before !== undefined ||
                window.last !== undefined
            )
                return yield* Effect.fail(denied())
            const records = yield* Effect.flatMap(
                MembersRepository,
                (repository) =>
                    repository.list_members(principal, input.domain_id, count)
            )
            return {
                edges: records.map(({ id }) => ({
                    entity: RemoteMember.name,
                    id,
                    key: entityKey(RemoteMember.name, id),
                })),
                start: terminal,
                end: terminal,
            }
        }).pipe(Effect.mapError(denied))
)

const create = RemoteServer.mutation(
    CreateMember,
    ({
        input,
        principal,
    }: {
        input: typeof CreateMember.Input.Type
        principal: Principal
    }) =>
        Effect.flatMap(MembersRepository, (repository) =>
            repository.save(principal, input, true)
        ).pipe(
            Effect.map((records) => ({
                output: { id: input.id },
                entities: records.map((record) =>
                    Entity.patch(RemoteMember.ref(record.id), { ...record })
                ),
            })),
            Effect.mapError(denied)
        )
)
const update = RemoteServer.mutation(
    UpdateMember,
    ({
        input,
        principal,
    }: {
        input: typeof UpdateMember.Input.Type
        principal: Principal
    }) =>
        Effect.flatMap(MembersRepository, (repository) =>
            repository.save(principal, input, false)
        ).pipe(
            Effect.map((records) => ({
                output: { id: input.id },
                entities: records.map((record) =>
                    Entity.patch(RemoteMember.ref(record.id), { ...record })
                ),
            })),
            Effect.mapError(denied)
        )
)
const remove = RemoteServer.mutation(
    DeleteMember,
    ({
        input,
        principal,
    }: {
        input: typeof DeleteMember.Input.Type
        principal: Principal
    }) =>
        Effect.gen(function* () {
            yield* Effect.flatMap(MembersRepository, (repository) =>
                repository.delete_member(principal, input.domain_id, input.id)
            )
            return { output: { id: input.id } }
        }).pipe(Effect.mapError(denied))
)
export const MembersServer = RemoteServer.make({
    entities: [source],
    queries: [list],
    mutations: [create, update, remove],
})
RemoteServer.validate(MembersRemote, MembersServer)
export const members_remote_handlers = (principal: Principal) =>
    RemoteServer.handlers(MembersServer, principal, {
        maxIdsPerEntity: 200,
        maxDepth: 1,
    })

export { MembersRepository, MembersRepositoryLive } from "./repository.ts"
