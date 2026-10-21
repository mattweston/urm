/**
 * # Media RPC Index
 */

import { Effect, type Schema } from "effect"
import {
    Image,
    CreateImageInput,
    DatabaseError,
    NotFoundError,
    ConflictError,
    UpdateImageInput,
} from "@urm/domain/schemas/media"
import type { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"

// Extract types from Effect schemas
export type ImageType = Schema.Schema.Type<typeof Image>

export {
    MediaRpcs,
    ImagesListRpc,
    ImagesGetRpc,
    ImagesCreateRpc,
    ImagesUpdateRpc,
    ImagesDeleteRpc,
} from "@urm/contracts/media-legacy"

export { MediaRpcLive, MediaRpcHandlersTagLive } from "./handlers.js"
export { MediaRpcHandlersTag } from "./tag.ts"

export { ImagesRepository } from "@urm/contracts/repositories/media"
export {
    ImagesRepositoryLive,
    findPublicGalleryImageUrl,
} from "./repository.js"

export type MediaRpcHandlers = {
    "images.list": (params: {
        after?: number
    }) => Effect.Effect<ImageType[], DatabaseError, ActiveDomainRequestContext>
    "images.get": (params: {
        id: string
    }) => Effect.Effect<
        ImageType,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "images.create": (params: {
        data: Schema.Schema.Type<typeof CreateImageInput>
    }) => Effect.Effect<
        { item: ImageType; txid: number },
        DatabaseError | ConflictError,
        ActiveDomainRequestContext
    >
    "images.update": (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateImageInput>
    }) => Effect.Effect<
        { item: ImageType; txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "images.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
}
