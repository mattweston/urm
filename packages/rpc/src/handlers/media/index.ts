import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeMedia,
    DomainMedia,
    MediaLibrary,
    MediaRemote,
} from "@urm/contracts/media"
import { MediaRepository, type MediaPrincipal } from "./repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Media operation unavailable or access denied",
    })
export const MediaServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<MediaPrincipal, MediaRepository>(MediaLibrary, {
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
                                      MediaRepository,
                                      (repository) =>
                                          repository.load_library(principal)
                                  ),
                              },
                          ]
                }).pipe(Effect.mapError(failure)),
        }),
    ],
    queries: [
        RemoteServer.query(
            DomainMedia,
            ({
                input,
                principal,
            }: {
                input: typeof DomainMedia.Input.Type
                principal: MediaPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(MediaRepository, (repository) =>
                        repository.authorize_media(principal, input.domain_id)
                    )
                    return {
                        edges: [
                            {
                                entity: MediaLibrary.name,
                                id: input.domain_id,
                                key: entityKey(
                                    MediaLibrary.name,
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
            ChangeMedia,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeMedia.Input.Type
                principal: MediaPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(MediaRepository, (repository) =>
                        repository.authorize_media(
                            principal,
                            input.domain_id,
                            true
                        )
                    )
                    const library = yield* Effect.flatMap(
                        MediaRepository,
                        (repository) =>
                            repository.change_media(principal, input.action)
                    )
                    return {
                        output: { domain_id: library.id },
                        entities: [
                            Entity.patch(MediaLibrary.ref(library.id), library),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(MediaRemote, MediaServer)
// Public-site consumers remain on their retained contract until their own port.
export { findPublicGalleryImageUrl } from "../media-legacy/repository.ts"

export { MediaRepository, MediaRepositoryLive } from "./repository.ts"
