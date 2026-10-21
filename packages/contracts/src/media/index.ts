import { LibraryRecord, MediaAction } from "@urm/domain/media"
export {
    VideoDetails,
    Video,
    LibraryRecord,
    ImageDetails,
    MediaAction,
} from "@urm/domain/media"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"
export { Image } from "@urm/domain/schemas/media"
export const MediaLibrary = Entity.make("MediaLibrary", LibraryRecord)
export const LibrarySummary = MediaLibrary.select({
    id: true,
    images: true,
    tags: true,
    entity_tags: true,
    videos: true,
})

export const DomainMedia = Query.make("DomainMedia", {
    Input: { domain_id: Schema.String },
    Result: MediaLibrary,
})
export const ChangeMedia = Mutation.make("ChangeMedia", {
    Input: { domain_id: Schema.String, action: MediaAction },
    Output: { domain_id: Schema.String },
})
export const MediaRemote = Remote.define({
    entities: [MediaLibrary],
    queries: [DomainMedia],
    mutations: [ChangeMedia],
})
