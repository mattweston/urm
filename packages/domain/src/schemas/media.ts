import { Schema } from "effect"

export const Image = Schema.Struct({
    id: Schema.String,
    url: Schema.String,
    stored_url: Schema.optional(Schema.String),
    alt: Schema.String,
    text: Schema.String,
    width: Schema.optional(Schema.Number),
    height: Schema.optional(Schema.Number),
    category: Schema.optional(Schema.String),
    order_position: Schema.Number,
    updated_at: Schema.Number,
})
export type Image = typeof Image.Type

export const CreateImageInput = Schema.Struct({
    id: Schema.String,
    url: Schema.String,
    alt: Schema.String,
    text: Schema.String,
    width: Schema.optional(Schema.Number),
    height: Schema.optional(Schema.Number),
    category: Schema.optional(Schema.String),
    order_position: Schema.Number,
    updated_at: Schema.Number,
})

export type CreateImageInput = Schema.Schema.Type<typeof CreateImageInput>

export const CreateImageRequest = Schema.Struct({
    url: Schema.String,
    alt: Schema.String,
    text: Schema.String,
    width: Schema.optional(Schema.Number),
    height: Schema.optional(Schema.Number),
    category: Schema.optional(Schema.String),
    order_position: Schema.Number,
    updated_at: Schema.Number,
})

export type CreateImageRequest = Schema.Schema.Type<typeof CreateImageRequest>

export const UpdateImageInput = Schema.Struct({
    id: Schema.String,
    url: Schema.optional(Schema.String),
    alt: Schema.optional(Schema.String),
    text: Schema.optional(Schema.String),
    width: Schema.optional(Schema.Number),
    height: Schema.optional(Schema.Number),
    category: Schema.optional(Schema.String),
    order_position: Schema.optional(Schema.Number),
    updated_at: Schema.Number,
})

export type UpdateImageInput = Schema.Schema.Type<typeof UpdateImageInput>

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"
