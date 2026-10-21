import { Schema as S } from "effect"

import { MealService, MenuCategory } from "@urm/domain/schemas/events"
import type {
    Event as RemoteEvent,
    EventMenuItem as RemoteMenuItem,
} from "@urm/domain/schemas/events"

export const Event = S.Struct({
    id: S.String,
    title: S.String,
    description: S.String,
    date: S.Number,
    start_time: S.String,
    end_time: S.String,
    venue_name: S.String,
    venue_url: S.String,
    latitude: S.String,
    longitude: S.String,
    tickets_url: S.String,
    image_url: S.String,
    published: S.Boolean,
    updated_at: S.Number,
})

export type Event = typeof Event.Type

export const EventDraft = S.Struct({
    title: S.String,
    description: S.String,
    date: S.String,
    start_time: S.String,
    end_time: S.String,
    venue_name: S.String,
    venue_url: S.String,
    latitude: S.String,
    longitude: S.String,
    tickets_url: S.String,
    image_url: S.String,
    published: S.Boolean,
})

export type EventDraft = typeof EventDraft.Type

export const MenuItem = S.Struct({
    id: S.String,
    event_id: S.String,
    title: S.String,
    description: S.String,
    content: S.String,
    price: S.String,
    category: MenuCategory,
    served_at: S.Array(MealService),
    slug: S.String,
    image_url: S.String,
    dietary_labels: S.String,
    allergens: S.String,
    published: S.Boolean,
    order_position: S.String,
    updated_at: S.Number,
})

export type MenuItem = typeof MenuItem.Type

export const MenuItemDraft = S.Struct({
    event_id: S.String,
    title: S.String,
    description: S.String,
    content: S.String,
    price: S.String,
    category: MenuCategory,
    served_at: S.Array(MealService),
    slug: S.String,
    image_url: S.String,
    dietary_labels: S.String,
    allergens: S.String,
    published: S.Boolean,
    order_position: S.String,
})

export type MenuItemDraft = typeof MenuItemDraft.Type

const optionalText = (value: string) => {
    const trimmed = value.trim()

    return trimmed.length === 0 ? undefined : trimmed
}

export const blankEventDraft = (): EventDraft => ({
    title: "",
    description: "",
    date: "",
    start_time: "",
    end_time: "",
    venue_name: "",
    venue_url: "",
    latitude: "",
    longitude: "",
    tickets_url: "",
    image_url: "",
    published: false,
})

export const eventDraftFromEvent = (event: Event): EventDraft => ({
    title: event.title,
    description: event.description,
    date: new Date(event.date).toISOString().slice(0, 10),
    start_time: event.start_time,
    end_time: event.end_time,
    venue_name: event.venue_name,
    venue_url: event.venue_url,
    latitude: event.latitude,
    longitude: event.longitude,
    tickets_url: event.tickets_url,
    image_url: event.image_url,
    published: event.published,
})

export const blankMenuItemDraft = (): MenuItemDraft => ({
    event_id: "",
    title: "",
    description: "",
    content: "",
    price: "",
    category: "main",
    served_at: [],
    slug: "",
    image_url: "",
    dietary_labels: "",
    allergens: "",
    published: false,
    order_position: "0",
})

export const menuItemDraftFromMenuItem = (item: MenuItem): MenuItemDraft => ({
    event_id: item.event_id,
    title: item.title,
    description: item.description,
    content: item.content,
    price: item.price,
    category: item.category,
    served_at: item.served_at ?? [],
    slug: item.slug,
    image_url: item.image_url,
    dietary_labels: item.dietary_labels,
    allergens: item.allergens,
    published: item.published,
    order_position: item.order_position,
})

export const toUiEvent = (event: RemoteEvent): Event => ({
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    date: event.date,
    start_time: event.start_time,
    end_time: event.end_time ?? "",
    venue_name: event.venue_name,
    venue_url: event.venue_url ?? "",
    latitude: event.latitude,
    longitude: event.longitude,
    tickets_url: event.tickets_url ?? "",
    image_url: event.image_url ?? "",
    published: event.published,
    updated_at: event.updated_at,
})

export const toUiEvents = (
    events: ReadonlyArray<RemoteEvent>
): ReadonlyArray<Event> => events.map(toUiEvent)

export const toUiMenuItem = (item: RemoteMenuItem): MenuItem => ({
    id: item.id,
    event_id: item.event_id,
    title: item.title,
    description: item.description ?? "",
    content: item.content ?? "",
    price: (item.price / 100).toFixed(2),
    category: item.category,
    served_at: item.served_at ?? [],
    slug: item.slug,
    image_url: item.image_url ?? "",
    dietary_labels: item.dietary_labels ?? "",
    allergens: item.allergens ?? "",
    published: item.published,
    order_position: String(item.order_position),
    updated_at: item.updated_at,
})

export const toUiMenuItems = (
    items: ReadonlyArray<RemoteMenuItem>
): ReadonlyArray<MenuItem> => items.map(toUiMenuItem)

export const toCreateEventInput = (
    draft: EventDraft,
    id: string,
    updated_at: number
) => ({
    id,
    title: draft.title.trim(),
    ...(optionalText(draft.description) === undefined
        ? {}
        : { description: optionalText(draft.description) }),
    date: new Date(draft.date).getTime(),
    start_time: draft.start_time.trim(),
    ...(optionalText(draft.end_time) === undefined
        ? {}
        : { end_time: optionalText(draft.end_time) }),
    venue_name: draft.venue_name.trim(),
    ...(optionalText(draft.venue_url) === undefined
        ? {}
        : { venue_url: optionalText(draft.venue_url) }),
    latitude: draft.latitude.trim(),
    longitude: draft.longitude.trim(),
    ...(optionalText(draft.tickets_url) === undefined
        ? {}
        : { tickets_url: optionalText(draft.tickets_url) }),
    ...(optionalText(draft.image_url) === undefined
        ? {}
        : { image_url: optionalText(draft.image_url) }),
    published: draft.published,
    updated_at,
})

export const toUpdateEventInput = (
    draft: EventDraft,
    id: string,
    updated_at: number
) => ({
    id,
    title: draft.title.trim(),
    ...(optionalText(draft.description) === undefined
        ? {}
        : { description: optionalText(draft.description) }),
    date: new Date(draft.date).getTime(),
    start_time: draft.start_time.trim(),
    ...(optionalText(draft.end_time) === undefined
        ? {}
        : { end_time: optionalText(draft.end_time) }),
    venue_name: draft.venue_name.trim(),
    ...(optionalText(draft.venue_url) === undefined
        ? {}
        : { venue_url: optionalText(draft.venue_url) }),
    latitude: draft.latitude.trim(),
    longitude: draft.longitude.trim(),
    ...(optionalText(draft.tickets_url) === undefined
        ? {}
        : { tickets_url: optionalText(draft.tickets_url) }),
    ...(optionalText(draft.image_url) === undefined
        ? {}
        : { image_url: optionalText(draft.image_url) }),
    published: draft.published,
    updated_at,
})

export const toCreateMenuItemInput = (
    draft: MenuItemDraft,
    id: string,
    updated_at: number
) => ({
    id,
    event_id: draft.event_id,
    title: draft.title.trim(),
    ...(optionalText(draft.description) === undefined
        ? {}
        : { description: optionalText(draft.description) }),
    ...(optionalText(draft.content) === undefined
        ? {}
        : { content: optionalText(draft.content) }),
    price: Math.round(Number(draft.price) * 100),
    category: draft.category,
    served_at: draft.served_at,
    slug: draft.slug.trim(),
    ...(optionalText(draft.image_url) === undefined
        ? {}
        : { image_url: optionalText(draft.image_url) }),
    ...(optionalText(draft.dietary_labels) === undefined
        ? {}
        : { dietary_labels: optionalText(draft.dietary_labels) }),
    ...(optionalText(draft.allergens) === undefined
        ? {}
        : { allergens: optionalText(draft.allergens) }),
    published: draft.published,
    order_position: Number(draft.order_position),
    updated_at,
})

export const toUpdateMenuItemInput = (
    draft: MenuItemDraft,
    id: string,
    updated_at: number
) => ({
    id,
    title: draft.title.trim(),
    ...(optionalText(draft.description) === undefined
        ? {}
        : { description: optionalText(draft.description) }),
    ...(optionalText(draft.content) === undefined
        ? {}
        : { content: optionalText(draft.content) }),
    price: Math.round(Number(draft.price) * 100),
    category: draft.category,
    served_at: draft.served_at,
    slug: draft.slug.trim(),
    ...(optionalText(draft.image_url) === undefined
        ? {}
        : { image_url: optionalText(draft.image_url) }),
    ...(optionalText(draft.dietary_labels) === undefined
        ? {}
        : { dietary_labels: optionalText(draft.dietary_labels) }),
    ...(optionalText(draft.allergens) === undefined
        ? {}
        : { allergens: optionalText(draft.allergens) }),
    published: draft.published,
    order_position: Number(draft.order_position),
    updated_at,
})
