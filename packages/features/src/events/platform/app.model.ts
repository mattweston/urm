import { Schema as S } from "effect"
import { Option } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"

import { blankEventDatePicker } from "./event-date-picker.ts"
import { AppRoute } from "./route.ts"
import {
    Event,
    EventDraft,
    MenuItem,
    MenuItemDraft,
    blankEventDraft,
    blankMenuItemDraft,
} from "./events.data.ts"
import { blankTimeListbox } from "./event-time-picker.ts"
import { EventWeatherAsyncData } from "./event-weather.model.ts"

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    route: AppRoute,
    loadingEvents: S.Boolean,
    loadingMenuItems: S.Boolean,
    error: S.NullOr(S.String),
    image_error: S.NullOr(S.String),
    resolved_image_urls: S.Record(S.String, S.String),
    events: S.Array(Event),
    menuItems: S.Array(MenuItem),
    dragged_menu_item: S.NullOr(S.String),
    eventDraft: EventDraft,
    eventDatePicker: Ui.DatePicker.Model,
    eventStartTimeListbox: Ui.Listbox.Model,
    eventEndTimeListbox: Ui.Listbox.Model,
    menuDraft: MenuItemDraft,
    maybeEventMapHostId: S.Option(S.String),
    imageDrop: Ui.FileDrop.Model,
    selectedImageFiles: S.Array(File.File),
    uploadBusy: S.Boolean,
    submitting: S.Boolean,
    eventWeather: EventWeatherAsyncData.schema,
})

export type Model = typeof Model.Type

export const initialModel = (route: AppRoute): Model => ({
    route,
    loadingEvents: true,
    loadingMenuItems: true,
    error: null,
    image_error: null,
    resolved_image_urls: {},
    events: [],
    menuItems: [],
    dragged_menu_item: null,
    eventDraft: blankEventDraft(),
    eventDatePicker: blankEventDatePicker(),
    eventStartTimeListbox: blankTimeListbox("events-start-time"),
    eventEndTimeListbox: blankTimeListbox("events-end-time"),
    menuDraft: blankMenuItemDraft(),
    maybeEventMapHostId: Option.none(),
    imageDrop: Ui.FileDrop.init({ id: "events-image-drop" }),
    selectedImageFiles: [],
    uploadBusy: false,
    submitting: false,
    eventWeather: EventWeatherAsyncData.Idle(),
})
