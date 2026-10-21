import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { SocialLink, SocialPlatform } from "./social-links.model.ts"

export const ClickedEditSocialLinks = taggedStruct("ClickedEditSocialLinks")
export const ChangedSocialLinkUrl = taggedStruct("ChangedSocialLinkUrl", {
    platform: SocialPlatform,
    url: S.String,
})
export const ClickedSaveSocialLinks = taggedStruct("ClickedSaveSocialLinks")
export const ClickedCancelSocialLinks = taggedStruct("ClickedCancelSocialLinks")
export const SavedSocialLinks = taggedStruct("SavedSocialLinks", {
    links: S.Array(SocialLink),
})
export const FailedSavingSocialLinks = taggedStruct("FailedSavingSocialLinks", {
    error: S.String,
})

export const Message = S.Union([
    ClickedEditSocialLinks,
    ChangedSocialLinkUrl,
    ClickedSaveSocialLinks,
    ClickedCancelSocialLinks,
    SavedSocialLinks,
    FailedSavingSocialLinks,
])
export type Message = typeof Message.Type
