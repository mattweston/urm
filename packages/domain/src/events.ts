import { Schema } from "effect"
import { MealService } from "./schemas/events.ts"
const title = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(500)
)
const text = Schema.String.check(Schema.isMaxLength(20_000))
const url = Schema.String.check(Schema.isMaxLength(2_048))
const time = Schema.String.check(
    Schema.isPattern(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/)
)
const coordinate = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(50)
)
export const EventFields = Schema.Struct({
    title,
    description: text,
    date: Schema.Int,
    start_time: time,
    end_time: Schema.Union([Schema.Literal(""), time]),
    venue_name: title,
    venue_url: url,
    latitude: coordinate,
    longitude: coordinate,
    tickets_url: url,
    image_url: url,
    published: Schema.Boolean,
})
export const EventMenuFields = Schema.Struct({
    title,
    description: text,
    content: Schema.String.check(Schema.isMaxLength(100_000)),
    price: Schema.Int.check(
        Schema.isGreaterThanOrEqualTo(0),
        Schema.isLessThanOrEqualTo(2147483647)
    ),
    category: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(100)
    ),
    served_at: Schema.Array(MealService).check(Schema.isMaxLength(3)),
    slug: title,
    image_url: url,
    dietary_labels: Schema.String.check(Schema.isMaxLength(500)),
    allergens: Schema.String.check(Schema.isMaxLength(500)),
    published: Schema.Boolean,
    order_position: Schema.Int.check(
        Schema.isGreaterThanOrEqualTo(0),
        Schema.isLessThanOrEqualTo(2147483647)
    ),
})
export const EventRecord = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    title: Schema.String,
    description: Schema.String,
    date: Schema.Number,
    start_time: Schema.String,
    end_time: Schema.String,
    venue_name: Schema.String,
    venue_url: Schema.String,
    latitude: Schema.String,
    longitude: Schema.String,
    tickets_url: Schema.String,
    image_url: Schema.String,
    published: Schema.Boolean,
    updated_at: Schema.Number,
})
export const EventMenuRecord = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    event_id: Schema.String,
    title: Schema.String,
    description: Schema.String,
    content: Schema.String,
    price: Schema.Number,
    category: Schema.String,
    served_at: Schema.Array(MealService),
    slug: Schema.String,
    image_url: Schema.String,
    dietary_labels: Schema.String,
    allergens: Schema.String,
    published: Schema.Boolean,
    order_position: Schema.Number,
    updated_at: Schema.Number,
})
export const EventCatalogRecord = Schema.Struct({
    id: Schema.String,
    events: Schema.Array(EventRecord),
    menu_items: Schema.Array(EventMenuRecord),
})
export const EventAction = Schema.Union([
    Schema.TaggedStruct("create_event", {
        id: Schema.String,
        ...EventFields.fields,
    }),
    Schema.TaggedStruct("update_event", {
        id: Schema.String,
        ...EventFields.fields,
    }),
    Schema.TaggedStruct("delete_event", { id: Schema.String }),
    Schema.TaggedStruct("create_menu", {
        id: Schema.String,
        event_id: Schema.String,
        ...EventMenuFields.fields,
    }),
    Schema.TaggedStruct("update_menu", {
        id: Schema.String,
        ...EventMenuFields.fields,
    }),
    Schema.TaggedStruct("delete_menu", { id: Schema.String }),
    Schema.TaggedStruct("reorder_menu", {
        category: EventMenuFields.fields.category,
        ids: Schema.Array(Schema.String).check(Schema.isMaxLength(100)),
    }),
])
export type EventAction = typeof EventAction.Type
export class EventWriteError extends Schema.TaggedErrorClass<EventWriteError>()(
    "EventWriteError",
    { message: Schema.String }
) {}
