import { category_key } from "./menu-categories.ts"
import { Array, Effect, Match as M, Option } from "effect"
import { AsyncData, Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { Url } from "foldkit/url"
import { toString as urlToString } from "foldkit/url"

import {
    GotEventDatePickerMessage,
    GotEventEndTimeListboxMessage,
    GotEventStartTimeListboxMessage,
    GotImageDropMessage,
    type Message,
} from "./app.message.ts"
import {
    CreateEvent,
    DeleteMenuItem,
    ReorderMenuItems,
    CreateMenuItem,
    LoadEvents,
    LoadMenuItems,
    UpdateEvent,
    UpdateMenuItem,
    UploadImage,
} from "./app.command.ts"
import type { Model } from "./app.model.ts"
import { initialModel } from "./app.model.ts"
import { isAppScope, urlToAppRoute } from "./route.ts"
import { EventEditRoute, EventRoute } from "./route.ts"
import { loadExternal, navigateInternal } from "./route.command.ts"
import type { Event, MenuItem } from "./events.data.ts"
import {
    blankEventDraft,
    blankMenuItemDraft,
    eventDraftFromEvent,
    menuItemDraftFromMenuItem,
} from "./events.data.ts"
import { eventEditHref, eventHref, eventsMenuHref } from "./route.ts"
import {
    blankEventDatePicker,
    eventDatePickerFromIsoDate,
    eventDatePickerToIsoDate,
} from "./event-date-picker.ts"
import {
    blankTimeListbox,
    TimeListbox,
    timeListboxFromValue,
} from "./event-time-picker.ts"
import { eventMapHostId } from "./map.host.ts"
import { LoadEventWeather } from "./event-weather.command.ts"
import { EventWeatherAsyncData } from "./event-weather.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const resetEventStateIfNeeded = (
    model: Model,
    events: ReadonlyArray<Event>
) => {
    const route = model.route

    if (route._tag === "EventNew") {
        return {
            eventDraft: blankEventDraft(),
            eventDatePicker: blankEventDatePicker(),
            eventStartTimeListbox: blankTimeListbox("events-start-time"),
            eventEndTimeListbox: blankTimeListbox("events-end-time"),
        }
    }

    if (route._tag === "Event" || route._tag === "EventEdit") {
        const maybeEvent = Array.findFirst(
            events,
            (event) => event.id === route.eventId
        )

        return Option.match(maybeEvent, {
            onNone: () => ({
                eventDraft: blankEventDraft(),
                eventDatePicker: blankEventDatePicker(),
                eventStartTimeListbox: blankTimeListbox("events-start-time"),
                eventEndTimeListbox: blankTimeListbox("events-end-time"),
            }),
            onSome: (event) => {
                const eventDraft = eventDraftFromEvent(event)

                return {
                    eventDraft,
                    eventDatePicker: eventDatePickerFromIsoDate(
                        eventDraft.date
                    ),
                    eventStartTimeListbox: timeListboxFromValue(
                        "events-start-time",
                        eventDraft.start_time
                    ),
                    eventEndTimeListbox: timeListboxFromValue(
                        "events-end-time",
                        eventDraft.end_time
                    ),
                }
            },
        })
    }

    return {
        eventDraft: model.eventDraft,
        eventDatePicker: model.eventDatePicker,
        eventStartTimeListbox: model.eventStartTimeListbox,
        eventEndTimeListbox: model.eventEndTimeListbox,
    }
}

const resetMenuDraftIfNeeded = (
    model: Model,
    menuItems: ReadonlyArray<MenuItem>
) => {
    const route = model.route

    if (route._tag === "EventsMenuNew") {
        return blankMenuItemDraft()
    }

    if (
        route._tag === "EventsMenuRouteItem" ||
        route._tag === "EventsMenuEdit"
    ) {
        const maybeItem = Array.findFirst(
            menuItems,
            (item) => item.slug === route.slug
        )

        return Option.match(maybeItem, {
            onNone: () => blankMenuItemDraft(),
            onSome: (item) => menuItemDraftFromMenuItem(item),
        })
    }

    return model.menuDraft
}

const isCurrentEventMapHost = (model: Model, hostId: string): boolean =>
    model.route._tag === "EventNew"
        ? hostId === eventMapHostId("new")
        : model.route._tag === "EventEdit"
          ? hostId === eventMapHostId(model.route.eventId)
          : false

const requestEventWeather = (model: Model, eventId: string): UpdateReturn => {
    if (model.route._tag !== "Event" || model.route.eventId !== eventId) {
        return [model, []]
    }
    const maybeEvent = Array.findFirst(
        model.events,
        (event) => event.id === eventId
    )

    return Option.match(maybeEvent, {
        onNone: () => [model, []],
        onSome: (event) => {
            const latitude = globalThis.Number.parseFloat(event.latitude)
            const longitude = globalThis.Number.parseFloat(event.longitude)

            if (
                !globalThis.Number.isFinite(latitude) ||
                !globalThis.Number.isFinite(longitude)
            ) {
                return [
                    {
                        ...model,
                        eventWeather: Option.match(
                            AsyncData.getData(model.eventWeather),
                            {
                                onNone: () =>
                                    EventWeatherAsyncData.Failure({
                                        error: "Weather is unavailable for these coordinates.",
                                    }),
                                onSome: (data) =>
                                    EventWeatherAsyncData.Stale({
                                        error: "Weather is unavailable for these coordinates.",
                                        data,
                                    }),
                            }
                        ),
                    },
                    [],
                ]
            }

            return Option.match(
                AsyncData.revalidateOrLoad(model.eventWeather),
                {
                    onNone: () => [model, []],
                    onSome: (eventWeather) => [
                        {
                            ...model,
                            eventWeather,
                        },
                        [
                            LoadEventWeather({
                                eventId: event.id,
                                latitude,
                                longitude,
                            }),
                        ],
                    ],
                }
            )
        },
    })
}

export const init = (pathname: string): UpdateReturn => {
    const route = urlToAppRoute(pathname)

    return [initialModel(route), [LoadEvents(), LoadMenuItems()]]
}

const replaceEvent = (events: ReadonlyArray<Event>, event: Event) =>
    events.map((current) => (current.id === event.id ? event : current))

const replaceMenuItem = (menuItems: ReadonlyArray<MenuItem>, item: MenuItem) =>
    menuItems.map((current) => (current.id === item.id ? item : current))

const getMenuItemIdBySlug = (
    menuItems: ReadonlyArray<MenuItem>,
    slug: string
): string | undefined =>
    Array.findFirst(menuItems, (item) => item.slug === slug).pipe(
        Option.map((item) => item.id),
        Option.getOrUndefined
    )

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            EventsSnapshotLoaded: ({ events, menuItems }) => [
                {
                    ...model,
                    loadingEvents: false,
                    loadingMenuItems: false,
                    error: null,
                    events,
                    menuItems,
                    ...resetEventStateIfNeeded(model, events),
                    menuDraft: resetMenuDraftIfNeeded(model, menuItems),
                },
                [],
            ],
            EventsLoaded: ({ events }) => [
                {
                    ...model,
                    loadingEvents: false,
                    error: null,
                    events,
                    ...resetEventStateIfNeeded(model, events),
                },
                [],
            ],
            EventsFailed: ({ error }) => [
                {
                    ...model,
                    loadingEvents: false,
                    error,
                },
                [],
            ],
            MenuItemsLoaded: ({ menuItems }) => [
                {
                    ...model,
                    loadingMenuItems: false,
                    error: null,
                    menuItems,
                    menuDraft: resetMenuDraftIfNeeded(model, menuItems),
                },
                [],
            ],
            MenuItemsFailed: ({ error }) => [
                {
                    ...model,
                    loadingMenuItems: false,
                    error,
                },
                [],
            ],
            ChangedUrl: ({ url }) => {
                const route = urlToAppRoute(url.pathname)

                return [
                    {
                        ...model,
                        route,
                        eventWeather: EventWeatherAsyncData.Idle(),
                        maybeEventMapHostId: Option.none(),
                        ...resetEventStateIfNeeded(
                            { ...model, route },
                            model.events
                        ),
                        menuDraft: resetMenuDraftIfNeeded(
                            { ...model, route },
                            model.menuItems
                        ),
                    },
                    [],
                ]
            },
            RequestedEventWeather: ({ eventId }) =>
                requestEventWeather(model, eventId),
            EventWeatherLoaded: ({ eventId, weather }) =>
                model.route._tag === "Event" && model.route.eventId === eventId
                    ? [
                          {
                              ...model,
                              eventWeather: EventWeatherAsyncData.Success({
                                  data: weather,
                              }),
                          },
                          [],
                      ]
                    : [model, []],
            EventWeatherFailed: ({ eventId, error }) =>
                model.route._tag === "Event" && model.route.eventId === eventId
                    ? [
                          {
                              ...model,
                              eventWeather: Option.match(
                                  AsyncData.getData(model.eventWeather),
                                  {
                                      onNone: () =>
                                          EventWeatherAsyncData.Failure({
                                              error,
                                          }),
                                      onSome: (data) =>
                                          EventWeatherAsyncData.Stale({
                                              error,
                                              data,
                                          }),
                                  }
                              ),
                          },
                          [],
                      ]
                    : [model, []],
            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        Internal: ({ url }) => {
                            if (isAppScope(url.pathname)) {
                                return [model, [navigateInternal(url)]]
                            }

                            return [model, [loadExternal(urlToString(url))]]
                        },
                        External: ({ href }) => [model, [loadExternal(href)]],
                    })
                ),
            CompletedNavigateInternal: () => [model, []],
            CompletedLoadExternal: () => [model, []],
            UpdatedEventDraft: ({ field, value }) => [
                {
                    ...model,
                    error: null,
                    eventDraft: {
                        ...model.eventDraft,
                        [field]: value,
                    },
                    ...(field === "date"
                        ? { eventDatePicker: eventDatePickerFromIsoDate(value) }
                        : {}),
                    ...(field === "start_time"
                        ? {
                              eventStartTimeListbox: timeListboxFromValue(
                                  "events-start-time",
                                  value
                              ),
                          }
                        : {}),
                    ...(field === "end_time"
                        ? {
                              eventEndTimeListbox: timeListboxFromValue(
                                  "events-end-time",
                                  value
                              ),
                          }
                        : {}),
                },
                [],
            ],
            GotEventStartTimeListboxMessage: ({ message: listboxMessage }) => {
                const {
                    model: nextListbox,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = TimeListbox.update(
                    model.eventStartTimeListbox,
                    listboxMessage
                )
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = Command.mapMessages(
                    commands,
                    (message) => GotEventStartTimeListboxMessage({ message })
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        {
                            ...model,
                            eventStartTimeListbox: nextListbox,
                        },
                        mappedCommands,
                    ],
                    onSome: M.type<Ui.Listbox.OutMessage>().pipe(
                        M.withReturnType<UpdateReturn>(),
                        M.tagsExhaustive({
                            Selected: ({ value }) => [
                                {
                                    ...model,
                                    eventDraft: {
                                        ...model.eventDraft,
                                        start_time: value,
                                    },
                                    eventStartTimeListbox: nextListbox,
                                },
                                mappedCommands,
                            ],
                        })
                    ),
                })
            },
            GotEventEndTimeListboxMessage: ({ message: listboxMessage }) => {
                const {
                    model: nextListbox,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = TimeListbox.update(
                    model.eventEndTimeListbox,
                    listboxMessage
                )
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = Command.mapMessages(
                    commands,
                    (message) => GotEventEndTimeListboxMessage({ message })
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        {
                            ...model,
                            eventEndTimeListbox: nextListbox,
                        },
                        mappedCommands,
                    ],
                    onSome: M.type<Ui.Listbox.OutMessage>().pipe(
                        M.withReturnType<UpdateReturn>(),
                        M.tagsExhaustive({
                            Selected: ({ value }) => [
                                {
                                    ...model,
                                    eventDraft: {
                                        ...model.eventDraft,
                                        end_time: value,
                                    },
                                    eventEndTimeListbox: nextListbox,
                                },
                                mappedCommands,
                            ],
                        })
                    ),
                })
            },
            GotEventDatePickerMessage: ({ message: datePickerMessage }) => {
                const {
                    model: nextEventDatePicker,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.DatePicker.update(
                    model.eventDatePicker,
                    datePickerMessage
                )
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = Command.mapMessages(
                    commands,
                    (message) => GotEventDatePickerMessage({ message })
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        {
                            ...model,
                            eventDatePicker: nextEventDatePicker,
                        },
                        mappedCommands,
                    ],
                    onSome: M.type<Ui.DatePicker.OutMessage>().pipe(
                        M.withReturnType<UpdateReturn>(),
                        M.tagsExhaustive({
                            ChangedViewMonth: () => [
                                {
                                    ...model,
                                    eventDatePicker: nextEventDatePicker,
                                },
                                mappedCommands,
                            ],
                            SelectedDate: ({ date }) => [
                                {
                                    ...model,
                                    eventDraft: {
                                        ...model.eventDraft,
                                        date: eventDatePickerToIsoDate(date),
                                    },
                                    eventDatePicker: nextEventDatePicker,
                                },
                                mappedCommands,
                            ],
                            ClearedDate: () => [
                                {
                                    ...model,
                                    eventDraft: {
                                        ...model.eventDraft,
                                        date: "",
                                    },
                                    eventDatePicker: nextEventDatePicker,
                                },
                                mappedCommands,
                            ],
                        })
                    ),
                })
            },
            SelectedEventDate: ({ date }) => {
                const { model: nextEventDatePicker, commands = [] } =
                    Ui.DatePicker.selectDate(model.eventDatePicker, date)

                return [
                    {
                        ...model,
                        eventDraft: {
                            ...model.eventDraft,
                            date: eventDatePickerToIsoDate(date),
                        },
                        eventDatePicker: nextEventDatePicker,
                    },
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotEventDatePickerMessage({ message })
                            )
                        )
                    ),
                ]
            },
            UpdatedEventPublished: ({ value }) => [
                {
                    ...model,
                    error: null,
                    eventDraft: {
                        ...model.eventDraft,
                        published: value,
                    },
                },
                [],
            ],
            UpdatedMenuDraft: ({ field, value }) => [
                {
                    ...model,
                    error: null,
                    menuDraft: {
                        ...model.menuDraft,
                        [field]: value,
                    },
                },
                [],
            ],
            MovedMenuItem: ({ id, direction }) => {
                const item = model.menuItems.find((item) => item.id === id)
                if (item === undefined || model.submitting) return [model, []]
                const category = category_key(item.category)
                const ids = model.menuItems
                    .filter((item) => category_key(item.category) === category)
                    .toSorted(
                        (a, b) =>
                            Number(a.order_position) - Number(b.order_position)
                    )
                    .map((item) => item.id)
                const index = ids.indexOf(id)
                const target = index + (direction === "up" ? -1 : 1)
                if (target < 0 || target >= ids.length) return [model, []]
                ids.splice(index, 1)
                ids.splice(target, 0, id)
                return [
                    { ...model, submitting: true },
                    [ReorderMenuItems({ category, ids })],
                ]
            },
            StartedDraggingMenuItem: ({ id }) => [
                { ...model, dragged_menu_item: id },
                [],
            ],
            EndedDraggingMenuItem: () => [
                { ...model, dragged_menu_item: null },
                [],
            ],
            CompletedReorderMenuItems: () => [
                { ...model, submitting: false },
                [],
            ],
            DroppedMenuItem: ({ category, before_id }) => {
                const id = model.dragged_menu_item
                if (id === null || id === before_id || model.submitting)
                    return [model, []]
                const ids = model.menuItems
                    .filter(
                        (item) =>
                            category_key(item.category) ===
                                category_key(category) && item.id !== id
                    )
                    .toSorted(
                        (a, b) =>
                            Number(a.order_position) - Number(b.order_position)
                    )
                    .map((item) => item.id)
                const index =
                    before_id === null ? ids.length : ids.indexOf(before_id)
                ids.splice(index < 0 ? ids.length : index, 0, id)
                return [
                    { ...model, dragged_menu_item: null, submitting: true },
                    [ReorderMenuItems({ category, ids })],
                ]
            },
            ToggledMenuService: ({ service }) => [
                {
                    ...model,
                    menuDraft: {
                        ...model.menuDraft,
                        served_at: model.menuDraft.served_at.includes(service)
                            ? model.menuDraft.served_at.filter(
                                  (value) => value !== service
                              )
                            : [...model.menuDraft.served_at, service],
                    },
                },
                [],
            ],
            ClickedDeleteMenuItem: ({ id }) =>
                model.submitting
                    ? [model, []]
                    : [
                          { ...model, submitting: true },
                          [DeleteMenuItem({ id })],
                      ],
            UpdatedMenuPublished: ({ value }) => [
                {
                    ...model,
                    error: null,
                    menuDraft: {
                        ...model.menuDraft,
                        published: value,
                    },
                },
                [],
            ],
            SucceededMountEventMap: ({ hostId }) =>
                isCurrentEventMapHost(model, hostId)
                    ? [
                          {
                              ...model,
                              error: null,
                              maybeEventMapHostId: Option.some(hostId),
                          },
                          [],
                      ]
                    : [model, []],
            FailedMountEventMap: ({ reason }) => [
                {
                    ...model,
                    error: reason,
                },
                [],
            ],
            PickedEventCoordinates: ({ lng, lat }) => [
                {
                    ...model,
                    eventDraft: {
                        ...model.eventDraft,
                        latitude: globalThis.String(lat),
                        longitude: globalThis.String(lng),
                    },
                },
                [],
            ],
            GotImageDropMessage: ({ message: dropMessage }) => {
                const {
                    model: nextDrop,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.FileDrop.update(model.imageDrop, dropMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextFiles = Option.match(maybeOutMessage, {
                    onNone: () => model.selectedImageFiles,
                    onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
                        M.tagsExhaustive({
                            ReceivedFiles: ({ files }) =>
                                [...files].slice(0, 1),
                            RejectedNonFiles: () => model.selectedImageFiles,
                        })
                    ),
                })

                return [
                    {
                        ...model,
                        imageDrop: nextDrop,
                        selectedImageFiles: nextFiles,
                    },
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotImageDropMessage({ message })
                            )
                        )
                    ),
                ]
            },
            SelectedImageFilesChanged: ({ files }) => [
                {
                    ...model,
                    selectedImageFiles: files,
                },
                [],
            ],
            RemovedSelectedImageFile: ({ fileIndex }) => [
                {
                    ...model,
                    selectedImageFiles: model.selectedImageFiles.filter(
                        (_, index) => index !== fileIndex
                    ),
                },
                [],
            ],
            ClickedUploadImage: () => {
                const file = model.selectedImageFiles[0]

                if (model.uploadBusy || file === undefined) {
                    return [model, []]
                }

                return [
                    {
                        ...model,
                        uploadBusy: true,
                        error: null,
                    },
                    [UploadImage({ file })],
                ]
            },
            ResolvedEventImageUrls: ({ images, incomplete }) => [
                {
                    ...model,
                    resolved_image_urls: {
                        ...model.resolved_image_urls,
                        ...Object.fromEntries(
                            images.map(({ stored_url, url }) => [
                                stored_url,
                                url,
                            ])
                        ),
                    },
                    image_error: incomplete
                        ? "Some images could not be loaded. Reopen this page to retry."
                        : null,
                },
                [],
            ],
            FailedResolvingEventImages: ({ error }) => [
                { ...model, image_error: error },
                [],
            ],
            UploadedImage: ({ url }) => [
                {
                    ...model,
                    uploadBusy: false,
                    selectedImageFiles: [],
                    eventDraft: {
                        ...model.eventDraft,
                        image_url: url,
                    },
                    menuDraft: {
                        ...model.menuDraft,
                        image_url: url,
                    },
                },
                [],
            ],
            UploadImageFailed: ({ error }) => [
                {
                    ...model,
                    uploadBusy: false,
                    error,
                },
                [],
            ],
            SubmittedEventForm: () => {
                if (model.submitting) {
                    return [model, []]
                }

                const isEventDraftValid =
                    model.eventDraft.title.trim().length > 0 &&
                    model.eventDraft.date.trim().length > 0 &&
                    model.eventDraft.start_time.trim().length > 0 &&
                    model.eventDraft.venue_name.trim().length > 0 &&
                    model.eventDraft.latitude.trim().length > 0 &&
                    model.eventDraft.longitude.trim().length > 0

                if (!isEventDraftValid) {
                    return [
                        {
                            ...model,
                            error: "Fill title, date, start time, venue, latitude, and longitude before saving.",
                        },
                        [],
                    ]
                }

                if (model.route._tag === "EventNew") {
                    return [
                        {
                            ...model,
                            submitting: true,
                        },
                        [CreateEvent({ draft: model.eventDraft })],
                    ]
                }

                if (model.route._tag === "EventEdit") {
                    return [
                        {
                            ...model,
                            submitting: true,
                        },
                        [
                            UpdateEvent({
                                id: model.route.eventId,
                                draft: model.eventDraft,
                            }),
                        ],
                    ]
                }

                return [model, []]
            },
            ToggledEventEditing: () => {
                if (model.route._tag === "Event") {
                    const route = EventEditRoute({
                        eventId: model.route.eventId,
                    })

                    return [
                        model,
                        [
                            navigateInternal(
                                Url.make({
                                    protocol: window.location.protocol,
                                    host: window.location.host,
                                    pathname: eventEditHref(route.eventId),
                                    search: Option.none(),
                                    port: Option.none(),
                                    hash: Option.none(),
                                })
                            ),
                        ],
                    ]
                }

                if (model.route._tag === "EventEdit") {
                    const route = EventRoute({
                        eventId: model.route.eventId,
                    })

                    return [
                        model,
                        [
                            navigateInternal(
                                Url.make({
                                    protocol: window.location.protocol,
                                    host: window.location.host,
                                    pathname: eventHref(route.eventId),
                                    search: Option.none(),
                                    port: Option.none(),
                                    hash: Option.none(),
                                })
                            ),
                        ],
                    ]
                }

                return [model, []]
            },
            SubmittedMenuForm: () => {
                if (model.submitting) {
                    return [model, []]
                }

                const price = Number(model.menuDraft.price)
                const order_position = Number(model.menuDraft.order_position)
                const isMenuDraftValid =
                    model.menuDraft.event_id.trim().length > 0 &&
                    model.menuDraft.title.trim().length > 0 &&
                    model.menuDraft.slug.trim().length > 0 &&
                    model.menuDraft.category.trim().length > 0 &&
                    Number.isFinite(price) &&
                    Number.isFinite(order_position)

                if (!isMenuDraftValid) {
                    return [
                        {
                            ...model,
                            error: "Choose an event and fill title, slug, category, price, and order before saving.",
                        },
                        [],
                    ]
                }

                if (model.route._tag === "EventsMenuNew") {
                    return [
                        {
                            ...model,
                            submitting: true,
                        },
                        [CreateMenuItem({ draft: model.menuDraft })],
                    ]
                }

                if (model.route._tag === "EventsMenuEdit") {
                    const maybeMenuItemId = getMenuItemIdBySlug(
                        model.menuItems,
                        model.route.slug
                    )

                    if (maybeMenuItemId === undefined) {
                        return [
                            {
                                ...model,
                                error: `Menu item ${model.route.slug} not found.`,
                            },
                            [],
                        ]
                    }

                    return [
                        {
                            ...model,
                            submitting: true,
                        },
                        [
                            UpdateMenuItem({
                                id: maybeMenuItemId,
                                draft: model.menuDraft,
                            }),
                        ],
                    ]
                }

                return [model, []]
            },
            EventCreated: ({ event }) => [
                {
                    ...model,
                    submitting: false,
                    events: [...model.events, event],
                    eventDraft: eventDraftFromEvent(event),
                    eventDatePicker: eventDatePickerFromIsoDate(
                        eventDraftFromEvent(event).date
                    ),
                    eventStartTimeListbox: timeListboxFromValue(
                        "events-start-time",
                        event.start_time
                    ),
                    eventEndTimeListbox: timeListboxFromValue(
                        "events-end-time",
                        event.end_time
                    ),
                },
                [
                    navigateInternal(
                        Url.make({
                            protocol: window.location.protocol,
                            host: window.location.host,
                            pathname: eventHref(event.id),
                            search: Option.none(),
                            port: Option.none(),
                            hash: Option.none(),
                        })
                    ),
                ],
            ],
            EventUpdated: ({ event }) => [
                {
                    ...model,
                    submitting: false,
                    events: replaceEvent(model.events, event),
                    eventDraft: eventDraftFromEvent(event),
                    eventDatePicker: eventDatePickerFromIsoDate(
                        eventDraftFromEvent(event).date
                    ),
                    eventStartTimeListbox: timeListboxFromValue(
                        "events-start-time",
                        event.start_time
                    ),
                    eventEndTimeListbox: timeListboxFromValue(
                        "events-end-time",
                        event.end_time
                    ),
                },
                [
                    navigateInternal(
                        Url.make({
                            protocol: window.location.protocol,
                            host: window.location.host,
                            pathname: eventHref(event.id),
                            search: Option.none(),
                            port: Option.none(),
                            hash: Option.none(),
                        })
                    ),
                ],
            ],
            EventDeleted: ({ eventId }) => [
                {
                    ...model,
                    submitting: false,
                    events: model.events.filter(
                        (event) => event.id !== eventId
                    ),
                },
                [],
            ],
            MenuItemCreated: ({ menuItem }) => [
                {
                    ...model,
                    submitting: false,
                    menuItems: [...model.menuItems, menuItem],
                    menuDraft: menuItemDraftFromMenuItem(menuItem),
                },
                [
                    navigateInternal(
                        Url.make({
                            protocol: window.location.protocol,
                            host: window.location.host,
                            pathname: eventsMenuHref(),
                            search: Option.none(),
                            port: Option.none(),
                            hash: Option.none(),
                        })
                    ),
                ],
            ],
            MenuItemUpdated: ({ menuItem }) => [
                {
                    ...model,
                    submitting: false,
                    menuItems: replaceMenuItem(model.menuItems, menuItem),
                    menuDraft: menuItemDraftFromMenuItem(menuItem),
                },
                [
                    navigateInternal(
                        Url.make({
                            protocol: window.location.protocol,
                            host: window.location.host,
                            pathname: eventsMenuHref(),
                            search: Option.none(),
                            port: Option.none(),
                            hash: Option.none(),
                        })
                    ),
                ],
            ],
            MenuItemDeleted: ({ menuItemId }) => [
                {
                    ...model,
                    submitting: false,
                    menuItems: model.menuItems.filter(
                        (item) => item.id !== menuItemId
                    ),
                },
                [],
            ],
            EventsActionFailed: ({ error }) => [
                {
                    ...model,
                    loadingEvents: false,
                    loadingMenuItems: false,
                    submitting: false,
                    uploadBusy: false,
                    error,
                },
                [],
            ],
        })
    )
