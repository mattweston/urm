import { Schema } from "effect"

export const MealService = Schema.Literals(["breakfast", "lunch", "dinner"])

export const MenuCategory = Schema.String
export type MenuCategory = typeof MenuCategory.Type

export const Event = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    date: Schema.Number,
    start_time: Schema.String,
    end_time: Schema.optional(Schema.String),
    venue_name: Schema.String,
    venue_url: Schema.optional(Schema.String),
    latitude: Schema.String,
    longitude: Schema.String,
    tickets_url: Schema.optional(Schema.String),
    image_url: Schema.optional(Schema.String),
    published: Schema.Boolean,
    updated_at: Schema.Number,
    deleted_at: Schema.optional(Schema.Number),
})
export type Event = typeof Event.Type

export const EventMenuItem = Schema.Struct({
    id: Schema.String,
    event_id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
    price: Schema.Number,
    category: MenuCategory,
    served_at: Schema.optional(Schema.Array(MealService)),
    slug: Schema.String,
    image_url: Schema.optional(Schema.String),
    dietary_labels: Schema.optional(Schema.String),
    allergens: Schema.optional(Schema.String),
    published: Schema.Boolean,
    order_position: Schema.Number,
    updated_at: Schema.Number,
    deleted_at: Schema.optional(Schema.Number),
})
export type EventMenuItem = typeof EventMenuItem.Type

export const CreateEventInput = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    date: Schema.Number,
    start_time: Schema.String,
    end_time: Schema.optional(Schema.String),
    venue_name: Schema.String,
    venue_url: Schema.optional(Schema.String),
    latitude: Schema.String,
    longitude: Schema.String,
    tickets_url: Schema.optional(Schema.String),
    image_url: Schema.optional(Schema.String),
    published: Schema.Boolean,
    updated_at: Schema.Number,
})

export type CreateEventInput = Schema.Schema.Type<typeof CreateEventInput>

export const UpdateEventInput = Schema.Struct({
    id: Schema.String,
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    date: Schema.optional(Schema.Number),
    start_time: Schema.optional(Schema.String),
    end_time: Schema.optional(Schema.String),
    venue_name: Schema.optional(Schema.String),
    venue_url: Schema.optional(Schema.String),
    latitude: Schema.optional(Schema.String),
    longitude: Schema.optional(Schema.String),
    tickets_url: Schema.optional(Schema.String),
    image_url: Schema.optional(Schema.String),
    published: Schema.optional(Schema.Boolean),
    updated_at: Schema.Number,
})

export type UpdateEventInput = Schema.Schema.Type<typeof UpdateEventInput>

export const CreateEventMenuItemInput = Schema.Struct({
    id: Schema.String,
    event_id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
    price: Schema.Number,
    category: MenuCategory,
    slug: Schema.String,
    image_url: Schema.optional(Schema.String),
    dietary_labels: Schema.optional(Schema.String),
    allergens: Schema.optional(Schema.String),
    published: Schema.Boolean,
    order_position: Schema.Number,
    updated_at: Schema.Number,
})

export type CreateEventMenuItemInput = Schema.Schema.Type<
    typeof CreateEventMenuItemInput
>

export const UpdateEventMenuItemInput = Schema.Struct({
    id: Schema.String,
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
    price: Schema.optional(Schema.Number),
    category: Schema.optional(MenuCategory),
    slug: Schema.optional(Schema.String),
    image_url: Schema.optional(Schema.String),
    dietary_labels: Schema.optional(Schema.String),
    allergens: Schema.optional(Schema.String),
    published: Schema.optional(Schema.Boolean),
    order_position: Schema.optional(Schema.Number),
    updated_at: Schema.Number,
})

export type UpdateEventMenuItemInput = Schema.Schema.Type<
    typeof UpdateEventMenuItemInput
>

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"
