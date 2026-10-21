import type { MenuItem } from "./events.data.ts"
import {
    category_key,
    category_label,
    menu_categories,
} from "./menu-categories.ts"
import { MealService } from "@urm/domain/schemas/events"
import { Array, Match as M, Option, String } from "effect"
import { AsyncData, File, Mount, Submodel } from "foldkit"
import * as Ui from "@foldkit/ui"
import type { Document, Html, HtmlBuilder } from "foldkit/html"

import { image_source } from "./event-images.ts"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"

import {
    ClickedUploadImage,
    ClickedDeleteMenuItem,
    ToggledMenuService,
    StartedDraggingMenuItem,
    MovedMenuItem,
    EndedDraggingMenuItem,
    DroppedMenuItem,
    GotEventDatePickerMessage,
    GotEventEndTimeListboxMessage,
    GotEventStartTimeListboxMessage,
    GotImageDropMessage,
    RemovedSelectedImageFile,
    RequestedEventWeather,
    SubmittedEventForm,
    SubmittedMenuForm,
    ToggledEventEditing,
    UpdatedEventDraft,
    UpdatedEventPublished,
    UpdatedMenuDraft,
    UpdatedMenuPublished,
    type Message,
} from "./app.message.ts"
import type { Model } from "./app.model.ts"
import {
    EVENT_DATE_PICKER_ANCHOR,
    eventDatePickerBackdropClassName,
    eventDatePickerCalendarView,
    eventDatePickerMaybeDate,
    eventDatePickerPanelClassName,
    eventDatePickerTriggerClassName,
    eventDatePickerTriggerContent,
    eventDatePickerWrapperClassName,
} from "./event-date-picker.ts"
import { timeListboxView } from "./event-time-picker.ts"
import {
    eventHref,
    eventNewHref,
    eventsHref,
    eventsMenuHref,
    eventsMenuItemEditHref,
    eventsMenuItemHref,
    eventsMenuNewHref,
} from "./route.ts"
import { eventMapHostId } from "./map.host.ts"
import { mountEventMap } from "./map.mount.ts"
import type {
    EventWeather,
    EventWeatherAsyncData,
} from "./event-weather.model.ts"

const cardClass =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const mutedClass = "text-sm text-muted-foreground"
const pageShellClass =
    "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
const fieldControlClass =
    "h-11 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-sm text-foreground [box-shadow:var(--shadow-surface)] outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
const dropZoneClassName =
    "flex flex-col items-center gap-2 cursor-pointer rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-muted px-6 py-10 text-center hover:border-primary select-none data-[drag-over]:border-primary data-[drag-over]:bg-accent"
const menu_icon_class =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-border hover:bg-accent disabled:opacity-50"
const MENU_DIETARY_LABELS = [
    "gluten-free",
    "dairy-free",
    "sugar-free",
    "vegan",
    "vegetarian",
] as const
const MENU_ALLERGENS = ["gluten", "fish", "mustard", "sulphites"] as const

const formatDate = (value: number) =>
    new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value))

const formatDay = (value: number) =>
    new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
    }).format(new Date(value))

const eventWeatherUpdatedAtFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
})

const parseCoordinate = (value: string, fallback: number) => {
    const parsed = globalThis.Number.parseFloat(value)

    return globalThis.Number.isFinite(parsed) ? parsed : fallback
}

const eventMapCenter = (draft: { latitude: string; longitude: string }) => ({
    lng: parseCoordinate(draft.longitude, 0),
    lat: parseCoordinate(draft.latitude, 20),
})

const commaList = (value: string) =>
    value
        .split(",")
        .map((item) => String.trim(item))
        .filter((item) => !String.isEmpty(item))

const toJoinedLabels = (value: ReadonlyArray<string>) => value.join(",")

const nextLabelSelection = (currentValue: string, label: string) => {
    const selected = commaList(currentValue)

    return selected.includes(label)
        ? toJoinedLabels(selected.filter((item) => item !== label))
        : toJoinedLabels([...selected, label])
}

const labelCheckboxGroup = (
    title: string,
    currentValue: string,
    options: ReadonlyArray<string>,
    toParentMessage: (message: Message) => Message,
    field: "dietary_labels" | "allergens",
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "space-y-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div([h.Class("text-sm font-medium text-foreground")], [title]),
            h.div(
                [h.Class("grid gap-2 sm:grid-cols-2")],
                options.map((label) => {
                    const checkboxId = `${field}-${label}`
                    const checked = commaList(currentValue).includes(label)

                    return h.label(
                        [
                            h.For(checkboxId),
                            h.Class(
                                "flex items-center gap-3 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        [
                            h.input([
                                h.Id(checkboxId),
                                h.Type("checkbox"),
                                h.Checked(checked),
                                h.Class(
                                    "h-4 w-4 rounded border-border text-primary accent-primary"
                                ),
                                h.OnClick(
                                    toParentMessage(
                                        UpdatedMenuDraft({
                                            field,
                                            value: nextLabelSelection(
                                                currentValue,
                                                label
                                            ),
                                        })
                                    )
                                ),
                            ]),
                            h.span([], [label]),
                        ]
                    )
                })
            ),
        ]
    )

const listBadge = (text: string, h: HtmlBuilder<Message>): Html =>
    h.span(
        [
            h.Class(
                "rounded-full border-(length:--surface-border-width) border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
            ),
        ],
        [text]
    )

const errorBanner = (error: string | null, h: HtmlBuilder<Message>): Html =>
    error === null
        ? h.empty
        : h.div(
              [
                  h.Class(
                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  ),
              ],
              [error]
          )

const eventStatusBadge = (published: boolean, h: HtmlBuilder<Message>): Html =>
    h.span(
        [
            h.Class(
                published
                    ? "rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                    : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
            ),
        ],
        [published ? "Published" : "Draft"]
    )

const eventEditSwitch = (editing: boolean, h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                "flex items-center gap-3 text-sm font-medium text-foreground"
            ),
        ],
        [
            h.span([], ["Edit"]),
            h.button(
                [
                    h.Type("button"),
                    h.Role("switch"),
                    h.AriaChecked(editing),
                    h.AriaLabel("Edit event"),
                    h.OnClick(ToggledEventEditing()),
                    h.Class(
                        editing
                            ? "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-(length:--control-border-width) border-border bg-primary transition-colors [box-shadow:var(--shadow-primary)]"
                            : "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input transition-colors"
                    ),
                ],
                [
                    h.span(
                        [
                            h.Class(
                                editing
                                    ? "pointer-events-none inline-block size-4 translate-x-6 rounded-full bg-background shadow transition-transform"
                                    : "pointer-events-none inline-block size-4 translate-x-1 rounded-full bg-background shadow transition-transform"
                            ),
                        ],
                        []
                    ),
                ]
            ),
        ]
    )

const pageHeaderView = (
    title: string,
    subtitle: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-1")],
        [
            h.h1([h.Class("text-3xl font-bold tracking-tight")], [title]),
            h.p([h.Class(mutedClass)], [subtitle]),
        ]
    )

const imageUploadField = (
    dropModel: Ui.FileDrop.Model,
    currentUrl: string,
    selectedFiles: ReadonlyArray<File.File>,
    uploadBusy: boolean,
    toParentMessage: (message: Message) => Message,
    h: HtmlBuilder<Message>
): Html => {
    const previewUrl = currentUrl.length > 0 ? currentUrl : undefined
    const file = selectedFiles[0]

    return h.div(
        [h.Class("space-y-3")],
        [
            previewUrl === undefined
                ? h.empty
                : h.div(
                      [
                          h.Class(
                              "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background"
                          ),
                      ],
                      [
                          h.img([
                              h.Src(previewUrl),
                              h.Alt("Image preview"),
                              h.Class("h-64 w-full object-cover"),
                          ]),
                      ]
                  ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2"
                    ),
                ],
                [
                    h.submodel({
                        slotId: dropModel.id,
                        model: dropModel,
                        view: Ui.FileDrop.view,
                        viewInputs: {
                            multiple: false,
                            accept: [
                                "image/png",
                                "image/jpeg",
                                "image/webp",
                                "image/gif",
                            ],
                            toView: (attributes) =>
                                h.label(
                                    [
                                        ...attributes.root,
                                        h.Class(dropZoneClassName),
                                    ],
                                    [
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-base font-medium text-foreground"
                                                ),
                                            ],
                                            [
                                                previewUrl === undefined
                                                    ? "Drop image or click to browse"
                                                    : "Replace image or click to browse",
                                            ]
                                        ),
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-sm text-muted-foreground"
                                                ),
                                            ],
                                            ["PNG, JPG, WEBP, or GIF"]
                                        ),
                                        h.input(attributes.input),
                                    ]
                                ),
                        },
                        toParentMessage: (message) =>
                            toParentMessage(GotImageDropMessage({ message })),
                    }),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap items-center gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ClickedUploadImage())),
                            h.Disabled(
                                uploadBusy || selectedFiles.length === 0
                            ),
                            h.Class(
                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        [uploadBusy ? "Uploading..." : "Upload image"]
                    ),
                    file === undefined
                        ? h.empty
                        : h.div(
                              [
                                  h.Class(
                                      "flex items-center gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm"
                                  ),
                              ],
                              [
                                  h.span(
                                      [h.Class("font-medium")],
                                      [File.name(file)]
                                  ),
                                  h.span(
                                      [h.Class("text-muted-foreground")],
                                      [globalThis.String(File.size(file))]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(
                                              toParentMessage(
                                                  RemovedSelectedImageFile({
                                                      fileIndex: 0,
                                                  })
                                              )
                                          ),
                                          h.Class(
                                              "text-muted-foreground hover:text-destructive"
                                          ),
                                      ],
                                      ["Remove"]
                                  ),
                              ]
                          ),
                ]
            ),
        ]
    )
}

const eventListView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const cards = model.events

    return h.div(
        [h.Class("space-y-6")],
        [
            pageHeaderView(
                "Events",
                "Events and menu items with image uploads.",
                h
            ),
            h.div([h.Class("min-h-0")], [errorBanner(model.error, h)]),
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.h2([h.Class("text-xl font-semibold")], ["Events"]),
                    h.a(
                        [
                            h.Href(eventNewHref()),
                            h.Hidden(model.can_write === false),
                            h.Class(
                                "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Create Event"]
                    ),
                ]
            ),
            model.loadingEvents
                ? h.div([h.Class(cardClass)], ["Loading events..."])
                : cards.length === 0
                  ? h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-10 text-center text-muted-foreground"
                            ),
                        ],
                        ["No events found."]
                    )
                  : h.div(
                        [h.Class("grid gap-4 md:grid-cols-2 xl:grid-cols-3")],
                        cards.map((event) =>
                            h.keyed("article")(
                                event.id,
                                [h.Class(cardClass)],
                                [
                                    image_source(model, event.image_url) ===
                                    undefined
                                        ? h.empty
                                        : h.img([
                                              h.Src(
                                                  image_source(
                                                      model,
                                                      event.image_url
                                                  ) ?? ""
                                              ),
                                              h.Alt(event.title),
                                              h.Class(
                                                  "mb-4 h-48 w-full rounded-[var(--radius-surface)] object-cover"
                                              ),
                                          ]),
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-start justify-between gap-3"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [h.Class("min-w-0")],
                                                [
                                                    h.h3(
                                                        [
                                                            h.Class(
                                                                "text-lg font-semibold"
                                                            ),
                                                        ],
                                                        [event.title]
                                                    ),
                                                    h.p(
                                                        [h.Class(mutedClass)],
                                                        [formatDay(event.date)]
                                                    ),
                                                ]
                                            ),
                                            eventStatusBadge(
                                                event.published,
                                                h
                                            ),
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            event.description.length > 0
                                                ? event.description
                                                : "No description yet.",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("mt-4 flex flex-wrap gap-2")],
                                        [
                                            h.a(
                                                [
                                                    h.Href(eventHref(event.id)),
                                                    h.Class(
                                                        "inline-flex h-9 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                    ),
                                                ],
                                                ["View"]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
        ]
    )
}

const eventFormView = (
    model: Model,
    toParentMessage: (message: Message) => Message,
    mode: "create" | "edit",
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-6")],
        [
            pageHeaderView(
                "Events",
                "Events and menu items with image uploads.",
                h
            ),
            h.div([h.Class("min-h-0")], [errorBanner(model.error, h)]),
            h.div(
                [h.Class(cardClass)],
                [
                    h.div(
                        [h.Class("flex items-start justify-between gap-4")],
                        [
                            h.div(
                                [],
                                [
                                    h.h2(
                                        [h.Class("text-xl font-semibold")],
                                        [
                                            mode === "create"
                                                ? "Create Event"
                                                : "Edit Event",
                                        ]
                                    ),
                                    h.p(
                                        [h.Class(mutedClass)],
                                        [
                                            "Title, date, venue, and image upload.",
                                        ]
                                    ),
                                ]
                            ),
                            mode === "edit"
                                ? eventEditSwitch(true, h)
                                : h.a(
                                      [
                                          h.Href(eventsHref()),
                                          h.Class(
                                              "text-sm text-muted-foreground hover:text-foreground"
                                          ),
                                      ],
                                      ["Back"]
                                  ),
                        ]
                    ),
                    h.form(
                        [
                            h.Class("mt-6 grid gap-4 md:grid-cols-2"),
                            h.OnSubmit(toParentMessage(SubmittedEventForm())),
                        ],
                        [
                            textField(
                                "Title",
                                model.eventDraft.title,
                                (value) =>
                                    UpdatedEventDraft({
                                        field: "title",
                                        value,
                                    }),
                                toParentMessage,
                                h
                            ),
                            textField(
                                "Venue",
                                model.eventDraft.venue_name,
                                (value) =>
                                    UpdatedEventDraft({
                                        field: "venue_name",
                                        value,
                                    }),
                                toParentMessage,
                                h
                            ),
                            eventDatePickerField(model, toParentMessage, h),
                            timeListboxView(
                                {
                                    model: model.eventStartTimeListbox,
                                    label: "Start time",
                                    value: model.eventDraft.start_time,
                                    placeholder: "Pick a time",
                                    toParentMessage: (message) =>
                                        toParentMessage(
                                            GotEventStartTimeListboxMessage({
                                                message,
                                            })
                                        ),
                                },
                                h
                            ),
                            timeListboxView(
                                {
                                    model: model.eventEndTimeListbox,
                                    label: "End time",
                                    value: model.eventDraft.end_time,
                                    placeholder: "Pick a time",
                                    toParentMessage: (message) =>
                                        toParentMessage(
                                            GotEventEndTimeListboxMessage({
                                                message,
                                            })
                                        ),
                                },
                                h
                            ),
                            textField(
                                "Venue URL",
                                model.eventDraft.venue_url,
                                (value) =>
                                    UpdatedEventDraft({
                                        field: "venue_url",
                                        value,
                                    }),
                                toParentMessage,
                                h,
                                "url"
                            ),
                            textField(
                                "Latitude",
                                model.eventDraft.latitude,
                                (value) =>
                                    UpdatedEventDraft({
                                        field: "latitude",
                                        value,
                                    }),
                                toParentMessage,
                                h
                            ),
                            textField(
                                "Longitude",
                                model.eventDraft.longitude,
                                (value) =>
                                    UpdatedEventDraft({
                                        field: "longitude",
                                        value,
                                    }),
                                toParentMessage,
                                h
                            ),
                            h.div(
                                [h.Class("md:col-span-2")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "space-y-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex items-start justify-between gap-4"
                                                    ),
                                                ],
                                                [
                                                    h.div(
                                                        [],
                                                        [
                                                            h.h3(
                                                                [
                                                                    h.Class(
                                                                        "text-sm font-semibold text-foreground"
                                                                    ),
                                                                ],
                                                                [
                                                                    "Pick location",
                                                                ]
                                                            ),
                                                            h.p(
                                                                [
                                                                    h.Class(
                                                                        mutedClass
                                                                    ),
                                                                ],
                                                                [
                                                                    "Click or drag the marker to set latitude and longitude.",
                                                                ]
                                                            ),
                                                        ]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "text-xs text-muted-foreground text-right"
                                                            ),
                                                        ],
                                                        [
                                                            model.eventDraft
                                                                .latitude
                                                                .length > 0 &&
                                                            model.eventDraft
                                                                .longitude
                                                                .length > 0
                                                                ? `${model.eventDraft.latitude}, ${model.eventDraft.longitude}`
                                                                : "No point selected",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                                    ),
                                                ],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "h-80 w-full"
                                                            ),
                                                            h.OnMount(
                                                                Mount.mapMessage(
                                                                    mountEventMap(
                                                                        eventMapHostId(
                                                                            model
                                                                                .route
                                                                                ._tag ===
                                                                                "EventEdit"
                                                                                ? model
                                                                                      .route
                                                                                      .eventId
                                                                                : "new"
                                                                        ),
                                                                        eventMapCenter(
                                                                            model.eventDraft
                                                                        ).lng,
                                                                        eventMapCenter(
                                                                            model.eventDraft
                                                                        ).lat
                                                                    ),
                                                                    toParentMessage
                                                                )
                                                            ),
                                                        ],
                                                        []
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            textField(
                                "Tickets URL",
                                model.eventDraft.tickets_url,
                                (value) =>
                                    UpdatedEventDraft({
                                        field: "tickets_url",
                                        value,
                                    }),
                                toParentMessage,
                                h,
                                "url"
                            ),
                            h.div(
                                [h.Class("md:col-span-2")],
                                [
                                    h.label(
                                        [h.Class("space-y-2")],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "block text-sm font-medium text-foreground"
                                                    ),
                                                ],
                                                ["Description"]
                                            ),
                                            h.textarea([
                                                h.Value(
                                                    model.eventDraft.description
                                                ),
                                                h.Class(
                                                    "min-h-28 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground [box-shadow:var(--shadow-surface)] outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                ),
                                                h.OnInput((value) =>
                                                    toParentMessage(
                                                        UpdatedEventDraft({
                                                            field: "description",
                                                            value,
                                                        })
                                                    )
                                                ),
                                            ]),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("md:col-span-2")],
                                [
                                    h.label(
                                        [h.Class("space-y-2")],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "block text-sm font-medium text-foreground"
                                                    ),
                                                ],
                                                ["Image"]
                                            ),
                                            imageUploadField(
                                                model.imageDrop,
                                                image_source(
                                                    model,
                                                    model.eventDraft.image_url
                                                ) ?? "",
                                                model.selectedImageFiles,
                                                model.uploadBusy,
                                                toParentMessage,
                                                h
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "md:col-span-2 flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-sm font-medium"
                                                    ),
                                                ],
                                                ["Published"]
                                            ),
                                            h.div(
                                                [h.Class(mutedClass)],
                                                [
                                                    model.eventDraft.published
                                                        ? "Visible to visitors."
                                                        : "Hidden as draft.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(
                                                toParentMessage(
                                                    UpdatedEventPublished({
                                                        value: !model.eventDraft
                                                            .published,
                                                    })
                                                )
                                            ),
                                            h.Class(
                                                "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        [
                                            model.eventDraft.published
                                                ? "Set draft"
                                                : "Set published",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "md:col-span-2 flex items-center justify-end gap-2"
                                    ),
                                ],
                                [
                                    h.a(
                                        [
                                            h.Href(
                                                model.route._tag === "EventEdit"
                                                    ? eventHref(
                                                          model.route.eventId
                                                      )
                                                    : eventsHref()
                                            ),
                                            h.Class(
                                                "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        ["Cancel"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("submit"),
                                            h.Disabled(
                                                model.can_write === false ||
                                                    model.submitting
                                            ),
                                            h.Class(
                                                "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            ),
                                        ],
                                        [
                                            model.submitting
                                                ? "Saving..."
                                                : "Save",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const eventDetailView = (
    model: Model,
    eventId: string,
    h: HtmlBuilder<Message>
): Html => {
    const maybeEvent = Array.findFirst(
        model.events,
        (event) => event.id === eventId
    )

    return Option.match(maybeEvent, {
        onNone: () => notFoundView(`Event ${eventId} not found`, h),
        onSome: (event) =>
            h.div(
                [h.Class("space-y-6")],
                [
                    pageHeaderView(
                        "Events",
                        "Events and menu items with image uploads.",
                        h
                    ),
                    h.div(
                        [h.Class(cardClass)],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex items-start justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.h2(
                                                [
                                                    h.Class(
                                                        "text-2xl font-semibold"
                                                    ),
                                                ],
                                                [event.title]
                                            ),
                                            h.p(
                                                [h.Class(mutedClass)],
                                                [formatDate(event.date)]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("flex items-center gap-4")],
                                        [
                                            eventStatusBadge(
                                                event.published,
                                                h
                                            ),
                                            model.can_write === false
                                                ? h.empty
                                                : eventEditSwitch(false, h),
                                        ]
                                    ),
                                ]
                            ),
                            image_source(model, event.image_url) === undefined
                                ? h.empty
                                : h.img([
                                      h.Src(
                                          image_source(
                                              model,
                                              event.image_url
                                          ) ?? ""
                                      ),
                                      h.Alt(event.title),
                                      h.Class(
                                          "mt-4 h-72 w-full rounded-[var(--radius-surface)] object-cover"
                                      ),
                                  ]),
                            h.div(
                                [h.Class("mt-4 grid gap-4 md:grid-cols-2")],
                                [
                                    detailField("Venue", event.venue_name, h),
                                    detailField("Start", event.start_time, h),
                                    detailField(
                                        "End",
                                        event.end_time.length > 0
                                            ? event.end_time
                                            : "-",
                                        h
                                    ),
                                    detailField(
                                        "Location",
                                        `${event.latitude}, ${event.longitude}`,
                                        h
                                    ),
                                    detailExternalLinkField(
                                        "Venue URL",
                                        event.venue_url,
                                        h
                                    ),
                                    detailExternalLinkField(
                                        "Tickets URL",
                                        event.tickets_url,
                                        h
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "md:col-span-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                                                    ),
                                                ],
                                                ["Description"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-2 whitespace-pre-wrap text-sm text-foreground"
                                                    ),
                                                ],
                                                [
                                                    event.description.length > 0
                                                        ? event.description
                                                        : "No description yet.",
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("mt-5 flex flex-wrap gap-2")],
                                [
                                    h.a(
                                        [
                                            h.Href(eventsHref()),
                                            h.Class(
                                                "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        ["Back"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    errorBanner(model.error, h),
                    h.div(
                        [
                            h.Class(
                                "h-80 w-full overflow-hidden rounded-[var(--radius-surface)] border border-border"
                            ),
                            h.AriaLabel("Event location"),
                            h.OnMount(
                                mountEventMap(
                                    eventMapHostId(`view-${event.id}`),
                                    eventMapCenter(event).lng,
                                    eventMapCenter(event).lat,
                                    false
                                )
                            ),
                        ],
                        []
                    ),
                    eventWeatherView(model.eventWeather, event.id, h),
                ]
            ),
    })
}

const eventWeatherView = (
    state: EventWeatherAsyncData,
    eventId: string,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [h.Class(cardClass)],
        [
            h.h2([h.Class("text-lg font-semibold")], ["Weather at venue"]),
            AsyncData.match(state, {
                onIdle: () => eventWeatherButton("Check weather", eventId, h),
                onLoading: () =>
                    h.p(
                        [h.Class("mt-3 text-sm text-muted-foreground")],
                        ["Loading current weather…"]
                    ),
                onRefreshing: (weather) =>
                    eventWeatherDataView(weather, eventId, undefined, h),
                onFailure: (error) =>
                    h.div(
                        [h.Class("mt-3 space-y-3")],
                        [
                            h.p([h.Class("text-sm text-destructive")], [error]),
                            eventWeatherButton("Refresh", eventId, h),
                        ]
                    ),
                onStale: ({ error, data }) =>
                    eventWeatherDataView(data, eventId, error, h),
                onSuccess: (weather) =>
                    eventWeatherDataView(weather, eventId, undefined, h),
            }),
        ]
    )

const eventWeatherDataView = (
    weather: EventWeather,
    eventId: string,
    error: string | undefined,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
            ),
        ],
        [
            h.div(
                [],
                [
                    h.div(
                        [h.Class("text-4xl font-semibold text-primary")],
                        [`${weather.temperature}°C`]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [weather.description]
                    ),
                ]
            ),
            detailField("Humidity", `${weather.humidity}%`, h),
            detailField("Wind", `${weather.wind_speed} mph`, h),
            h.div(
                [h.Class("space-y-3 sm:col-span-3")],
                [
                    h.time(
                        [h.Class("block text-xs text-muted-foreground")],
                        [
                            `Updated at ${eventWeatherUpdatedAtFormatter.format(
                                new Date(weather.updated_at)
                            )}`,
                        ]
                    ),
                    error === undefined
                        ? h.empty
                        : h.p([h.Class("text-sm text-destructive")], [error]),
                    eventWeatherButton("Refresh", eventId, h),
                ]
            ),
        ]
    )

const eventWeatherButton = (
    label: string,
    eventId: string,
    h: HtmlBuilder<Message>
): Html =>
    h.button(
        [
            h.Type("button"),
            h.OnClick(RequestedEventWeather({ eventId })),
            h.Class(
                "mt-3 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
            ),
        ],
        [label]
    )

const menu_item_row = (
    model: Model,
    item: MenuItem,
    category: string,
    h: HtmlBuilder<Message>
): Html =>
    h.keyed("article")(
        item.id,
        [
            h.Class(
                "group flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors hover:bg-accent/50 sm:flex-row sm:gap-4 sm:p-4"
            ),
            h.AllowDrop(),
            h.OnDrop(DroppedMenuItem({ category, before_id: item.id })),
        ],
        [
            image_source(model, item.image_url) === undefined
                ? h.empty
                : h.div(
                      [
                          h.Class(
                              "w-full shrink-0 self-stretch overflow-hidden rounded-md sm:w-40"
                          ),
                      ],
                      [
                          h.img([
                              h.Src(image_source(model, item.image_url) ?? ""),
                              h.Alt(item.title),
                              h.Class(
                                  "aspect-square h-full w-full object-cover"
                              ),
                          ]),
                      ]
                  ),
            h.div(
                [h.Class("flex min-w-0 flex-1 flex-col gap-2")],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-baseline justify-between gap-2"
                            ),
                        ],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "min-w-0 truncate text-base font-medium sm:text-xl"
                                    ),
                                ],
                                [item.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "ml-auto shrink-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums sm:text-lg"
                                    ),
                                ],
                                [`£${Number(item.price).toFixed(2)}`]
                            ),
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "line-clamp-2 text-xs text-muted-foreground sm:text-base"
                            ),
                        ],
                        [item.description]
                    ),
                    commaList(item.dietary_labels).length === 0
                        ? h.empty
                        : h.div(
                              [h.Class("flex flex-wrap gap-2")],
                              commaList(item.dietary_labels).map((label) =>
                                  listBadge(label.replaceAll("-", " "), h)
                              )
                          ),
                    item.served_at.length === 0
                        ? h.empty
                        : h.p(
                              [h.Class("text-xs text-muted-foreground")],
                              [item.served_at.map(category_label).join(" · ")]
                          ),
                    commaList(item.allergens).length === 0
                        ? h.empty
                        : h.div(
                              [h.Class("flex flex-wrap gap-1.5")],
                              commaList(item.allergens).map((allergen) =>
                                  h.span(
                                      [
                                          h.Class(
                                              "rounded-full bg-destructive px-2 py-1 text-xs capitalize text-destructive-foreground sm:text-sm"
                                          ),
                                      ],
                                      [allergen]
                                  )
                              )
                          ),
                    h.div(
                        [
                            h.Class(
                                "mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 sm:pt-4"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex flex-wrap items-center gap-2")],
                                [
                                    h.span(
                                        [
                                            h.Draggable(
                                                model.can_write !== false
                                            ),
                                            h.Title("Drag to reorder"),
                                            h.Class(
                                                "flex size-9 cursor-grab items-center justify-center text-muted-foreground"
                                            ),
                                            h.OnDragStart(
                                                StartedDraggingMenuItem({
                                                    id: item.id,
                                                })
                                            ),
                                            h.OnDragEnd(
                                                EndedDraggingMenuItem()
                                            ),
                                        ],
                                        [AppIcon.IconGripVertical()]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Class(menu_icon_class),
                                            h.AriaLabel(
                                                `Move ${item.title} up`
                                            ),
                                            h.Title("Move up"),
                                            h.Disabled(
                                                model.can_write === false ||
                                                    model.submitting
                                            ),
                                            h.OnClick(
                                                MovedMenuItem({
                                                    id: item.id,
                                                    direction: "up",
                                                })
                                            ),
                                        ],
                                        [AppIcon.IconArrowUp()]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Class(menu_icon_class),
                                            h.AriaLabel(
                                                `Move ${item.title} down`
                                            ),
                                            h.Title("Move down"),
                                            h.Disabled(
                                                model.can_write === false ||
                                                    model.submitting
                                            ),
                                            h.OnClick(
                                                MovedMenuItem({
                                                    id: item.id,
                                                    direction: "down",
                                                })
                                            ),
                                        ],
                                        [AppIcon.IconArrowDown()]
                                    ),
                                    h.a(
                                        [
                                            h.Href(
                                                eventsMenuItemEditHref(
                                                    item.slug
                                                )
                                            ),
                                            h.AriaLabel(`Edit ${item.title}`),
                                            h.Hidden(model.can_write === false),
                                            h.Title("Edit"),
                                            h.Class(menu_icon_class),
                                        ],
                                        [AppIcon.IconPencil()]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.AriaLabel(`Delete ${item.title}`),
                                            h.Title("Delete"),
                                            h.Class(menu_icon_class),
                                            h.Disabled(
                                                model.can_write === false ||
                                                    model.submitting
                                            ),
                                            h.OnClick(
                                                ClickedDeleteMenuItem({
                                                    id: item.id,
                                                })
                                            ),
                                        ],
                                        [AppIcon.IconTrash()]
                                    ),
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(eventsMenuItemHref(item.slug)),
                                    h.Class(
                                        "ml-auto inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:text-sm"
                                    ),
                                    h.AriaLabel(
                                        `View details for ${item.title}`
                                    ),
                                ],
                                [AppIcon.IconExternalLink(), "View Details"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const menuListView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("mx-auto w-full max-w-4xl space-y-8")],
        [
            errorBanner(model.error, h),
            h.div(
                [h.Class("flex items-center justify-between gap-4")],
                [
                    h.h1([h.Class("text-3xl font-bold")], ["Menu"]),
                    h.a(
                        [
                            h.Href(eventsMenuNewHref()),
                            h.Hidden(model.can_write === false),
                            h.Class(
                                "inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-primary-foreground"
                            ),
                        ],
                        [AppIcon.IconPlus(), "Add Item"]
                    ),
                ]
            ),
            ...(model.loadingMenuItems
                ? [h.p([h.Class(mutedClass)], ["Loading menu items..."])]
                : menu_categories(model.menuItems).map((category) =>
                      h.keyed("section")(
                          category,
                          [
                              h.Class(cardClass),
                              h.AllowDrop(),
                              h.OnDrop(
                                  DroppedMenuItem({ category, before_id: null })
                              ),
                          ],
                          [
                              h.h2(
                                  [h.Class("mb-5 text-2xl font-semibold")],
                                  [category_label(category)]
                              ),
                              h.div(
                                  [h.Class("space-y-4")],
                                  model.menuItems
                                      .filter(
                                          (item) =>
                                              category_key(item.category) ===
                                              category
                                      )
                                      .toSorted(
                                          (left, right) =>
                                              Number(left.order_position) -
                                              Number(right.order_position)
                                      )
                                      .map((item) =>
                                          menu_item_row(
                                              model,
                                              item,
                                              category,
                                              h
                                          )
                                      )
                              ),
                          ]
                      )
                  )),
        ]
    )

const menuFormView = (
    model: Model,
    toParentMessage: (message: Message) => Message,
    mode: "create" | "edit",
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("mx-auto w-full max-w-2xl space-y-6")],
        [
            pageHeaderView(
                "Events",
                "Events and menu items with image uploads.",
                h
            ),
            h.div([h.Class("min-h-0")], [errorBanner(model.error, h)]),
            h.div(
                [h.Class(cardClass)],
                [
                    h.div(
                        [h.Class("flex items-start justify-between gap-4")],
                        [
                            h.div(
                                [],
                                [
                                    h.h2(
                                        [h.Class("text-xl font-semibold")],
                                        [
                                            mode === "create"
                                                ? "Create Menu Item"
                                                : "Edit Menu Item",
                                        ]
                                    ),
                                    h.p(
                                        [h.Class(mutedClass)],
                                        ["Image upload and menu metadata."]
                                    ),
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(eventsMenuHref()),
                                    h.Class(
                                        "text-sm text-muted-foreground hover:text-foreground"
                                    ),
                                ],
                                ["Back"]
                            ),
                        ]
                    ),
                    h.form(
                        [
                            h.Class("mt-6 flex flex-col gap-8"),
                            h.OnSubmit(toParentMessage(SubmittedMenuForm())),
                        ],
                        [
                            mode === "create"
                                ? h.label(
                                      [h.Class("space-y-2")],
                                      [
                                          h.span(
                                              [
                                                  h.Class(
                                                      "block text-sm font-medium text-foreground"
                                                  ),
                                              ],
                                              ["Event"]
                                          ),
                                          h.select(
                                              [
                                                  h.Value(
                                                      model.menuDraft.event_id
                                                  ),
                                                  h.Class(fieldControlClass),
                                                  h.OnInput((value) =>
                                                      toParentMessage(
                                                          UpdatedMenuDraft({
                                                              field: "event_id",
                                                              value,
                                                          })
                                                      )
                                                  ),
                                              ],
                                              [
                                                  h.option(
                                                      [h.Value("")],
                                                      ["Choose an event"]
                                                  ),
                                                  ...model.events.map((event) =>
                                                      h.option(
                                                          [h.Value(event.id)],
                                                          [event.title]
                                                      )
                                                  ),
                                              ]
                                          ),
                                      ]
                                  )
                                : h.empty,
                            textField(
                                "Title",
                                model.menuDraft.title,
                                (value) =>
                                    UpdatedMenuDraft({ field: "title", value }),
                                toParentMessage,
                                h
                            ),
                            textField(
                                "Slug",
                                model.menuDraft.slug,
                                (value) =>
                                    UpdatedMenuDraft({ field: "slug", value }),
                                toParentMessage,
                                h
                            ),
                            textField(
                                "Price (£)",
                                model.menuDraft.price,
                                (value) =>
                                    UpdatedMenuDraft({ field: "price", value }),
                                toParentMessage,
                                h,
                                "number"
                            ),
                            h.label(
                                [h.Class("space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "block text-sm font-medium text-foreground"
                                            ),
                                        ],
                                        ["Category"]
                                    ),
                                    h.input([
                                        h.Value(model.menuDraft.category),
                                        h.List("events-menu-categories"),
                                        h.Class(fieldControlClass),
                                        h.Placeholder(
                                            "Choose or enter a category"
                                        ),
                                        h.OnInput((value) =>
                                            toParentMessage(
                                                UpdatedMenuDraft({
                                                    field: "category",
                                                    value,
                                                })
                                            )
                                        ),
                                    ]),
                                    h.datalist(
                                        [h.Id("events-menu-categories")],
                                        menu_categories(model.menuItems).map(
                                            (category) =>
                                                h.option(
                                                    [h.Value(category)],
                                                    [category_label(category)]
                                                )
                                        )
                                    ),
                                ]
                            ),
                            textField(
                                "Order",
                                model.menuDraft.order_position,
                                (value) =>
                                    UpdatedMenuDraft({
                                        field: "order_position",
                                        value,
                                    }),
                                toParentMessage,
                                h,
                                "number"
                            ),
                            h.div(
                                [h.Class("md:col-span-2")],
                                [
                                    h.label(
                                        [h.Class("space-y-2")],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "block text-sm font-medium text-foreground"
                                                    ),
                                                ],
                                                ["Description"]
                                            ),
                                            h.textarea([
                                                h.Value(
                                                    model.menuDraft.description
                                                ),
                                                h.Class(
                                                    "min-h-24 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground [box-shadow:var(--shadow-surface)] outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                ),
                                                h.OnInput((value) =>
                                                    toParentMessage(
                                                        UpdatedMenuDraft({
                                                            field: "description",
                                                            value,
                                                        })
                                                    )
                                                ),
                                            ]),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("md:col-span-2")],
                                [
                                    h.label(
                                        [h.Class("space-y-2")],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "block text-sm font-medium text-foreground"
                                                    ),
                                                ],
                                                ["Content"]
                                            ),
                                            h.textarea([
                                                h.Value(
                                                    model.menuDraft.content
                                                ),
                                                h.Class(
                                                    "min-h-32 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground [box-shadow:var(--shadow-surface)] outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                ),
                                                h.OnInput((value) =>
                                                    toParentMessage(
                                                        UpdatedMenuDraft({
                                                            field: "content",
                                                            value,
                                                        })
                                                    )
                                                ),
                                            ]),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("md:col-span-2")],
                                [
                                    h.label(
                                        [h.Class("space-y-2")],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "block text-sm font-medium text-foreground"
                                                    ),
                                                ],
                                                ["Image"]
                                            ),
                                            imageUploadField(
                                                model.imageDrop,
                                                image_source(
                                                    model,
                                                    model.menuDraft.image_url
                                                ) ?? "",
                                                model.selectedImageFiles,
                                                model.uploadBusy,
                                                toParentMessage,
                                                h
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "md:col-span-2 grid gap-4 lg:grid-cols-2"
                                    ),
                                ],
                                [
                                    h.fieldset(
                                        [h.Class("space-y-3")],
                                        [
                                            h.legend(
                                                [
                                                    h.Class(
                                                        "text-sm font-medium"
                                                    ),
                                                ],
                                                ["Served at"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex flex-wrap gap-4"
                                                    ),
                                                ],
                                                MealService.literals.map(
                                                    (service) =>
                                                        h.label(
                                                            [
                                                                h.Class(
                                                                    "flex items-center gap-2"
                                                                ),
                                                            ],
                                                            [
                                                                h.input([
                                                                    h.Type(
                                                                        "checkbox"
                                                                    ),
                                                                    h.Checked(
                                                                        model.menuDraft.served_at.includes(
                                                                            service
                                                                        )
                                                                    ),
                                                                    h.OnClick(
                                                                        ToggledMenuService(
                                                                            {
                                                                                service,
                                                                            }
                                                                        )
                                                                    ),
                                                                ]),
                                                                category_label(
                                                                    service
                                                                ),
                                                            ]
                                                        )
                                                )
                                            ),
                                        ]
                                    ),
                                    labelCheckboxGroup(
                                        "Dietary labels",
                                        model.menuDraft.dietary_labels,
                                        MENU_DIETARY_LABELS,
                                        toParentMessage,
                                        "dietary_labels",
                                        h
                                    ),
                                    labelCheckboxGroup(
                                        "Allergens",
                                        model.menuDraft.allergens,
                                        MENU_ALLERGENS,
                                        toParentMessage,
                                        "allergens",
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "md:col-span-2 flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-sm font-medium"
                                                    ),
                                                ],
                                                ["Published"]
                                            ),
                                            h.div(
                                                [h.Class(mutedClass)],
                                                [
                                                    model.menuDraft.published
                                                        ? "Visible on menu."
                                                        : "Hidden as draft.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(
                                                toParentMessage(
                                                    UpdatedMenuPublished({
                                                        value: !model.menuDraft
                                                            .published,
                                                    })
                                                )
                                            ),
                                            h.Class(
                                                "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        [
                                            model.menuDraft.published
                                                ? "Set draft"
                                                : "Set published",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "md:col-span-2 flex items-center justify-end gap-2"
                                    ),
                                ],
                                [
                                    h.a(
                                        [
                                            h.Href(eventsMenuHref()),
                                            h.Class(
                                                "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        ["Cancel"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("submit"),
                                            h.Disabled(
                                                model.can_write === false ||
                                                    model.submitting
                                            ),
                                            h.Class(
                                                "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            ),
                                        ],
                                        [
                                            model.submitting
                                                ? "Saving..."
                                                : "Save",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const menuDetailView = (
    model: Model,
    slug: string,
    h: HtmlBuilder<Message>
): Html => {
    const item = model.menuItems.find((item) => item.slug === slug)
    if (item === undefined)
        return notFoundView(`Menu item ${slug} not found`, h)
    return h.div(
        [h.Class("space-y-8")],
        [
            h.a(
                [
                    h.Href(eventsMenuHref()),
                    h.Class("inline-flex items-center gap-2 text-sm"),
                ],
                [AppIcon.IconArrowLeft(), "Back to Menu"]
            ),
            h.div(
                [h.Class("flex items-center justify-between gap-4")],
                [
                    h.h1(
                        [h.Class("text-4xl font-bold")],
                        ["Menu Item Details"]
                    ),
                    h.a(
                        [
                            h.Href(eventsMenuItemEditHref(item.slug)),
                            h.Hidden(model.can_write === false),
                            h.Class(
                                "rounded-[var(--radius-control)] bg-primary px-4 py-2 text-primary-foreground"
                            ),
                        ],
                        ["Edit Menu Item"]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-8 md:grid-cols-2")],
                [
                    image_source(model, item.image_url) === undefined
                        ? h.empty
                        : h.img([
                              h.Src(image_source(model, item.image_url) ?? ""),
                              h.Alt(item.title),
                              h.Class(
                                  "aspect-video w-full rounded-lg object-cover"
                              ),
                          ]),
                    h.div(
                        [h.Class("flex flex-col gap-4")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.h2(
                                        [h.Class("text-3xl font-bold")],
                                        [item.title]
                                    ),
                                    h.span(
                                        [h.Class("text-2xl font-semibold")],
                                        [`£${Number(item.price).toFixed(2)}`]
                                    ),
                                ]
                            ),
                            h.p(
                                [h.Class("text-lg text-muted-foreground")],
                                [item.description]
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                item.served_at.map((service) =>
                                    listBadge(category_label(service), h)
                                )
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                commaList(item.dietary_labels).map((label) =>
                                    listBadge(label.replaceAll("-", " "), h)
                                )
                            ),
                            item.allergens.length === 0
                                ? h.empty
                                : h.div(
                                      [
                                          h.Class(
                                              "flex flex-wrap items-center gap-2 text-destructive"
                                          ),
                                      ],
                                      [
                                          h.span(
                                              [h.Class("text-sm font-medium")],
                                              ["Contains:"]
                                          ),
                                          ...commaList(item.allergens).map(
                                              (allergen) =>
                                                  h.span(
                                                      [
                                                          h.Class(
                                                              "rounded-full bg-destructive/10 px-2 py-1 text-sm"
                                                          ),
                                                      ],
                                                      [category_label(allergen)]
                                                  )
                                          ),
                                      ]
                                  ),
                            item.content.length === 0
                                ? h.empty
                                : h.div(
                                      [
                                          h.Class(
                                              "prose prose-sm mt-4 max-w-none whitespace-pre-wrap"
                                          ),
                                      ],
                                      [item.content]
                                  ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const textField = (
    label: string,
    value: string,
    onChange: (value: string) => Message,
    toParentMessage: (message: Message) => Message,
    h: HtmlBuilder<Message>,
    type: "text" | "url" | "number" = "text"
): Html =>
    h.label(
        [h.Class("space-y-2")],
        [
            h.span(
                [h.Class("block text-sm font-medium text-foreground")],
                [label]
            ),
            h.input([
                h.Type(type),
                h.Value(value),
                h.Class(fieldControlClass),
                h.OnInput((nextValue) => toParentMessage(onChange(nextValue))),
            ]),
        ]
    )

const eventDatePickerField = (
    model: Model,
    toParentMessage: (message: Message) => Message,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-2")],
        [
            h.span(
                [h.Class("block text-sm font-medium text-foreground")],
                ["Date"]
            ),
            h.submodel({
                slotId: model.eventDatePicker.id,
                model: model.eventDatePicker,
                view: Ui.DatePicker.view,
                viewInputs: {
                    maybeSelectedDate: eventDatePickerMaybeDate(
                        model.eventDraft.date
                    ),
                    anchor: EVENT_DATE_PICKER_ANCHOR,
                    triggerContent: (maybeDate) =>
                        eventDatePickerTriggerContent(maybeDate, "Pick a date"),
                    triggerClassName: eventDatePickerTriggerClassName,
                    panelClassName: eventDatePickerPanelClassName,
                    backdropClassName: eventDatePickerBackdropClassName,
                    className: eventDatePickerWrapperClassName,
                    toCalendarView: eventDatePickerCalendarView,
                },
                toParentMessage: (message) =>
                    toParentMessage(GotEventDatePickerMessage({ message })),
            }),
        ]
    )

const detailField = (
    label: string,
    value: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    ),
                ],
                [label]
            ),
            h.div([h.Class("mt-2 text-foreground")], [value]),
        ]
    )

const safeExternalHref = (value: string): string | null => {
    const trimmed = value.trim()

    if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("/") ||
        trimmed.startsWith("mailto:") ||
        trimmed.startsWith("tel:")
    ) {
        return trimmed
    }

    return null
}

const detailExternalLinkField = (
    label: string,
    value: string,
    h: HtmlBuilder<Message>
): Html => {
    const maybeHref = safeExternalHref(value)

    if (maybeHref === null) {
        return detailField(label, value.length > 0 ? value : "-", h)
    }

    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    ),
                ],
                [label]
            ),
            h.a(
                [
                    h.Href(maybeHref),
                    h.Attribute("target", "_blank"),
                    h.Attribute("rel", "noreferrer"),
                    h.Class(
                        "mt-2 inline-flex items-center gap-2 text-foreground underline decoration-border underline-offset-4 transition hover:text-primary"
                    ),
                ],
                [
                    h.span([], [maybeHref]),
                    AppIcon.IconExternalLink({ class: "size-4 shrink-0" }),
                ]
            ),
        ]
    )
}

const notFoundView = (message: string, h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-10 text-center text-muted-foreground"
            ),
        ],
        [message]
    )

const routeKey = (route: Model["route"]): string =>
    M.value(route).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Events: () => "Events",
            EventNew: () => "EventNew",
            Event: ({ eventId }) => `Event:${eventId}`,
            EventEdit: ({ eventId }) => `EventEdit:${eventId}`,
            EventsMenu: () => "EventsMenu",
            EventsMenuNew: () => "EventsMenuNew",
            EventsMenuRouteItem: ({ slug }) => `EventsMenuRouteItem:${slug}`,
            EventsMenuEdit: ({ slug }) => `EventsMenuEdit:${slug}`,
            NotFound: ({ path }) => `NotFound:${path}`,
        })
    )

const contentView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const content = M.value(model.route).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            Events: () => eventListView(model, h),
            EventNew: () =>
                h.fieldset(
                    [
                        h.Disabled(model.can_write === false),
                        h.Class("contents"),
                    ],
                    [eventFormView(model, (message) => message, "create", h)]
                ),
            Event: ({ eventId }) => eventDetailView(model, eventId, h),
            EventEdit: ({ eventId: _eventId }) =>
                h.fieldset(
                    [
                        h.Disabled(model.can_write === false),
                        h.Class("contents"),
                    ],
                    [eventFormView(model, (message) => message, "edit", h)]
                ),
            EventsMenu: () => menuListView(model, h),
            EventsMenuNew: () =>
                h.fieldset(
                    [
                        h.Disabled(model.can_write === false),
                        h.Class("contents"),
                    ],
                    [menuFormView(model, (message) => message, "create", h)]
                ),
            EventsMenuRouteItem: ({ slug }) => menuDetailView(model, slug, h),
            EventsMenuEdit: ({ slug: _slug }) =>
                h.fieldset(
                    [
                        h.Disabled(model.can_write === false),
                        h.Class("contents"),
                    ],
                    [menuFormView(model, (message) => message, "edit", h)]
                ),
            NotFound: ({ path }) =>
                notFoundView(`The path "${path}" was not found.`, h),
        })
    )

    return h.div(
        [h.Class(pageShellClass)],
        [
            errorBanner(model.image_error, h),
            h.keyed("div")(routeKey(model.route), [], [content]),
        ]
    )
}

export const submodelView = Submodel.defineView<Model, Message>(contentView)

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
    return {
        title: "Events",
        body: submodelView(model, h),
    }
}
