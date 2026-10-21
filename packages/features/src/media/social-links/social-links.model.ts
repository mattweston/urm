import { Schema as S } from "effect"

export const SocialPlatform = S.Literals([
    "Facebook",
    "Instagram",
    "YouTube",
    "X",
])
export type SocialPlatform = typeof SocialPlatform.Type

export const SocialLink = S.Struct({
    platform: SocialPlatform,
    url: S.String,
})
export type SocialLink = typeof SocialLink.Type

export const SocialLinksEditorState = S.Literals([
    "Viewing",
    "Editing",
    "Saving",
])

export const Model = S.Struct({
    drafts: S.Array(SocialLink),
    saved_snapshot: S.Array(SocialLink),
    editor_state: SocialLinksEditorState,
    error: S.String,
})
export type Model = typeof Model.Type

export const default_social_links: ReadonlyArray<SocialLink> = [
    {
        platform: "Facebook",
        url: "https://www.facebook.com/",
    },
    {
        platform: "Instagram",
        url: "https://www.instagram.com/",
    },
    {
        platform: "YouTube",
        url: "https://www.youtube.com/",
    },
    {
        platform: "X",
        url: "https://x.com/",
    },
]
