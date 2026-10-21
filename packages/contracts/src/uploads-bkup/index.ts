import { Schema } from "effect"

export const image_upload_limit = 1_048_576
export const image_upload_types = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
]
export const UploadedImage = Schema.Struct({ url: Schema.String })
