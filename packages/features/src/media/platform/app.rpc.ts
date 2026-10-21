import type { Image } from "@urm/domain/schemas/media"
import type { EntityTag, Tag } from "@urm/domain/schemas/tags"

const unavailable = (): Promise<never> =>
    Promise.reject(new Error("No media persistence adapter installed"))

export const imagesApi = {
    list: (): Promise<ReadonlyArray<Image>> => unavailable(),
    create: (_input: Image): Promise<{ readonly item: Image }> => unavailable(),
    update: (_input: {
        readonly id: string
        readonly data: Readonly<Partial<Image>>
    }): Promise<{ readonly item: Image }> => unavailable(),
    delete: (_input: { readonly id: string }): Promise<void> => unavailable(),
}

export const tagsApi = {
    list: (): Promise<ReadonlyArray<Tag>> => unavailable(),
    create: (_input: Tag): Promise<{ readonly item: Tag }> => unavailable(),
}

export const entityTagsApi = {
    list: (_input: {
        readonly entity_type: string
    }): Promise<ReadonlyArray<EntityTag>> => unavailable(),
    create: (_input: EntityTag): Promise<{ readonly item: EntityTag }> =>
        unavailable(),
    delete: (_input: { readonly id: string }): Promise<void> => unavailable(),
}

export const IMAGE_ENTITY_TYPE = "images"
