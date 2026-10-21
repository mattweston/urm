import { Schema as S } from "effect"

export const VideoSlug = S.String
export type VideoSlug = typeof VideoSlug.Type

export const Video = S.Struct({
    id: S.String,
    slug: VideoSlug,
    title: S.String,
    embed_url: S.String,
    thumbnail_src: S.String,
    youtube_id: S.optionalKey(S.String),
    order_position: S.Number,
    updated_at: S.Number,
})
export type Video = typeof Video.Type

export const video_for_slug = (
    videos: ReadonlyArray<Video>,
    slug: VideoSlug
): Video | undefined => videos.find((video) => video.slug === slug) ?? videos[0]
