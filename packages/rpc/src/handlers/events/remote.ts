import { EventWriteError } from "@urm/domain/events"
import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeEvents,
    DomainEvents,
    EventCatalog,
    EventsRemote,
} from "@urm/contracts/events"
import {
    EventsLibraryRepository,
    type EventsPrincipal,
} from "./postgres-repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof EventWriteError
                ? error.message
                : "Event operation unavailable or access denied",
    })
export const EventsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<EventsPrincipal, EventsLibraryRepository>(
            EventCatalog,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.domain_id))
                            return yield* Effect.fail(failure())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id: principal.domain_id,
                                      values: yield* Effect.flatMap(
                                          EventsLibraryRepository,
                                          (repository) =>
                                              repository.load_catalog(principal)
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            DomainEvents,
            ({
                input,
                principal,
            }: {
                input: typeof DomainEvents.Input.Type
                principal: EventsPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(
                        EventsLibraryRepository,
                        (repository) =>
                            repository.authorize_events(
                                principal,
                                input.domain_id
                            )
                    )
                    return {
                        edges: [
                            {
                                entity: EventCatalog.name,
                                id: input.domain_id,
                                key: entityKey(
                                    EventCatalog.name,
                                    input.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            ChangeEvents,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeEvents.Input.Type
                principal: EventsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.account_id !== undefined &&
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(
                        EventsLibraryRepository,
                        (repository) =>
                            repository.authorize_events(
                                principal,
                                input.domain_id,
                                true
                            )
                    )
                    const library = yield* Effect.flatMap(
                        EventsLibraryRepository,
                        (repository) =>
                            repository.change_events(principal, input.action)
                    )
                    return {
                        output: { domain_id: library.id },
                        entities: [
                            Entity.patch(EventCatalog.ref(library.id), library),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(EventsRemote, EventsServer)

export {
    EventsLibraryRepository,
    EventsLibraryRepositoryLive,
} from "./postgres-repository.ts"
