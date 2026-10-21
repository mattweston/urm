import { Schema } from "effect"

import { Image } from "./schemas/media.ts"

import { Tag, EntityTag } from "./schemas/tags.ts"

const bounded = (max: number) => Schema.String.check(Schema.isMaxLength(max))
const required = (max: number) => bounded(max).check(Schema.isMinLength(1))
export const VideoDetails = Schema.Struct({
    slug: required(100).check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
    title: required(255),
    embed_url: required(2048),
    thumbnail_src: required(2048),
    youtube_id: Schema.NullOr(required(100)),
})
export const Video = Schema.Struct({
    id: Schema.String,
    slug: Schema.String,
    title: Schema.String,
    embed_url: Schema.String,
    thumbnail_src: Schema.String,
    youtube_id: Schema.NullOr(Schema.String),
    order_position: Schema.Number,
    updated_at: Schema.Number,
})
export const LibraryRecord = Schema.Struct({
    id: Schema.String,
    images: Schema.Array(Image),
    tags: Schema.Array(Tag),
    entity_tags: Schema.Array(EntityTag),
    videos: Schema.Array(Video),
})
export type LibraryRecord = typeof LibraryRecord.Type
export const ImageDetails = Schema.Struct({
    alt: bounded(2000),
    text: bounded(20000),
    category: Schema.NullOr(bounded(255)),
})
const positions = Schema.Array(
    Schema.Struct({ id: Schema.String, order_position: Schema.Number })
).check(Schema.isMaxLength(100))
export const MediaAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("create_image"),
        id: Schema.String,
        url: required(4000),
        ...ImageDetails.fields,
        width: Schema.NullOr(Schema.Number),
        height: Schema.NullOr(Schema.Number),
        order_position: Schema.Number,
    }),
    Schema.Struct({
        _tag: Schema.Literal("update_image"),
        id: Schema.String,
        ...ImageDetails.fields,
    }),
    Schema.Struct({ _tag: Schema.Literal("delete_image"), id: Schema.String }),
    Schema.Struct({ _tag: Schema.Literal("reorder_images"), positions }),
    Schema.Struct({
        _tag: Schema.Literal("create_video"),
        id: Schema.String,
        ...VideoDetails.fields,
        order_position: Schema.Number,
    }),
    Schema.Struct({
        _tag: Schema.Literal("update_video"),
        id: Schema.String,
        ...VideoDetails.fields,
    }),
    Schema.Struct({ _tag: Schema.Literal("delete_video"), id: Schema.String }),
    Schema.Struct({ _tag: Schema.Literal("reorder_videos"), positions }),
    Schema.Struct({
        _tag: Schema.Literal("add_tag"),
        image_id: Schema.String,
        tag_id: Schema.String,
    }),
    Schema.Struct({
        _tag: Schema.Literal("create_tag"),
        image_id: Schema.String,
        name: Schema.Trimmed.check(
            Schema.isMinLength(1),
            Schema.isMaxLength(255)
        ),
        color: required(50),
    }),
    Schema.Struct({ _tag: Schema.Literal("remove_tag"), id: Schema.String }),
])
export type MediaAction = typeof MediaAction.Type

export { Image } from "./schemas/media.ts"

export type VideoDetails = typeof VideoDetails.Type

export type Video = typeof Video.Type

export type ImageDetails = typeof ImageDetails.Type

export class MediaWriteError extends Schema.TaggedErrorClass<MediaWriteError>()(
    "MediaWriteError",
    { message: Schema.String }
) {}
