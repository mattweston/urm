import { Schema } from "effect"
import { GOLDEN_RATIO } from "./images.ts"

export const ImageSettings = Schema.Struct({
    mode: Schema.Literals(["fit", "fill"]),
    crop_x: Schema.Number,
    crop_y: Schema.Number,
})
export type ImageSettings = typeof ImageSettings.Type

export const default_image_settings: ImageSettings = {
    mode: "fit",
    crop_x: 0.5,
    crop_y: 0.5,
}

export const image_layout = (
    width: number,
    height: number,
    settings: ImageSettings
) => {
    const relative_aspect = (width / height) * GOLDEN_RATIO
    const repeat_x = Math.min(1, 1 / relative_aspect)
    const repeat_y = Math.min(1, relative_aspect)
    const clamp = (value: number) => Math.max(0, Math.min(1, value))
    return settings.mode === "fit"
        ? {
              scale_x: Math.min(1, relative_aspect),
              scale_y: Math.min(1, 1 / relative_aspect),
              repeat_x: 1,
              repeat_y: 1,
              offset_x: 0,
              offset_y: 0,
          }
        : {
              scale_x: 1,
              scale_y: 1,
              repeat_x,
              repeat_y,
              offset_x: (1 - repeat_x) * clamp(settings.crop_x),
              offset_y: (1 - repeat_y) * (1 - clamp(settings.crop_y)),
          }
}
