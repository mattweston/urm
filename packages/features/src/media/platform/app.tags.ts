/**
 * Selectors over the tag half of the media Model, shared by the update (which
 * needs ids to decide what to link) and the view (which needs the tags
 * themselves). `model.entityTags` is already scoped to `entity_type: "images"`
 * by the load, so only `entity_id` is matched here.
 */
import type { Tag } from "@urm/domain/schemas/tags"
import type { Model } from "./app.model.ts"

const isLive = (tag: Tag): boolean => tag.deleted_at === undefined

const byName = (left: Tag, right: Tag): number =>
    left.name.localeCompare(right.name)

export const imageTagIds = (
    model: Model,
    imageId: string
): ReadonlyArray<string> =>
    model.entityTags
        .filter((entityTag) => entityTag.entity_id === imageId)
        .map((entityTag) => entityTag.tag_id)

export const imageTags = (model: Model, imageId: string): ReadonlyArray<Tag> =>
    imageTagIds(model, imageId)
        .flatMap((tagId) => {
            const tag = model.tags.find((candidate) => candidate.id === tagId)

            // a link can outlive the tag it points at
            return tag === undefined || !isLive(tag) ? [] : [tag]
        })
        .sort(byName)

export const availableTags = (
    model: Model,
    imageId: string
): ReadonlyArray<Tag> => {
    const taken = imageTagIds(model, imageId)

    return model.tags
        .filter((tag) => isLive(tag) && !taken.includes(tag.id))
        .sort(byName)
}

export const findTagByName = (model: Model, name: string): Tag | undefined => {
    const normalized = name.trim().toLowerCase()

    return model.tags.find(
        (tag) => isLive(tag) && tag.name.toLowerCase() === normalized
    )
}
