import { Effect, Schema as S } from "effect"
import { Command, File } from "foldkit"

import {
    EventCreated,
    CompletedReorderMenuItems,
    EventDeleted,
    EventUpdated,
    EventsActionFailed,
    EventsLoaded,
    MenuItemCreated,
    MenuItemDeleted,
    MenuItemUpdated,
    MenuItemsLoaded,
    UploadImageFailed,
    UploadedImage,
} from "./app.message.ts"
import { EventDraft, MenuItemDraft } from "./events.data.ts"

type EventAction =
    | "create-event"
    | "create-menu-item"
    | "delete-event"
    | "delete-menu-item"
    | "load-events"
    | "load-menu-items"
    | "update-event"
    | "update-menu-item"

const unavailable = (action: EventAction) =>
    Effect.succeed(
        EventsActionFailed({
            action,
            error: "No events persistence adapter installed",
        })
    )

export const CreateEvent = Command.define("CreateEvent", {
    args: { draft: EventDraft },
    messages: [EventCreated, EventsActionFailed],
    execute: () => unavailable("create-event"),
})

export const UpdateEvent = Command.define("UpdateEvent", {
    args: { id: S.String, draft: EventDraft },
    messages: [EventUpdated, EventsActionFailed],
    execute: () => unavailable("update-event"),
})

export const DeleteEvent = Command.define("DeleteEvent", {
    args: { id: S.String },
    messages: [EventDeleted, EventsActionFailed],
    execute: () => unavailable("delete-event"),
})

export const CreateMenuItem = Command.define("CreateMenuItem", {
    args: { draft: MenuItemDraft },
    messages: [MenuItemCreated, EventsActionFailed],
    execute: () => unavailable("create-menu-item"),
})

export const UpdateMenuItem = Command.define("UpdateMenuItem", {
    args: { id: S.String, draft: MenuItemDraft },
    messages: [MenuItemUpdated, EventsActionFailed],
    execute: () => unavailable("update-menu-item"),
})

export const DeleteMenuItem = Command.define("DeleteMenuItem", {
    args: { id: S.String },
    messages: [MenuItemDeleted, EventsActionFailed],
    execute: () => unavailable("delete-menu-item"),
})

export const UploadImage = Command.define("UploadImage", {
    args: { file: File.File },
    messages: [UploadedImage, UploadImageFailed],
    execute: () =>
        Effect.succeed(
            UploadImageFailed({
                error: "No events upload adapter installed",
            })
        ),
})

export const LoadEvents = Command.define("LoadEvents", {
    messages: [EventsLoaded, EventsActionFailed],
    execute: unavailable("load-events"),
})

export const LoadMenuItems = Command.define("LoadMenuItems", {
    messages: [MenuItemsLoaded, EventsActionFailed],
    execute: unavailable("load-menu-items"),
})

export const ReorderMenuItems = Command.define("ReorderMenuItems", {
    args: { category: S.String, ids: S.Array(S.String) },
    messages: [CompletedReorderMenuItems, EventsActionFailed],
    execute: () => unavailable("update-menu-item"),
})
