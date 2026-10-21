import { MealService } from "@urm/domain/schemas/events"
import { Schema as S } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"
import { CalendarDate } from "foldkit/calendar"
import { taggedStruct } from "foldkit/schema"

import { Event, MenuItem } from "./events.data.ts"
import { EventWeather } from "./event-weather.model.ts"
import {
    FailedMountEventMap,
    PickedEventCoordinates,
    SucceededMountEventMap,
} from "./map.message.ts"
import {
    ChangedUrl,
    ClickedLink,
    CompletedLoadExternal,
    CompletedNavigateInternal,
} from "./route.message.ts"

export const EventsLoaded = taggedStruct("EventsLoaded", {
    events: S.Array(Event),
})

export const EventsFailed = taggedStruct("EventsFailed", {
    error: S.String,
})

export const MenuItemsLoaded = taggedStruct("MenuItemsLoaded", {
    menuItems: S.Array(MenuItem),
})

export const MenuItemsFailed = taggedStruct("MenuItemsFailed", {
    error: S.String,
})

export const EventsSnapshotLoaded = taggedStruct("EventsSnapshotLoaded", {
    events: S.Array(Event),
    menuItems: S.Array(MenuItem),
})

export const EventWeatherLoaded = taggedStruct("EventWeatherLoaded", {
    eventId: S.String,
    weather: EventWeather,
})

export const EventWeatherFailed = taggedStruct("EventWeatherFailed", {
    eventId: S.String,
    error: S.String,
})

export const RequestedEventWeather = taggedStruct("RequestedEventWeather", {
    eventId: S.String,
})

export const UpdatedEventDraft = taggedStruct("UpdatedEventDraft", {
    field: S.Union([
        S.Literal("title"),
        S.Literal("description"),
        S.Literal("date"),
        S.Literal("start_time"),
        S.Literal("end_time"),
        S.Literal("venue_name"),
        S.Literal("venue_url"),
        S.Literal("latitude"),
        S.Literal("longitude"),
        S.Literal("tickets_url"),
        S.Literal("image_url"),
    ]),
    value: S.String,
})

export const UpdatedEventPublished = taggedStruct("UpdatedEventPublished", {
    value: S.Boolean,
})

export const GotEventDatePickerMessage = taggedStruct(
    "GotEventDatePickerMessage",
    {
        message: Ui.DatePicker.Message,
    }
)

export const SelectedEventDate = taggedStruct("SelectedEventDate", {
    date: CalendarDate,
})

export const GotEventStartTimeListboxMessage = taggedStruct(
    "GotEventStartTimeListboxMessage",
    {
        message: Ui.Listbox.Message,
    }
)

export const GotEventEndTimeListboxMessage = taggedStruct(
    "GotEventEndTimeListboxMessage",
    {
        message: Ui.Listbox.Message,
    }
)

export const UpdatedMenuDraft = taggedStruct("UpdatedMenuDraft", {
    field: S.Union([
        S.Literal("event_id"),
        S.Literal("title"),
        S.Literal("description"),
        S.Literal("content"),
        S.Literal("price"),
        S.Literal("category"),
        S.Literal("slug"),
        S.Literal("image_url"),
        S.Literal("dietary_labels"),
        S.Literal("allergens"),
        S.Literal("order_position"),
    ]),
    value: S.String,
})

export const ToggledMenuService = taggedStruct("ToggledMenuService", {
    service: MealService,
})
export const ClickedDeleteMenuItem = taggedStruct("ClickedDeleteMenuItem", {
    id: S.String,
})

export const MovedMenuItem = taggedStruct("MovedMenuItem", {
    id: S.String,
    direction: S.Literals(["up", "down"]),
})
export const StartedDraggingMenuItem = taggedStruct("StartedDraggingMenuItem", {
    id: S.String,
})
export const EndedDraggingMenuItem = taggedStruct("EndedDraggingMenuItem")
export const DroppedMenuItem = taggedStruct("DroppedMenuItem", {
    category: S.String,
    before_id: S.NullOr(S.String),
})
export const CompletedReorderMenuItems = taggedStruct(
    "CompletedReorderMenuItems"
)
export const UpdatedMenuPublished = taggedStruct("UpdatedMenuPublished", {
    value: S.Boolean,
})

export const SelectedImageFilesChanged = taggedStruct(
    "SelectedImageFilesChanged",
    {
        files: S.Array(File.File),
    }
)

export const GotImageDropMessage = taggedStruct("GotImageDropMessage", {
    message: Ui.FileDrop.Message,
})

export const RemovedSelectedImageFile = taggedStruct(
    "RemovedSelectedImageFile",
    {
        fileIndex: S.Number,
    }
)

export const ClickedUploadImage = taggedStruct("ClickedUploadImage")
export const UploadedImage = taggedStruct("UploadedImage", {
    url: S.String,
})
export const ResolvedEventImageUrls = taggedStruct("ResolvedEventImageUrls", {
    scope: S.String,
    images: S.Array(S.Struct({ stored_url: S.String, url: S.String })),
    incomplete: S.Boolean,
})
export const FailedResolvingEventImages = taggedStruct(
    "FailedResolvingEventImages",
    {
        scope: S.String,
        error: S.String,
    }
)
export const UploadImageFailed = taggedStruct("UploadImageFailed", {
    error: S.String,
})

export const SubmittedEventForm = taggedStruct("SubmittedEventForm")
export const ToggledEventEditing = taggedStruct("ToggledEventEditing")
export const SubmittedMenuForm = taggedStruct("SubmittedMenuForm")

export const EventCreated = taggedStruct("EventCreated", {
    event: Event,
})

export const EventUpdated = taggedStruct("EventUpdated", {
    event: Event,
})

export const EventDeleted = taggedStruct("EventDeleted", {
    eventId: S.String,
})

export const MenuItemCreated = taggedStruct("MenuItemCreated", {
    menuItem: MenuItem,
})

export const MenuItemUpdated = taggedStruct("MenuItemUpdated", {
    menuItem: MenuItem,
})

export const MenuItemDeleted = taggedStruct("MenuItemDeleted", {
    menuItemId: S.String,
})

export const EventsActionFailed = taggedStruct("EventsActionFailed", {
    action: S.Union([
        S.Literal("load-events"),
        S.Literal("load-menu-items"),
        S.Literal("create-event"),
        S.Literal("update-event"),
        S.Literal("delete-event"),
        S.Literal("create-menu-item"),
        S.Literal("update-menu-item"),
        S.Literal("delete-menu-item"),
        S.Literal("upload-image"),
    ]),
    error: S.String,
})

export const EventMapMessages = S.Union([
    SucceededMountEventMap,
    FailedMountEventMap,
    PickedEventCoordinates,
])

export const Message = S.Union([
    ClickedLink,
    ChangedUrl,
    CompletedNavigateInternal,
    CompletedLoadExternal,
    EventsLoaded,
    EventsFailed,
    MenuItemsLoaded,
    MenuItemsFailed,
    EventsSnapshotLoaded,
    EventWeatherLoaded,
    EventWeatherFailed,
    RequestedEventWeather,
    UpdatedEventDraft,
    UpdatedEventPublished,
    GotEventDatePickerMessage,
    SelectedEventDate,
    GotEventStartTimeListboxMessage,
    GotEventEndTimeListboxMessage,
    UpdatedMenuDraft,
    UpdatedMenuPublished,
    ToggledMenuService,
    StartedDraggingMenuItem,
    MovedMenuItem,
    EndedDraggingMenuItem,
    DroppedMenuItem,
    CompletedReorderMenuItems,
    ClickedDeleteMenuItem,
    SelectedImageFilesChanged,
    GotImageDropMessage,
    RemovedSelectedImageFile,
    ClickedUploadImage,
    UploadedImage,
    ResolvedEventImageUrls,
    FailedResolvingEventImages,
    UploadImageFailed,
    SubmittedEventForm,
    ToggledEventEditing,
    SubmittedMenuForm,
    EventCreated,
    EventUpdated,
    EventDeleted,
    MenuItemCreated,
    MenuItemUpdated,
    MenuItemDeleted,
    EventsActionFailed,
    SucceededMountEventMap,
    FailedMountEventMap,
    PickedEventCoordinates,
])

export type Message = typeof Message.Type
