import { Schema } from "effect"
import { Navigation } from "foldkit"
import { taggedStruct } from "foldkit/schema"

export const ClickedLink = taggedStruct("ClickedLink", {
    request: Navigation.UrlRequest,
})

export const ChangedUrl = taggedStruct("ChangedUrl", {
    url: Schema.Any,
})

export const CompletedNavigateInternal = taggedStruct(
    "CompletedNavigateInternal"
)
