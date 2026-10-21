import { Navigation } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { Url } from "foldkit/url"

export const CompletedLoadExternal = taggedStruct("CompletedLoadExternal")
export const CompletedNavigateInternal = taggedStruct(
    "CompletedNavigateInternal"
)
export const ClickedLink = taggedStruct("ClickedLink", {
    request: Navigation.UrlRequest,
})
export const ChangedUrl = taggedStruct("ChangedUrl", { url: Url })
