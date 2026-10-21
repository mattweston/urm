import { Schema as S } from "effect"
import { FileDrop } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"
import { ImageSettings } from "./gallery.presentation.ts"
import { GalleryText } from "./images.ts"
import { Gallery3dEditRoute } from "./gallery.route.ts"

export const ImagesNotLoaded = taggedStruct("ImagesNotLoaded")
export const ImagesLoading = taggedStruct("ImagesLoading")
export const ImagesLoaded = taggedStruct("ImagesLoaded")
export const ImagesFailed = taggedStruct("ImagesFailed", { error: S.String })

export const ImagesState = S.Union([
    ImagesNotLoaded,
    ImagesLoading,
    ImagesLoaded,
    ImagesFailed,
])
export type ImagesState = typeof ImagesState.Type

export const Model = S.Struct({
    route: Gallery3dEditRoute,
    imagesState: ImagesState,
    texture_states: S.Record(
        S.String,
        S.Literals(["loading", "loaded", "failed"])
    ),
    scene_available: S.Boolean,
    grid_view: S.Boolean,
    editing: S.Boolean,
    image_busy: S.Boolean,
    image_settings: S.Record(S.String, ImageSettings),
    selectedFrameKey: S.Option(S.String),
    maybeError: S.Option(S.String),
    fileDrop: FileDrop.Model,
    imageOverrides: S.Record(S.String, S.String),
    textOverrides: S.Record(S.String, GalleryText),
})
export type Model = typeof Model.Type
