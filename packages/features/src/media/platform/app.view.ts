import { Match as M, Number } from "effect"
import { File, Submodel } from "foldkit"
import * as Ui from "@foldkit/ui"
import type { Document, Html, HtmlBuilder } from "foldkit/html"

import { toImageSrc } from "@urm/utils/media"
import type { Image } from "@urm/domain/schemas/media"
import type { Tag } from "@urm/domain/schemas/tags"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import {
    sidebarShellMobileView,
    sidebarShellView,
} from "@urm/ui/foldkit/sidebar-shell.view.ts"

import {
    CancelledDeleteImage,
    CategoryFilterChanged,
    ChangedViewMode,
    ClickedAddTag,
    ClickedRemoveTag,
    ClickedSaveImageEdits,
    ClickedUploadImages,
    ClosedImageEditor,
    ConfirmedDeleteImage,
    EditingAltChanged,
    EditingCategoryChanged,
    EditingTextChanged,
    GotUploadDropMessage,
    GotSidebarTooltipMessage,
    NewTagNameChanged,
    OpenedImageEditor,
    RemovedSelectedUploadFile,
    RequestedDeleteImage,
    SearchQueryChanged,
    SelectedGalleryImage,
    SubmittedNewTag,
    ToggledTagPicker,
    ToggledUploadPanel,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
} from "./app.message.ts"
import type { Model, ViewMode } from "./app.model.ts"
import { availableTags, imageTags } from "./app.tags.ts"
import { galleryHref, libraryHref, videoHref } from "./route.ts"
import { videoDetailHref } from "./route.ts"
import {
    fullscreenImage,
    galleryContent,
    imageTransitionStyle,
} from "../gallery/gallery.view.ts"
import { videoContent } from "../video/video.view.ts"
import { getSidebarTooltipsState } from "./sidebar.tooltips.state.ts"
import { Message } from "./app.message.ts"

const stableToggledAppSidebarIsCollapsed = ToggledAppSidebarIsCollapsed()
const stableToggledAppSidebarMobileIsOpen = ToggledAppSidebarMobileIsOpen()

export type MediaViewHrefs = Readonly<{
    library_href: () => string
    gallery_href: () => string
    video_href: () => string
    video_detail_href: typeof videoDetailHref
    manage_videos: boolean
    image_src: (url: string) => string
}>

const web_hrefs: MediaViewHrefs = {
    library_href: libraryHref,
    gallery_href: galleryHref,
    video_href: videoHref,
    video_detail_href: videoDetailHref,
    manage_videos: false,
    image_src: toImageSrc,
}

const toSidebarTooltipMessage = (
    key: string,
    message: import("@foldkit/ui/tooltip").Message
) => GotSidebarTooltipMessage({ tooltipId: key, message })

type NavItem = Readonly<{
    label: string
    routeTag: string
    href: string
    icon: (props?: Readonly<{ class?: string }>) => Html
}>

const NAV_ITEMS: ReadonlyArray<NavItem> = [
    {
        label: "Library",
        routeTag: "Library",
        href: libraryHref(),
        icon: AppIcon.IconFileText,
    },
    {
        label: "Gallery",
        routeTag: "Gallery",
        href: galleryHref(),
        icon: AppIcon.IconImage,
    },
    {
        label: "Video",
        routeTag: "Video",
        href: videoHref(),
        icon: AppIcon.IconVideo,
    },
]

const sidebarView = (
    currentRouteTag: string,
    isCollapsed: boolean,
    h: HtmlBuilder<Message>
) =>
    sidebarShellView<Message>(
        {
            currentRoute: currentRouteTag,
            title: "Media",
            subtitle: "URM",
            homeHref: libraryHref(),
            homeIcon: AppIcon.IconImage,
            toggleIconCollapsed: AppIcon.IconSidebarOpen,
            toggleIconExpanded: AppIcon.IconPanelLeft,
            navItems: NAV_ITEMS,
            sidebarTooltips: getSidebarTooltipsState(),
            isCollapsed,
            onToggle: stableToggledAppSidebarIsCollapsed,
            toSidebarTooltipMessage,
        },
        h
    )

const sidebarMobileView = (
    currentRouteTag: string,
    isOpen: boolean,
    h: HtmlBuilder<Message>
) =>
    sidebarShellMobileView<Message>(
        {
            currentRoute: currentRouteTag,
            title: "Media",
            subtitle: "URM",
            homeHref: libraryHref(),
            homeIcon: AppIcon.IconImage,
            navItems: NAV_ITEMS,
            isOpen,
            onToggle: stableToggledAppSidebarMobileIsOpen,
        },
        h
    )

const dropZoneClassName =
    "flex flex-col items-center gap-2 cursor-pointer rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-muted px-6 py-10 text-center hover:border-primary select-none data-[drag-over]:border-primary data-[drag-over]:bg-accent"

const primaryTextClassName = "text-base font-medium text-foreground"
const secondaryTextClassName = "text-sm text-muted-foreground"
const panelClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const cardClassName =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border"

const fileKey = (file: File.File): string =>
    `${File.name(file)}:${File.size(file)}:${file.lastModified}`

const formatFileSize = (bytes: number): string =>
    M.value(bytes).pipe(
        M.when(Number.isLessThan(1024), () => `${bytes} B`),
        M.when(
            Number.isLessThan(1024 * 1024),
            () => `${(bytes / 1024).toFixed(1)} KB`
        ),
        M.orElse(() => `${(bytes / (1024 * 1024)).toFixed(1)} MB`)
    )

const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleString()

const normalizedText = (value: string): string => value.trim().toLowerCase()

const filteredImages = (model: Model) => {
    const search = normalizedText(model.searchQuery)

    return model.images.filter((image) => {
        if (
            model.categoryFilter !== "all" &&
            image.category !== model.categoryFilter
        ) {
            return false
        }

        if (search === "") {
            return true
        }

        return (
            normalizedText(image.alt).includes(search) ||
            normalizedText(image.text).includes(search) ||
            normalizedText(image.category ?? "").includes(search)
        )
    })
}

const categories = (model: Model): ReadonlyArray<string> => {
    const seen = new Set<string>()

    model.images.forEach((image) => {
        if (image.category !== undefined && image.category !== "") {
            seen.add(image.category)
        }
    })

    return [
        "all",
        ...globalThis.Array.from(seen).sort((left, right) =>
            left.localeCompare(right)
        ),
    ]
}

const categoryLabel = (category: string): string =>
    category === "all"
        ? "All Categories"
        : category.charAt(0).toUpperCase() + category.slice(1)

const formatDay = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString()

// absent unless both dimensions came back from the upload probe
const dimensionsLabel = (image: Image): string | null =>
    image.width === undefined || image.height === undefined
        ? null
        : `${image.width} × ${image.height}`

const uploadPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class(panelClassName)],
        [
            h.div(
                [h.Class("mb-4 flex items-center justify-between gap-3")],
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
                                ["Upload Images"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Choose PNG, JPEG, WebP or GIF images up to 1 MB each.",
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Title("Close"),
                            h.AriaLabel("Close upload panel"),
                            ...(model.can_write === false
                                ? [h.Disabled(true)]
                                : []),
                            h.OnClick(ToggledUploadPanel()),
                            h.Class(
                                "inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-accent hover:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        [AppIcon.IconX({ class: "size-4" })]
                    ),
                ]
            ),
            h.submodel({
                slotId: model.uploadDrop.id,
                model: model.uploadDrop,
                view: Ui.FileDrop.view,
                viewInputs: {
                    multiple: true,
                    accept: [
                        "image/png",
                        "image/jpeg",
                        "image/webp",
                        "image/gif",
                    ],
                    toView: (attributes) =>
                        h.label(
                            [...attributes.root, h.Class(dropZoneClassName)],
                            [
                                h.p(
                                    [h.Class(primaryTextClassName)],
                                    ["Drop files or click to browse"]
                                ),
                                h.p(
                                    [h.Class(secondaryTextClassName)],
                                    ["PNG, JPG, WEBP, or GIF"]
                                ),
                                h.input(attributes.input),
                            ]
                        ),
                },
                toParentMessage: (message) => GotUploadDropMessage({ message }),
            }),
            h.div(
                [h.Class("mt-4 space-y-3")],
                [
                    ...(model.selectedUploadFiles.length === 0
                        ? [
                              h.p(
                                  [h.Class("text-sm text-muted-foreground")],
                                  ["No files selected yet."]
                              ),
                          ]
                        : [
                              h.div(
                                  [h.Class("space-y-2")],
                                  model.selectedUploadFiles.map(
                                      (file, fileIndex) =>
                                          h.keyed("div")(
                                              fileKey(file),
                                              [
                                                  h.Class(
                                                      "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2"
                                                  ),
                                              ],
                                              [
                                                  h.div(
                                                      [h.Class("min-w-0")],
                                                      [
                                                          h.p(
                                                              [
                                                                  h.Class(
                                                                      "truncate text-sm font-medium text-foreground"
                                                                  ),
                                                              ],
                                                              [File.name(file)]
                                                          ),
                                                          h.p(
                                                              [
                                                                  h.Class(
                                                                      "text-xs text-muted-foreground"
                                                                  ),
                                                              ],
                                                              [
                                                                  formatFileSize(
                                                                      File.size(
                                                                          file
                                                                      )
                                                                  ),
                                                              ]
                                                          ),
                                                      ]
                                                  ),
                                                  h.button(
                                                      [
                                                          h.Type("button"),
                                                          h.OnClick(
                                                              RemovedSelectedUploadFile(
                                                                  { fileIndex }
                                                              )
                                                          ),
                                                          h.Class(
                                                              "text-sm text-muted-foreground hover:text-destructive"
                                                          ),
                                                      ],
                                                      ["Remove"]
                                                  ),
                                              ]
                                          )
                                  )
                              ),
                          ]),
                    h.div(
                        [h.Class("flex items-center justify-end gap-2")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Disabled(
                                        model.uploadBusy ||
                                            model.selectedUploadFiles.length ===
                                                0
                                    ),
                                    ...(model.can_write === false
                                        ? [h.Disabled(true)]
                                        : []),
                                    h.OnClick(ClickedUploadImages()),
                                    h.Class(
                                        "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                [model.uploadBusy ? "Uploading..." : "Upload"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const tagPillClassName =
    "inline-flex items-center gap-1 rounded-full border-(length:--surface-border-width) border-border bg-background px-2 py-0.5 text-xs text-foreground [box-shadow:var(--shadow-control)]"

// tag colours are theme tokens (var(--chart-1) and friends), so they ride on a
// dot rather than filling the pill -- a filled pill would need a matching
// foreground token per colour
const tagDot = (tag: Tag, h: HtmlBuilder<Message>): Html =>
    h.span(
        [
            h.Class("size-2 shrink-0 rounded-full"),
            h.Style({ backgroundColor: tag.color }),
        ],
        []
    )

const tagPill = (tag: Tag, h: HtmlBuilder<Message>): Html =>
    h.keyed("span")(
        tag.id,
        [h.Class(tagPillClassName)],
        [tagDot(tag, h), tag.name]
    )

const removableTagPill = (
    tag: Tag,
    busy: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.keyed("span")(
        tag.id,
        [h.Class(tagPillClassName)],
        [
            tagDot(tag, h),
            tag.name,
            h.button(
                [
                    h.Type("button"),
                    h.Title(`Remove ${tag.name}`),
                    h.AriaLabel(`Remove ${tag.name}`),
                    h.Disabled(busy),
                    h.OnClick(ClickedRemoveTag({ tagId: tag.id })),
                    h.Class(
                        "rounded-full p-0.5 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive disabled:opacity-50"
                    ),
                ],
                [AppIcon.IconX({ class: "size-3" })]
            ),
        ]
    )

// the read-only half of the tagger, for the card and the table row
const imageTagList = (
    model: Model,
    imageId: string,
    h: HtmlBuilder<Message>
): Html => {
    const tags = imageTags(model, imageId)

    if (tags.length === 0) {
        return h.empty
    }

    return h.div(
        [h.Class("flex flex-wrap gap-1")],
        tags.map((tag) => tagPill(tag, h))
    )
}

const tagPicker = (
    model: Model,
    available: ReadonlyArray<Tag>,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "space-y-2 border-t-(length:--surface-border-width) border-border pt-2"
            ),
        ],
        [
            h.form(
                [h.OnSubmit(SubmittedNewTag()), h.Class("flex gap-1")],
                [
                    h.input([
                        h.Value(model.newTagName),
                        h.Placeholder("New tag name"),
                        h.AriaLabel("New tag name"),
                        h.Disabled(model.tagsBusy),
                        h.Class(
                            "h-8 flex-1 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        ),
                        h.OnInput((value) => NewTagNameChanged({ value })),
                    ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Title("Add tag"),
                            h.AriaLabel("Add tag"),
                            h.Disabled(
                                model.tagsBusy || model.newTagName.trim() === ""
                            ),
                            h.Class(
                                "inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] bg-primary px-2 text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        [AppIcon.IconPlus({ class: "size-4" })]
                    ),
                ]
            ),
            ...(available.length === 0
                ? []
                : [
                      h.div(
                          [h.Class("flex flex-wrap items-center gap-1")],
                          [
                              h.span(
                                  [h.Class("text-xs text-muted-foreground")],
                                  ["Quick add:"]
                              ),
                              ...available.slice(0, 5).map((tag) =>
                                  h.keyed("button")(
                                      tag.id,
                                      [
                                          h.Type("button"),
                                          h.Disabled(model.tagsBusy),
                                          h.OnClick(
                                              ClickedAddTag({
                                                  tagId: tag.id,
                                              })
                                          ),
                                          h.Class(
                                              "inline-flex h-6 items-center gap-1 rounded-full border-(length:--surface-border-width) border-border px-2 text-xs text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50 [box-shadow:var(--shadow-control)]"
                                          ),
                                      ],
                                      [
                                          AppIcon.IconPlus({
                                              class: "size-3",
                                          }),
                                          tag.name,
                                      ]
                                  )
                              ),
                          ]
                      ),
                  ]),
        ]
    )

const imageTagger = (
    model: Model,
    imageId: string,
    h: HtmlBuilder<Message>
): Html => {
    const current = imageTags(model, imageId)
    const available = availableTags(model, imageId)

    return h.div(
        [h.Class("space-y-2")],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-2")],
                [
                    h.span(
                        [h.Class("block text-sm font-medium text-foreground")],
                        ["Tags"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Title(
                                model.tagPickerOpen
                                    ? "Hide tag picker"
                                    : "Add a tag"
                            ),
                            h.AriaLabel(
                                model.tagPickerOpen
                                    ? "Hide tag picker"
                                    : "Add a tag"
                            ),
                            h.AriaExpanded(model.tagPickerOpen),
                            h.OnClick(ToggledTagPicker()),
                            h.Class(
                                "inline-flex size-7 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground transition hover:bg-accent hover:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        [AppIcon.IconTags({ class: "size-4" })]
                    ),
                ]
            ),
            current.length === 0
                ? h.p(
                      [h.Class("text-xs text-muted-foreground")],
                      ["No tags yet."]
                  )
                : h.div(
                      [h.Class("flex flex-wrap gap-1")],
                      current.map((tag) =>
                          removableTagPill(tag, model.tagsBusy, h)
                      )
                  ),
            ...(model.tagPickerOpen ? [tagPicker(model, available, h)] : []),
            ...(model.tagsError === null
                ? []
                : [
                      h.p(
                          [h.Class("text-xs text-destructive")],
                          [model.tagsError]
                      ),
                  ]),
        ]
    )
}

const inlineImageEditor = (
    model: Model,
    image: Image,
    h: HtmlBuilder<Message>
): Html => {
    if (model.editingImageId !== image.id) {
        return h.empty
    }

    return h.div(
        [
            h.Class(
                "space-y-4 border-t-(length:--surface-border-width) border-border bg-muted/20 p-4"
            ),
        ],
        [
            h.div(
                [h.Class("grid gap-4 md:grid-cols-2")],
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
                                ["Alt text"]
                            ),
                            h.input([
                                h.Value(model.editingAlt),
                                h.Class(
                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    EditingAltChanged({ value })
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
                                ["Category"]
                            ),
                            h.input([
                                h.Value(model.editingCategory),
                                h.Placeholder("Leave blank for none"),
                                h.Class(
                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    EditingCategoryChanged({ value })
                                ),
                            ]),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-4 space-y-2")],
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
                                ["Notes"]
                            ),
                            h.textarea([
                                h.Value(model.editingText),
                                h.Class(
                                    "min-h-28 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    EditingTextChanged({ value })
                                ),
                            ]),
                        ]
                    ),
                ]
            ),
            h.div([h.Class("mt-4")], [imageTagger(model, image.id, h)]),
            h.div(
                [h.Class("mt-4 flex items-center justify-between gap-3")],
                [
                    h.div(
                        [h.Class("text-xs text-muted-foreground")],
                        [formatDate(image.updated_at)]
                    ),
                    h.div(
                        [h.Class("flex items-center gap-2")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ClosedImageEditor()),
                                    h.Class(
                                        "rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                ["Cancel"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    ...(model.can_write === false
                                        ? [h.Disabled(true)]
                                        : []),
                                    h.OnClick(ClickedSaveImageEdits()),
                                    h.Class(
                                        "rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                ["Save"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const overlayActionClassName =
    "inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] bg-secondary text-secondary-foreground [box-shadow:var(--shadow-control)] transition hover:bg-secondary/80 border-(length:--control-border-width) border-border"

const overlayDeleteClassName =
    "inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] bg-destructive text-destructive-foreground [box-shadow:var(--shadow-control)] transition hover:bg-destructive/90 border-(length:--control-border-width) border-border"

const rowActionClassName =
    "inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground transition hover:bg-accent hover:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const imageCard = (
    model: Model,
    image: Image,
    h: HtmlBuilder<Message>,
    image_src: (url: string) => string
): Html => {
    const dimensions = dimensionsLabel(image)

    return h.keyed("article")(
        image.id,
        [
            h.Class(
                `group relative ${cardClassName} transition-shadow hover:[box-shadow:var(--shadow-surface)] ${model.editingImageId === image.id ? "col-span-2 md:col-span-2 lg:col-span-3" : ""}`
            ),
        ],
        [
            h.button(
                [
                    h.Type("button"),
                    h.AriaLabel(`Open ${image.alt || "Untitled"} fullscreen`),
                    h.OnClick(SelectedGalleryImage({ imageId: image.id })),
                    h.Class(
                        "block aspect-square w-full cursor-zoom-in bg-muted p-0 text-left"
                    ),
                ],
                [
                    h.img([
                        h.Class("h-full w-full object-cover"),
                        h.Src(image_src(image.url)),
                        h.Alt(image.alt || "Untitled"),
                        h.Loading("lazy"),
                        h.Style(imageTransitionStyle(image)),
                    ]),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex gap-2")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Title("Edit metadata"),
                                    h.AriaLabel("Edit metadata"),
                                    ...(model.can_write === false
                                        ? [h.Disabled(true)]
                                        : []),
                                    h.OnClick(
                                        OpenedImageEditor({ imageId: image.id })
                                    ),
                                    h.Class(overlayActionClassName),
                                ],
                                [AppIcon.IconPencil({ class: "size-4" })]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Title("Delete image"),
                                    h.AriaLabel("Delete image"),
                                    ...(model.can_write === false
                                        ? [h.Disabled(true)]
                                        : []),
                                    h.OnClick(
                                        RequestedDeleteImage({
                                            imageId: image.id,
                                        })
                                    ),
                                    h.Class(overlayDeleteClassName),
                                ],
                                [AppIcon.IconTrash2({ class: "size-4" })]
                            ),
                        ]
                    ),
                ]
            ),
            ...(image.category === undefined || image.category === ""
                ? []
                : [
                      h.div(
                          [h.Class("absolute left-2 top-2")],
                          [
                              h.span(
                                  [
                                      h.Class(
                                          "rounded bg-black/50 px-2 py-1 text-xs text-white"
                                      ),
                                  ],
                                  [image.category]
                              ),
                          ]
                      ),
                  ]),
            h.div(
                [
                    h.Class(
                        model.editingImageId === image.id
                            ? "hidden"
                            : "space-y-1 p-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "truncate text-sm font-medium text-card-foreground"
                            ),
                        ],
                        [image.alt || "Untitled"]
                    ),
                    h.p(
                        [h.Class("text-xs text-muted-foreground")],
                        [formatDay(image.updated_at)]
                    ),
                    ...(dimensions === null
                        ? []
                        : [
                              h.p(
                                  [h.Class("text-xs text-muted-foreground")],
                                  [dimensions]
                              ),
                          ]),
                    imageTagList(model, image.id, h),
                ]
            ),
            inlineImageEditor(model, image, h),
        ]
    )
}

const imageGridView = (
    model: Model,
    images: ReadonlyArray<Image>,
    h: HtmlBuilder<Message>,
    image_src: (url: string) => string
): Html =>
    h.div(
        [
            h.Class(
                "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            ),
        ],
        images.map((image) => imageCard(model, image, h, image_src))
    )

const headerCellClassName =
    "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"

const imageRow = (
    model: Model,
    image: Image,
    h: HtmlBuilder<Message>,
    image_src: (url: string) => string
): Html =>
    h.keyed("tr")(
        image.id,
        [h.Class("hover:bg-muted/50")],
        [
            h.td(
                [h.Class("whitespace-nowrap px-6 py-4")],
                [
                    h.div(
                        [h.Class("flex items-center")],
                        [
                            h.div(
                                [h.Class("size-12 shrink-0")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.AriaLabel(
                                                `Open ${image.alt || "Untitled"} fullscreen`
                                            ),
                                            h.OnClick(
                                                SelectedGalleryImage({
                                                    imageId: image.id,
                                                })
                                            ),
                                            h.Class(
                                                "block size-12 cursor-zoom-in rounded p-0"
                                            ),
                                        ],
                                        [
                                            h.img([
                                                h.Class(
                                                    "size-12 rounded object-cover"
                                                ),
                                                h.Src(image_src(image.url)),
                                                h.Alt(image.alt || "Untitled"),
                                                h.Loading("lazy"),
                                                h.Style(
                                                    imageTransitionStyle(image)
                                                ),
                                            ]),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("ml-4 min-w-0")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-sm font-medium text-card-foreground"
                                            ),
                                        ],
                                        [image.alt || "Untitled"]
                                    ),
                                    ...(image.text === ""
                                        ? []
                                        : [
                                              h.div(
                                                  [
                                                      h.Class(
                                                          "max-w-xs truncate text-sm text-muted-foreground"
                                                      ),
                                                  ],
                                                  [image.text]
                                              ),
                                          ]),
                                    h.div(
                                        [h.Class("mt-1")],
                                        [imageTagList(model, image.id, h)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.td(
                [h.Class("whitespace-nowrap px-6 py-4")],
                [
                    image.category === undefined || image.category === ""
                        ? h.span(
                              [h.Class("text-sm text-muted-foreground")],
                              ["—"]
                          )
                        : h.span(
                              [
                                  h.Class(
                                      "rounded-full bg-muted px-2 py-1 text-xs font-medium text-card-foreground"
                                  ),
                              ],
                              [image.category]
                          ),
                ]
            ),
            h.td(
                [
                    h.Class(
                        "whitespace-nowrap px-6 py-4 text-sm text-muted-foreground"
                    ),
                ],
                [dimensionsLabel(image) ?? "Unknown"]
            ),
            h.td(
                [
                    h.Class(
                        "whitespace-nowrap px-6 py-4 text-sm text-muted-foreground"
                    ),
                ],
                [formatDay(image.updated_at)]
            ),
            h.td(
                [h.Class("whitespace-nowrap px-6 py-4 text-sm font-medium")],
                [
                    h.div(
                        [h.Class("flex gap-2")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Title("Edit metadata"),
                                    h.AriaLabel("Edit metadata"),
                                    ...(model.can_write === false
                                        ? [h.Disabled(true)]
                                        : []),
                                    h.OnClick(
                                        OpenedImageEditor({ imageId: image.id })
                                    ),
                                    h.Class(rowActionClassName),
                                ],
                                [AppIcon.IconPencil({ class: "size-4" })]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Title("Delete image"),
                                    h.AriaLabel("Delete image"),
                                    ...(model.can_write === false
                                        ? [h.Disabled(true)]
                                        : []),
                                    h.OnClick(
                                        RequestedDeleteImage({
                                            imageId: image.id,
                                        })
                                    ),
                                    h.Class(
                                        `${rowActionClassName} text-destructive hover:text-destructive`
                                    ),
                                ],
                                [AppIcon.IconTrash2({ class: "size-4" })]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const imageEditorRow = (
    model: Model,
    image: Image,
    h: HtmlBuilder<Message>
): Html =>
    h.keyed("tr")(
        `${image.id}-editor`,
        [h.Class(model.editingImageId === image.id ? "" : "hidden")],
        [
            h.td(
                [h.Attribute("colspan", "5"), h.Class("p-0")],
                [inlineImageEditor(model, image, h)]
            ),
        ]
    )

const imageListView = (
    model: Model,
    images: ReadonlyArray<Image>,
    h: HtmlBuilder<Message>,
    image_src: (url: string) => string
): Html =>
    h.div(
        [h.Class(cardClassName)],
        [
            h.div(
                [h.Class("overflow-x-auto")],
                [
                    h.table(
                        [h.Class("min-w-full divide-y divide-border")],
                        [
                            h.thead(
                                [h.Class("bg-muted")],
                                [
                                    h.tr(
                                        [],
                                        [
                                            "Image",
                                            "Category",
                                            "Dimensions",
                                            "Updated",
                                            "Actions",
                                        ].map((label) =>
                                            h.th(
                                                [h.Class(headerCellClassName)],
                                                [label]
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.tbody(
                                [h.Class("divide-y divide-border bg-card")],
                                images.flatMap((image) => [
                                    imageRow(model, image, h, image_src),
                                    imageEditorRow(model, image, h),
                                ])
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const emptyState = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class(cardClassName)],
        [
            h.div(
                [h.Class("py-12 text-center")],
                [
                    AppIcon.IconImage({
                        class: "mx-auto mb-4 size-12 text-muted-foreground",
                    }),
                    h.div(
                        [h.Class("mb-2 text-lg text-muted-foreground")],
                        ["No images found"]
                    ),
                    h.div(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            model.searchQuery !== "" ||
                            model.categoryFilter !== "all"
                                ? "Try adjusting your search or filters"
                                : "Upload some images to get started",
                        ]
                    ),
                ]
            ),
        ]
    )

const imageResults = (
    model: Model,
    h: HtmlBuilder<Message>,
    image_src: (url: string) => string
): Html => {
    if (model.loading) {
        return h.div(
            [h.Class("text-sm text-muted-foreground")],
            ["Loading media..."]
        )
    }

    const images = filteredImages(model)

    if (images.length === 0) {
        return emptyState(model, h)
    }

    return h.keyed("div")(
        model.viewMode,
        [],
        [
            model.viewMode === "grid"
                ? imageGridView(model, images, h, image_src)
                : imageListView(model, images, h, image_src),
        ]
    )
}

const deleteDialog = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (model.deleteConfirmId === null) {
        return h.empty
    }

    return h.div(
        [
            h.Class(
                "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            ),
        ],
        [
            h.div(
                [h.Class(`w-full max-w-sm ${panelClassName}`)],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold text-foreground")],
                        ["Delete image?"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Are you sure you want to delete this image? This cannot be undone.",
                        ]
                    ),
                    h.div(
                        [h.Class("mt-4 flex justify-end gap-2")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(CancelledDeleteImage()),
                                    h.Class(
                                        "rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                ["Cancel"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ConfirmedDeleteImage()),
                                    h.Class(
                                        "rounded-[var(--radius-control)] bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                ["Delete"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const viewModeButton = (
    mode: ViewMode,
    label: string,
    icon: (props?: Readonly<{ class?: string }>) => Html,
    model: Model,
    h: HtmlBuilder<Message>
): Html =>
    h.button(
        [
            h.Type("button"),
            h.Title(label),
            h.AriaLabel(label),
            h.AriaPressed(model.viewMode === mode ? "true" : "false"),
            h.OnClick(ChangedViewMode({ mode })),
            h.Class(
                `inline-flex h-10 items-center justify-center px-3 transition ${
                    model.viewMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
            ),
        ],
        [icon({ class: "size-4" })]
    )

const libraryToolbar = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("flex flex-col gap-4 sm:flex-row")],
        [
            h.div(
                [h.Class("relative flex-1")],
                [
                    AppIcon.IconSearch({
                        class: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                    }),
                    h.input([
                        h.Type("search"),
                        h.Value(model.searchQuery),
                        h.Placeholder("Search images..."),
                        h.AriaLabel("Search images"),
                        h.Class(
                            "h-10 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                        ),
                        h.OnInput((value) => SearchQueryChanged({ value })),
                    ]),
                ]
            ),
            Ui.Select.view(
                {
                    id: "media-library-category-filter",
                    value: model.categoryFilter,
                    onChange: (value) => CategoryFilterChanged({ value }),
                    toView: (attributes) =>
                        h.div(
                            [h.Class("w-full sm:w-50")],
                            [
                                h.label(
                                    [...attributes.label, h.Class("sr-only")],
                                    ["Filter by category"]
                                ),
                                h.select(
                                    [
                                        ...attributes.select,
                                        h.Class(
                                            "h-10 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                        ),
                                    ],
                                    categories(model).map((category) =>
                                        h.option(
                                            [h.Value(category)],
                                            [categoryLabel(category)]
                                        )
                                    )
                                ),
                            ]
                        ),
                },
                h
            ),
            h.button(
                [
                    h.Type("button"),
                    ...(model.can_write === false ? [h.Disabled(true)] : []),
                    h.OnClick(ToggledUploadPanel()),
                    h.Class(
                        "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    ),
                ],
                [
                    AppIcon.IconUpload({ class: "mr-2 size-4" }),
                    model.uploadPanelOpen ? "Hide Upload" : "Upload",
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    viewModeButton(
                        "grid",
                        "Grid view",
                        AppIcon.IconLayoutGrid,
                        model,
                        h
                    ),
                    viewModeButton(
                        "list",
                        "List view",
                        AppIcon.IconList,
                        model,
                        h
                    ),
                ]
            ),
        ]
    )

const resultCount = (model: Model): string => {
    const shown = filteredImages(model).length
    const suffix =
        model.categoryFilter === "all" ? "" : ` in "${model.categoryFilter}"`

    return `Showing ${shown} of ${model.images.length} images${suffix}`
}

const libraryContent = (
    model: Model,
    hrefs: MediaViewHrefs,
    h: HtmlBuilder<Message>
): Html => {
    const selected_image = model.images.find(
        (image) => image.id === model.selected_gallery_image_id
    )

    if (selected_image !== undefined) {
        return fullscreenImage(
            model,
            selected_image,
            h,
            hrefs.image_src,
            "Back to library"
        )
    }

    return h.div(
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
                                        "text-3xl font-bold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Media Library"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Browse and upload image assets from Tigris, then edit alt text, notes, and category metadata.",
                                ]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            h.Href(hrefs.gallery_href()),
                            h.Class(
                                "self-start rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-2 py-1 text-sm text-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        ["Gallery"]
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
            libraryToolbar(model, h),
            ...(model.uploadPanelOpen ? [uploadPanel(model, h)] : []),
            h.div(
                [h.Class("text-sm text-muted-foreground")],
                [resultCount(model)]
            ),
            imageResults(model, h, hrefs.image_src),
            deleteDialog(model, h),
        ]
    )
}

const contentViewWithHrefs = (
    model: Model,
    hrefs: MediaViewHrefs,
    h: HtmlBuilder<Message>
): Html => {
    const content = M.value(model.route).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            Library: () => libraryContent(model, hrefs, h),
            Gallery: () =>
                galleryContent(model, h, hrefs.library_href, hrefs.image_src),
            Video: ({ slug }) =>
                videoContent(
                    model,
                    slug,
                    h,
                    hrefs.video_detail_href,
                    hrefs.manage_videos
                ),
            NotFound: () => libraryContent(model, hrefs, h),
        })
    )

    return h.keyed("div")(model.route._tag, [], [content])
}

const contentView = (model: Model, h: HtmlBuilder<Message>): Html =>
    contentViewWithHrefs(model, web_hrefs, h)

export const submodelView = Submodel.defineView<Model, Message>(contentView)

export const routedSubmodelView = Submodel.defineView<
    Model,
    Message,
    MediaViewHrefs
>((model, hrefs, h) => contentViewWithHrefs(model, hrefs, h))

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
    const title = M.value(model.route).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Library: () => "Media Library | Media",
            Gallery: () => "Gallery | Media",
            Video: () => "Videos | Media",
            NotFound: () => "Not Found | Media",
        })
    )
    const currentRouteTag = model.route._tag

    const body = h.div(
        [h.Class("min-h-screen overflow-hidden bg-background text-foreground")],
        [
            sidebarMobileView(currentRouteTag, model.isSidebarMobileOpen, h),
            h.div(
                [h.Class("flex h-[calc(100dvh-4rem)] overflow-hidden")],
                [
                    sidebarView(currentRouteTag, model.isSidebarCollapsed, h),
                    h.main(
                        [
                            h.Class(
                                "relative z-0 flex-1 h-full min-h-0 overflow-auto bg-background"
                            ),
                        ],
                        [submodelView(model, h)]
                    ),
                ]
            ),
        ]
    )

    return {
        title,
        body,
    }
}
