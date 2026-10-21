import { Schema } from "effect"

export const TagKind = Schema.Literals(["custom", "role", "person"])
export type TagKind = typeof TagKind.Type

export const Tag = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    color: Schema.String,
    description: Schema.optional(Schema.String),
    kind: Schema.optional(TagKind),
    target_key: Schema.optional(Schema.String),
    updated_at: Schema.Number,
    deleted_at: Schema.optional(Schema.Number),
})
export type Tag = typeof Tag.Type

export const EntityTag = Schema.Struct({
    id: Schema.String,
    entity_type: Schema.String,
    entity_id: Schema.String,
    tag_id: Schema.String,
    updated_at: Schema.Number,
})
export type EntityTag = typeof EntityTag.Type

export const CreateTagInput = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    color: Schema.String,
    description: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})

export type CreateTagInput = Schema.Schema.Type<typeof CreateTagInput>

export const UpdateTagInput = Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    color: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})

export type UpdateTagInput = Schema.Schema.Type<typeof UpdateTagInput>

export const CreateEntityTagInput = Schema.Struct({
    id: Schema.String,
    entity_type: Schema.String,
    entity_id: Schema.String,
    tag_id: Schema.String,
    updated_at: Schema.Number,
})

export type CreateEntityTagInput = Schema.Schema.Type<
    typeof CreateEntityTagInput
>

export const SetTagsForEntityInput = Schema.Struct({
    entity_type: Schema.String,
    entity_id: Schema.String,
    tag_ids: Schema.Array(Schema.String),
})

export type SetTagsForEntityInput = Schema.Schema.Type<
    typeof SetTagsForEntityInput
>

export {
    ConflictError,
    DatabaseError,
    NotFoundError,
    ValidationError,
} from "../errors.ts"
