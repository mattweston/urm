import { String } from "effect"
import * as Ui from "@foldkit/ui"
import { Submodel } from "foldkit"
import type { Document, Html, HtmlBuilder } from "foldkit/html"

import {
    ClickedCreateTag,
    ClickedDeleteTag,
    ClickedSaveTagEdits,
    ClosedTagEditor,
    ConfirmedDeleteTag,
    CreateTagColorChanged,
    CreateTagDescriptionChanged,
    CreateTagNameChanged,
    EditingTagColorChanged,
    EditingTagDescriptionChanged,
    EditingTagNameChanged,
    GotDeleteConfirmationDialogMessage,
    OpenedTagEditor,
    SearchQueryChanged,
    SortByChanged,
    type Message,
} from "./app.message.ts"
import {
    TAG_COLOR_OPTIONS,
    type Model,
    type TagColorOption,
    type TagSortBy,
} from "./app.model.ts"
const panelClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const cardClassName =
    "flex flex-col gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const inputClassName =
    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
const textareaClassName =
    "min-h-28 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"

const deleteConfirmationView = (
    model: Model,
    h: HtmlBuilder<Message>
): Html => {
    const toDialogMessage = (message: Ui.Dialog.Message) =>
        GotDeleteConfirmationDialogMessage({ message })

    return h.submodel({
        slotId: model.deleteConfirmationDialog.id,
        model: model.deleteConfirmationDialog,
        view: Ui.Dialog.view,
        viewInputs: {
            toView: (render) =>
                h.dialog(
                    [
                        ...render.dialog,
                        h.Class(
                            "backdrop:bg-black/50 bg-transparent p-0 open:flex items-center justify-center"
                        ),
                    ],
                    render.isVisible
                        ? [
                              h.div(
                                  [
                                      ...render.backdrop,
                                      h.Class("fixed inset-0 bg-black/50"),
                                  ],
                                  []
                              ),
                              h.div(
                                  [
                                      ...render.panel,
                                      h.Class(
                                          "w-full max-w-md rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                                      ),
                                  ],
                                  [
                                      h.h2(
                                          [
                                              h.Id(
                                                  Ui.Dialog.titleId(
                                                      model.deleteConfirmationDialog
                                                  )
                                              ),
                                              h.Class("text-xl font-semibold"),
                                          ],
                                          ["Delete tag"]
                                      ),
                                      h.p(
                                          [
                                              h.Class(
                                                  "mt-2 text-sm text-muted-foreground"
                                              ),
                                          ],
                                          [
                                              "Delete this tag? This cannot be undone.",
                                          ]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "mt-6 flex justify-end gap-2"
                                              ),
                                          ],
                                          [
                                              h.button(
                                                  [
                                                      ...render.closeButton,
                                                      h.Class(
                                                          "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                      ),
                                                  ],
                                                  ["Cancel"]
                                              ),
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.OnClick(
                                                          ConfirmedDeleteTag()
                                                      ),
                                                      h.Class(
                                                          "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                      ),
                                                  ],
                                                  ["Delete"]
                                              ),
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                        : []
                ),
        },
        toParentMessage: toDialogMessage,
    })
}

const paletteItemClassName = (selected: boolean): string =>
    [
        "flex items-center gap-2 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border px-3 py-2 text-left text-sm transition [box-shadow:var(--shadow-control)]",
        selected
            ? "border-primary bg-accent text-accent-foreground"
            : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
    ].join(" ")

type TagCard = {
    readonly id: string
    readonly name: string
    readonly color: string
    readonly description?: string
    readonly kind?: "custom" | "role" | "person"
    readonly target_key?: string
    readonly updated_at: number
    readonly deleted_at?: number
    readonly usageCount: number
    readonly usageByType: ReadonlyArray<
        Readonly<{ entity_type: string; count: number }>
    >
}

const normalizedText = (value: string): string => value.trim().toLowerCase()

const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleString()

const toTagSortBy = (value: string): TagSortBy => {
    if (value === "created") {
        return "created"
    }

    if (value === "usage") {
        return "usage"
    }

    return "name"
}

const colorSwatch = (option: TagColorOption, h: HtmlBuilder<Message>): Html =>
    h.span(
        [
            h.Class(
                "h-4 w-4 shrink-0 rounded-full border-(length:--surface-border-width) border-border"
            ),
            h.Style({ backgroundColor: option.value }),
        ],
        []
    )

const colorPalette = (
    value: string,
    onSelect: (color: string) => Message,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("grid gap-2 sm:grid-cols-2 lg:grid-cols-3")],
        TAG_COLOR_OPTIONS.map((option) =>
            h.button(
                [
                    h.Type("button"),
                    h.AriaPressed(value === option.value ? "true" : "false"),
                    h.AriaLabel(option.label),
                    h.OnClick(onSelect(option.value)),
                    h.Class(
                        [
                            paletteItemClassName(value === option.value),
                            "justify-center",
                        ].join(" ")
                    ),
                ],
                [colorSwatch(option, h)]
            )
        )
    )

const usageForTag = (
    tagId: string,
    entityTags: Model["entityTags"]
): TagCard["usageByType"] => {
    const usage = entityTags.filter((entityTag) => entityTag.tag_id === tagId)
    const byType = usage.reduce<Record<string, number>>(
        (accumulator, entityTag) => {
            accumulator[entityTag.entity_type] =
                (accumulator[entityTag.entity_type] ?? 0) + 1
            return accumulator
        },
        {}
    )

    return Object.entries(byType)
        .map(([entity_type, count]) => ({ entity_type, count }))
        .sort((left, right) =>
            left.entity_type.localeCompare(right.entity_type)
        )
}

const tagsWithUsage = (model: Model): ReadonlyArray<TagCard> =>
    model.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        ...(tag.description === undefined
            ? {}
            : { description: tag.description }),
        ...(tag.kind === undefined ? {} : { kind: tag.kind }),
        ...(tag.target_key === undefined ? {} : { target_key: tag.target_key }),
        updated_at: tag.updated_at,
        ...(tag.deleted_at === undefined ? {} : { deleted_at: tag.deleted_at }),
        usageCount: model.entityTags.filter(
            (entityTag) => entityTag.tag_id === tag.id
        ).length,
        usageByType: usageForTag(tag.id, model.entityTags),
    }))

const filteredAndSortedTags = (model: Model): ReadonlyArray<TagCard> => {
    const search = normalizedText(model.searchQuery)
    const base = tagsWithUsage(model).filter((tag) => {
        if (search === "") {
            return true
        }

        return (
            normalizedText(tag.name).includes(search) ||
            normalizedText(tag.color).includes(search) ||
            normalizedText(tag.description ?? "").includes(search)
        )
    })

    return [...base].sort((left, right) => {
        if (model.sortBy === "name") {
            return left.name.localeCompare(right.name)
        }

        if (model.sortBy === "created") {
            return right.updated_at - left.updated_at
        }

        return right.usageCount - left.usageCount
    })
}

const createSection = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.section(
        [h.Class(panelClassName)],
        [
            h.div(
                [h.Class("mb-4 flex items-start justify-between gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-lg font-semibold text-foreground"
                                    ),
                                ],
                                ["Create Tag"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Tags stay reusable across media, tasks, issues, and other entities.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("text-xs text-muted-foreground")],
                        [model.mutating ? "Saving..." : "Ready"]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]")],
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
                                ["Name"]
                            ),
                            h.input([
                                h.Value(model.creatingName),
                                h.Placeholder("Tag name"),
                                h.Class(inputClassName),
                                h.OnInput((value) =>
                                    CreateTagNameChanged({ value })
                                ),
                            ]),
                        ]
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
                                ["Color"]
                            ),
                            colorPalette(
                                model.creatingColor,
                                (value) => CreateTagColorChanged({ value }),
                                h
                            ),
                        ]
                    ),
                ]
            ),
            h.label(
                [h.Class("mt-4 space-y-2")],
                [
                    h.span(
                        [h.Class("block text-sm font-medium text-foreground")],
                        ["Description"]
                    ),
                    h.textarea([
                        h.Value(model.creatingDescription),
                        h.Placeholder("Optional note or topic summary"),
                        h.Class(textareaClassName),
                        h.OnInput((value) =>
                            CreateTagDescriptionChanged({ value })
                        ),
                    ]),
                ]
            ),
            h.div(
                [h.Class("mt-4 flex items-center justify-end")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(
                                model.loading ||
                                    model.can_write === false ||
                                    model.mutating ||
                                    String.trim(model.creatingName) === ""
                            ),
                            h.OnClick(ClickedCreateTag()),
                            h.Class(
                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        [model.mutating ? "Saving..." : "Create Tag"]
                    ),
                ]
            ),
        ]
    )

const editSection = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (model.editingTagId === null) {
        return h.empty
    }

    const tag = model.tags.find((item) => item.id === model.editingTagId)

    if (tag === undefined) {
        return h.empty
    }

    return h.section(
        [h.Class(panelClassName)],
        [
            h.div(
                [h.Class("mb-4 flex items-start justify-between gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-lg font-semibold text-foreground"
                                    ),
                                ],
                                ["Edit Tag"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [tag.id]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ClosedTagEditor()),
                            h.Class(
                                "text-sm text-muted-foreground hover:text-foreground"
                            ),
                        ],
                        ["Close"]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]")],
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
                                ["Name"]
                            ),
                            h.input([
                                h.Value(model.editingName),
                                h.Placeholder("Tag name"),
                                h.Class(inputClassName),
                                h.OnInput((value) =>
                                    EditingTagNameChanged({ value })
                                ),
                            ]),
                        ]
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
                                ["Color"]
                            ),
                            colorPalette(
                                model.editingColor,
                                (value) => EditingTagColorChanged({ value }),
                                h
                            ),
                        ]
                    ),
                ]
            ),
            h.label(
                [h.Class("mt-4 space-y-2")],
                [
                    h.span(
                        [h.Class("block text-sm font-medium text-foreground")],
                        ["Description"]
                    ),
                    h.textarea([
                        h.Value(model.editingDescription),
                        h.Placeholder("Optional note or topic summary"),
                        h.Class(textareaClassName),
                        h.OnInput((value) =>
                            EditingTagDescriptionChanged({ value })
                        ),
                    ]),
                ]
            ),
            h.div(
                [h.Class("mt-4 flex items-center justify-end gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ClosedTagEditor()),
                            h.Class(
                                "rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        ["Cancel"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(
                                model.loading ||
                                    model.can_write === false ||
                                    model.mutating ||
                                    String.trim(model.editingName) === ""
                            ),
                            h.OnClick(ClickedSaveTagEdits()),
                            h.Class(
                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        [model.mutating ? "Saving..." : "Save Changes"]
                    ),
                ]
            ),
        ]
    )
}

const tagCards = (model: Model, h: HtmlBuilder<Message>): Html => {
    const tags = filteredAndSortedTags(model)

    if (model.loading && model.tags.length === 0) {
        return h.div(
            [h.Class("text-sm text-muted-foreground")],
            ["Loading tags..."]
        )
    }

    if (tags.length === 0) {
        return h.div(
            [
                h.Class(
                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-10 text-center text-muted-foreground"
                ),
            ],
            ["No tags found."]
        )
    }

    return h.div(
        [h.Class("grid gap-4 md:grid-cols-2 xl:grid-cols-3")],
        tags.map((tag) =>
            h.keyed("article")(
                tag.id,
                [h.Class(cardClassName)],
                [
                    h.div(
                        [h.Class("flex items-start justify-between gap-3")],
                        [
                            h.div(
                                [h.Class("min-w-0 flex-1")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex min-w-0 items-start gap-3"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "mt-1 h-4 w-4 shrink-0 rounded-full border-(length:--surface-border-width) border-border"
                                                    ),
                                                    h.Style({
                                                        backgroundColor:
                                                            tag.color,
                                                    }),
                                                ],
                                                []
                                            ),
                                            h.h3(
                                                [
                                                    h.Class(
                                                        "min-w-0 truncate text-sm font-semibold text-foreground"
                                                    ),
                                                ],
                                                [tag.name]
                                            ),
                                        ]
                                    ),
                                    ...(tag.kind === "role" ||
                                    tag.kind === "person"
                                        ? [
                                              h.span(
                                                  [
                                                      h.Class(
                                                          "mt-2 inline-flex rounded-full border-(length:--surface-border-width) border-border bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      tag.kind === "role"
                                                          ? "Role"
                                                          : "Person",
                                                  ]
                                              ),
                                          ]
                                        : []),
                                ]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border-(length:--surface-border-width) border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                    ),
                                ],
                                [
                                    tag.usageCount === 1
                                        ? "1 use"
                                        : `${tag.usageCount} uses`,
                                ]
                            ),
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm leading-6 text-muted-foreground")],
                        [tag.description ?? "No description yet."]
                    ),
                    h.div(
                        [h.Class("space-y-4")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                tag.usageByType.length === 0
                                    ? [
                                          h.span(
                                              [
                                                  h.Class(
                                                      "text-xs text-muted-foreground"
                                                  ),
                                              ],
                                              ["No entity links yet."]
                                          ),
                                      ]
                                    : tag.usageByType.map((usage) =>
                                          h.span(
                                              [
                                                  h.Class(
                                                      "rounded-full border-(length:--surface-border-width) border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                                                  ),
                                              ],
                                              [
                                                  `${usage.entity_type}: ${usage.count}`,
                                              ]
                                          )
                                      )
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between gap-3 text-xs text-muted-foreground"
                                    ),
                                ],
                                [
                                    h.span([], [formatDate(tag.updated_at)]),
                                    tag.kind === "role" || tag.kind === "person"
                                        ? h.span(
                                              [
                                                  h.Class(
                                                      "font-medium text-muted-foreground"
                                                  ),
                                              ],
                                              ["Managed from workspace access"]
                                          )
                                        : h.div(
                                              [
                                                  h.Class(
                                                      "flex items-center gap-3"
                                                  ),
                                              ],
                                              [
                                                  h.button(
                                                      [
                                                          h.Type("button"),
                                                          ...(model.can_write ===
                                                          false
                                                              ? [
                                                                    h.Disabled(
                                                                        true
                                                                    ),
                                                                ]
                                                              : []),
                                                          h.OnClick(
                                                              OpenedTagEditor({
                                                                  tagId: tag.id,
                                                              })
                                                          ),
                                                          h.Class(
                                                              "font-medium text-primary hover:underline"
                                                          ),
                                                      ],
                                                      ["Edit"]
                                                  ),
                                                  h.button(
                                                      [
                                                          h.Type("button"),
                                                          h.Disabled(
                                                              model.can_write ===
                                                                  false ||
                                                                  model.mutating
                                                          ),
                                                          h.OnClick(
                                                              ClickedDeleteTag({
                                                                  tagId: tag.id,
                                                              })
                                                          ),
                                                          h.Class(
                                                              "font-medium text-muted-foreground hover:text-destructive"
                                                          ),
                                                      ],
                                                      ["Delete"]
                                                  ),
                                              ]
                                          ),
                                ]
                            ),
                        ]
                    ),
                ]
            )
        )
    )
}

const tagsView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.main(
        [h.Class("mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-8")],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-2xl font-semibold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Tags"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Manage shared labels and see where each tag is used across URM.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex items-center gap-2 text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            h.span(
                                [],
                                [`${filteredAndSortedTags(model).length} shown`]
                            ),
                            h.span([], ["/"]),
                            h.span([], [`${model.tags.length} total`]),
                        ]
                    ),
                ]
            ),
            ...(model.error === null
                ? []
                : [
                      h.div(
                          [
                              h.Class(
                                  "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                              ),
                          ],
                          [model.error]
                      ),
                  ]),
            h.div(
                [
                    h.Class(
                        "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground md:grid-cols-[minmax(0,1fr)_14rem] md:items-end"
                    ),
                ],
                [
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.label(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Search"]
                            ),
                            h.input([
                                h.Type("search"),
                                h.Value(model.searchQuery),
                                h.Placeholder(
                                    "Search names, descriptions, or colors..."
                                ),
                                h.Class(inputClassName),
                                h.OnInput((value) =>
                                    SearchQueryChanged({ value })
                                ),
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.label(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Sort by"]
                            ),
                            h.select(
                                [
                                    h.Value(model.sortBy),
                                    h.Class(inputClassName),
                                    h.OnInput((value) =>
                                        SortByChanged({
                                            value: toTagSortBy(value),
                                        })
                                    ),
                                ],
                                [
                                    h.option([h.Value("name")], ["Name"]),
                                    h.option([h.Value("created")], ["Updated"]),
                                    h.option([h.Value("usage")], ["Usage"]),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            createSection(model, h),
            editSection(model, h),
            tagCards(model, h),
            deleteConfirmationView(model, h),
        ]
    )

export const submodelView = Submodel.defineView<Model, Message>(tagsView)

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: "Tags | URM",
    body: h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [tagsView(model, h)]
    ),
})
