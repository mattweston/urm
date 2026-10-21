import type { Image } from "@urm/domain/schemas/media"
import { File } from "foldkit"

export type UploadImageOptions = Readonly<{
    alt: string
    category: string
}>

export const uploadImage = async (
    _file: File.File,
    _options: UploadImageOptions
): Promise<Image> => {
    throw new Error("No media upload persistence adapter installed")
}
