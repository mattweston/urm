import * as Ui from "@foldkit/ui"
import clsx from "clsx"
import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import { contactHref } from "../../../forms/contact/route.ts"
import type { TourDateFilter } from "./filter.ts"
import {
    ClickedCancelTourDates,
    ClickedEditTourDates,
    ClickedSaveTourDates,
    SelectedTourDateFilter,
    type Message,
    type TourDateField,
    UpdatedTourDateField,
    UpdatedTourDateGroupTitle,
} from "./message.ts"
import type { Model } from "./model.ts"
import type { TourDate, TourDateGroup } from "./tour-date.ts"

const externalLink = <ParentMessage>(
    label: string,
    href: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.a(
        [
            h.Href(href),
            h.Target("_blank"),
            h.Rel("noopener noreferrer"),
            h.Class(
                "inline-flex w-fit items-center gap-1 font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            ),
        ],
        [label, h.span([h.AriaHidden(true)], ["↗"])]
    )

const detail = <ParentMessage>(
    label: string,
    value: string | null,
    h: HtmlBuilder<ParentMessage>
): Html | null =>
    value === null
        ? null
        : h.p(
              [h.Class("text-sm leading-relaxed text-muted-foreground")],
              [
                  h.span(
                      [h.Class("font-medium text-foreground")],
                      [`${label}: `]
                  ),
                  value,
              ]
          )

const inlineEditableField = <ParentMessage>(
    group_id: string,
    tour_date_id: string,
    field: typeof TourDateField.Type,
    label: string,
    value: string | null,
    class_name: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    field === "note"
        ? Ui.Textarea.view(
              {
                  id: `tour-date-${group_id}-${tour_date_id}-${field}`,
                  value: value ?? "",
                  rows: 1,
                  placeholder: label,
                  onInput: (next_value) =>
                      toParentMessage(
                          UpdatedTourDateField({
                              group_id,
                              tour_date_id,
                              field,
                              value: next_value,
                          })
                      ),
                  toView: (attributes) =>
                      h.span(
                          [h.Class("inline")],
                          [
                              h.label(
                                  [...attributes.label, h.Class("sr-only")],
                                  [`${label} for ${tour_date_id}`]
                              ),
                              h.textarea([
                                  ...attributes.textarea,
                                  h.Class(
                                      clsx(
                                          "inline-block min-h-0 max-w-full resize-none overflow-hidden border-0 bg-transparent p-0 align-middle [field-sizing:content] outline-none ring-2 ring-primary/40 ring-offset-2 ring-offset-card placeholder:text-muted-foreground/60 focus:ring-primary",
                                          class_name
                                      )
                                  ),
                              ]),
                          ]
                      ),
              },
              h
          )
        : Ui.Input.view(
              {
                  id: `tour-date-${group_id}-${tour_date_id}-${field}`,
                  value: value ?? "",
                  type:
                      field === "email"
                          ? "email"
                          : field === "phone"
                            ? "tel"
                            : field === "ticket_link_url" ||
                                field === "artist_page_url" ||
                                field === "map_url"
                              ? "url"
                              : "text",
                  placeholder: label,
                  onInput: (next_value) =>
                      toParentMessage(
                          UpdatedTourDateField({
                              group_id,
                              tour_date_id,
                              field,
                              value: next_value,
                          })
                      ),
                  toView: (attributes) =>
                      h.span(
                          [h.Class("inline")],
                          [
                              h.label(
                                  [...attributes.label, h.Class("sr-only")],
                                  [`${label} for ${tour_date_id}`]
                              ),
                              h.input([
                                  ...attributes.input,
                                  h.Class(
                                      clsx(
                                          "inline-block min-h-0 max-w-full border-0 bg-transparent p-0 align-middle [field-sizing:content] outline-none ring-2 ring-primary/40 ring-offset-2 ring-offset-card placeholder:text-muted-foreground/60 focus:ring-primary",
                                          class_name
                                      )
                                  ),
                              ]),
                          ]
                      ),
              },
              h
          )

const editableDetail = <ParentMessage>(
    group_id: string,
    tour_date: TourDate,
    field: typeof TourDateField.Type,
    label: string,
    value: string | null,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.p(
        [h.Class("text-sm leading-relaxed text-muted-foreground")],
        [
            h.span([h.Class("font-medium text-foreground")], [`${label}: `]),
            inlineEditableField(
                group_id,
                tour_date.id,
                field,
                label,
                value,
                "text-sm text-muted-foreground",
                toParentMessage,
                h
            ),
        ]
    )

const tourDateView = <ParentMessage>(
    group_id: string,
    tour_date: TourDate,
    is_editing: boolean,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(
        tour_date.id,
        [
            h.Class(
                "flex flex-col gap-3 border-b-2 border-dashed border-border px-5 py-5 last:border-b-0"
            ),
        ],
        [
            h.div(
                [h.Class("flex flex-col gap-1")],
                [
                    h.p(
                        [
                            h.Class(
                                clsx(
                                    "text-sm font-bold uppercase tracking-wide tabular-nums",
                                    tour_date.date === null
                                        ? "text-destructive"
                                        : "text-primary"
                                )
                            ),
                        ],
                        is_editing
                            ? [
                                  inlineEditableField(
                                      group_id,
                                      tour_date.id,
                                      "date",
                                      "Date",
                                      tour_date.date,
                                      "text-sm font-bold uppercase text-primary tabular-nums",
                                      toParentMessage,
                                      h
                                  ),
                                  " (",
                                  inlineEditableField(
                                      group_id,
                                      tour_date.id,
                                      "day",
                                      "Day",
                                      tour_date.day,
                                      "text-sm font-bold uppercase text-primary",
                                      toParentMessage,
                                      h
                                  ),
                                  ")",
                              ]
                            : [
                                  tour_date.date === null
                                      ? "Date TBA"
                                      : `${tour_date.date}${tour_date.day === null ? "" : ` (${tour_date.day})`}`,
                              ]
                    ),
                    h.h3(
                        [h.Class("text-lg font-semibold text-foreground")],
                        is_editing
                            ? [
                                  inlineEditableField(
                                      group_id,
                                      tour_date.id,
                                      "title",
                                      "Venue / title",
                                      tour_date.title,
                                      "text-lg font-semibold text-foreground",
                                      toParentMessage,
                                      h
                                  ),
                              ]
                            : [tour_date.title]
                    ),
                ]
            ),
            is_editing
                ? editableDetail(
                      group_id,
                      tour_date,
                      "address",
                      "Address",
                      tour_date.address,
                      toParentMessage,
                      h
                  )
                : tour_date.address === null
                  ? null
                  : h.p(
                        [
                            h.Class(
                                "max-w-[50ch] text-sm not-italic text-muted-foreground"
                            ),
                        ],
                        [tour_date.address]
                    ),
            is_editing
                ? editableDetail(
                      group_id,
                      tour_date,
                      "start_time",
                      "Time",
                      tour_date.start_time,
                      toParentMessage,
                      h
                  )
                : detail("Time", tour_date.start_time, h),
            is_editing
                ? editableDetail(
                      group_id,
                      tour_date,
                      "prices",
                      "Price",
                      tour_date.prices,
                      toParentMessage,
                      h
                  )
                : detail("Price", tour_date.prices, h),
            is_editing
                ? editableDetail(
                      group_id,
                      tour_date,
                      "email",
                      "Email",
                      tour_date.email,
                      toParentMessage,
                      h
                  )
                : detail("Email", tour_date.email, h),
            is_editing
                ? editableDetail(
                      group_id,
                      tour_date,
                      "phone",
                      "Phone",
                      tour_date.phone,
                      toParentMessage,
                      h
                  )
                : detail("Phone", tour_date.phone, h),
            h.div(
                [h.Class("flex flex-wrap gap-x-4 gap-y-2 text-sm")],
                is_editing
                    ? [
                          inlineEditableField(
                              group_id,
                              tour_date.id,
                              "ticket_link_url",
                              "Ticket URL",
                              tour_date.ticket_link_url,
                              "text-sm font-medium text-primary underline",
                              toParentMessage,
                              h
                          ),
                          inlineEditableField(
                              group_id,
                              tour_date.id,
                              "artist_page_url",
                              "Artist page URL",
                              tour_date.artist_page_url,
                              "text-sm font-medium text-primary underline",
                              toParentMessage,
                              h
                          ),
                          inlineEditableField(
                              group_id,
                              tour_date.id,
                              "map_url",
                              "Directions URL",
                              tour_date.map_url,
                              "text-sm font-medium text-primary underline",
                              toParentMessage,
                              h
                          ),
                      ]
                    : [
                          tour_date.ticket_link_url === null
                              ? null
                              : externalLink(
                                    "Tickets",
                                    tour_date.ticket_link_url,
                                    h
                                ),
                          tour_date.artist_page_url === null
                              ? null
                              : externalLink(
                                    "Artist page",
                                    tour_date.artist_page_url,
                                    h
                                ),
                          tour_date.map_url === null
                              ? null
                              : externalLink(
                                    "Directions",
                                    tour_date.map_url,
                                    h
                                ),
                      ]
            ),
            is_editing
                ? h.p(
                      [h.Class("max-w-[50ch] text-sm italic text-foreground")],
                      [
                          "(",
                          inlineEditableField(
                              group_id,
                              tour_date.id,
                              "note",
                              "Extra notes",
                              tour_date.note,
                              "text-sm italic text-foreground",
                              toParentMessage,
                              h
                          ),
                          ")",
                      ]
                  )
                : tour_date.note === null
                  ? null
                  : h.p(
                        [
                            h.Class(
                                "max-w-[50ch] text-sm italic text-foreground"
                            ),
                        ],
                        [`(${tour_date.note})`]
                    ),
            h.p(
                [
                    h.Class(
                        clsx(
                            "text-sm font-bold uppercase tracking-wider",
                            tour_date.confirmation === null
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-400"
                        )
                    ),
                ],
                is_editing
                    ? [
                          inlineEditableField(
                              group_id,
                              tour_date.id,
                              "confirmation",
                              "Confirmation",
                              tour_date.confirmation,
                              "text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400",
                              toParentMessage,
                              h
                          ),
                      ]
                    : [tour_date.confirmation ?? "TBC"]
            ),
        ]
    )

const groupView = <ParentMessage>(
    group: TourDateGroup,
    filter: TourDateFilter,
    is_editing: boolean,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html | null => {
    const dates = Array.filter(
        group.dates,
        (tour_date) =>
            filter === "All" || tour_date.confirmation === "Confirmed"
    )

    return Array.match(dates, {
        onEmpty: () => null,
        onNonEmpty: (visible_dates) =>
            h.keyed("section")(
                group.id,
                [
                    h.Class(
                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.h2(
                        [
                            h.Class(
                                "border-b-2 border-dashed border-border bg-muted/40 px-5 py-3 text-base font-bold uppercase tracking-wider text-primary"
                            ),
                        ],
                        is_editing
                            ? [
                                  Ui.Input.view(
                                      {
                                          id: `tour-date-group-${group.id}-title`,
                                          value: group.title,
                                          onInput: (value) =>
                                              toParentMessage(
                                                  UpdatedTourDateGroupTitle({
                                                      group_id: group.id,
                                                      value,
                                                  })
                                              ),
                                          toView: (attributes) =>
                                              h.span(
                                                  [h.Class("inline")],
                                                  [
                                                      h.label(
                                                          [
                                                              ...attributes.label,
                                                              h.Class(
                                                                  "sr-only"
                                                              ),
                                                          ],
                                                          [
                                                              `Month for ${group.title}`,
                                                          ]
                                                      ),
                                                      h.input([
                                                          ...attributes.input,
                                                          h.Class(
                                                              "inline-block min-h-0 max-w-full resize-none overflow-hidden border-0 bg-transparent p-0 align-middle text-base font-bold uppercase tracking-wider text-primary [field-sizing:content] outline-none ring-2 ring-primary/40 ring-offset-2 ring-offset-card focus:ring-primary"
                                                          ),
                                                      ]),
                                                  ]
                                              ),
                                      },
                                      h
                                  ),
                              ]
                            : [group.title]
                    ),
                    h.ul(
                        [h.Class("list-none")],
                        Array.map(visible_dates, (tour_date) =>
                            tourDateView(
                                group.id,
                                tour_date,
                                is_editing,
                                toParentMessage,
                                h
                            )
                        )
                    ),
                ]
            ),
    })
}

const filterButton = <ParentMessage>(
    filter: TourDateFilter,
    selected_filter: TourDateFilter,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: toParentMessage(SelectedTourDateFilter({ filter })),
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.AriaPressed(String(filter === selected_filter)),
                        h.Class(
                            clsx(
                                "rounded-[var(--radius-control)] border-(length:--control-border-width) px-3 py-1.5 text-sm font-medium [box-shadow:var(--shadow-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                                filter === selected_filter
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-foreground hover:bg-accent"
                            )
                        ),
                    ],
                    [filter === "All" ? "All dates" : "Confirmed only"]
                ),
        },
        h
    )

const editorButton = <ParentMessage>(
    label: string,
    message: Message,
    variant: "primary" | "secondary",
    is_disabled: boolean,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: toParentMessage(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            clsx(
                                "rounded-[var(--radius-control)] border-(length:--control-border-width) px-3 py-1.5 text-sm font-medium [box-shadow:var(--shadow-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                                variant === "primary"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-foreground hover:bg-accent"
                            )
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 py-10")],
        [
            h.div(
                [
                    h.Class(
                        "sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-surface)] border border-border bg-background/95 p-3 backdrop-blur"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                                    ),
                                ],
                                ["Tour date editor"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        clsx(
                                            "text-xs",
                                            model.persistence_state._tag ===
                                                "SaveFailed"
                                                ? "text-destructive"
                                                : "text-muted-foreground"
                                        )
                                    ),
                                    ...(model.persistence_state._tag ===
                                    "SaveFailed"
                                        ? [h.Role("alert")]
                                        : []),
                                ],
                                [
                                    model.persistence_state._tag === "Loading"
                                        ? "Loading saved dates..."
                                        : model.persistence_state._tag ===
                                            "Saving"
                                          ? "Saving in this browser..."
                                          : model.persistence_state._tag ===
                                              "SaveFailed"
                                            ? model.persistence_state.error
                                            : "Saved in this browser only.",
                                ]
                            ),
                        ]
                    ),
                    model.editor_state._tag === "Viewing"
                        ? editorButton(
                              "Edit dates",
                              ClickedEditTourDates(),
                              "primary",
                              model.persistence_state._tag === "Loading",
                              toParentMessage,
                              h
                          )
                        : h.div(
                              [h.Class("flex gap-2")],
                              [
                                  editorButton(
                                      "Cancel",
                                      ClickedCancelTourDates(),
                                      "secondary",
                                      model.persistence_state._tag === "Saving",
                                      toParentMessage,
                                      h
                                  ),
                                  editorButton(
                                      model.persistence_state._tag === "Saving"
                                          ? "Saving..."
                                          : "Save locally",
                                      ClickedSaveTourDates(),
                                      "primary",
                                      model.persistence_state._tag === "Saving",
                                      toParentMessage,
                                      h
                                  ),
                              ]
                          ),
                ]
            ),
            h.header(
                [h.Class("flex flex-col items-center gap-3 text-center")],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-bold uppercase tracking-[0.2em] text-primary"
                            ),
                        ],
                        ["Live music"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold uppercase tracking-tight"
                            ),
                        ],
                        ["Tour Dates"]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-border bg-muted/40 p-4 text-sm"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "font-semibold uppercase text-foreground"
                                    ),
                                ],
                                [
                                    "Rory is now accepting bookings for 2026 from May onwards.",
                                ]
                            ),
                            h.p(
                                [h.Class("mt-1 text-muted-foreground")],
                                [
                                    "See ",
                                    h.a(
                                        [
                                            h.Href(contactHref()),
                                            h.Class(
                                                "font-medium text-foreground underline underline-offset-4"
                                            ),
                                        ],
                                        ["Contact"]
                                    ),
                                    ". More gig updates soon.",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class("flex justify-center gap-2"),
                    h.Role("group"),
                    h.AriaLabel("Filter tour dates"),
                ],
                [
                    filterButton("All", model.filter, toParentMessage, h),
                    filterButton("Confirmed", model.filter, toParentMessage, h),
                ]
            ),
            Array.match(model.groups, {
                onEmpty: () =>
                    h.p(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-border bg-card p-6 text-center text-muted-foreground"
                            ),
                        ],
                        ["No Tour Dates found"]
                    ),
                onNonEmpty: (groups) =>
                    h.div(
                        [h.Class("flex flex-col gap-6")],
                        Array.map(groups, (group) =>
                            groupView(
                                group,
                                model.filter,
                                model.editor_state._tag === "Editing",
                                toParentMessage,
                                h
                            )
                        )
                    ),
            }),
        ]
    )
