import { Option } from "effect"
import { Mount } from "foldkit"
import { FileDrop } from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import { detailsView } from "./gallery.details.view.ts"
import { frames, getGalleryText } from "./images.ts"
import type { Model } from "./gallery.model.ts"
import { mountGallery } from "./gallery.mount.ts"
import { default_image_settings } from "./gallery.presentation.ts"
import type { Message } from "./gallery.message.ts"
import {
    ChangedImageSettings,
    ClickedBrowseArtwork,
    ClickedCloseEditor,
    ClickedDetails,
    ClickedEditArtwork,
    ClickedFrame,
    ClickedArtworkList,
    ClickedArtworkListItem,
    ClickedResetView,
    ClickedRestoreFrameImage,
    ClickedRetryImages,
    GotFileDropMessage,
    ToggledGridView,
    UpdatedTextureState,
} from "./gallery.message.ts"
import { gallery3dEditHrefs, type Gallery3dEditHrefs } from "./gallery.route.ts"
import { artwork_image_transition_style } from "./gallery.transition.ts"

const button_class =
    "min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

export const view = <ParentMessage>(
    model: Model,
    to_parent: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    hrefs: Gallery3dEditHrefs = gallery3dEditHrefs
): Html => {
    const details_key =
        model.route._tag === "Gallery3dEditItemDetails" ||
        model.route._tag === "Gallery3dEditArtworkDetails"
            ? model.route.frameKey
            : undefined
    const is_artwork_list_details =
        model.route._tag === "Gallery3dEditArtworkDetails"
    const selected_key = Option.getOrUndefined(model.selectedFrameKey)
    const selected_index = frames.findIndex(
        (frame) => frame.key === selected_key
    )
    const failed_count = Object.values(model.texture_states).filter(
        (status) => status === "failed"
    ).length
    const loaded_count = Object.values(model.texture_states).filter(
        (status) => status === "loaded"
    ).length
    const scene_hidden = details_key !== undefined || model.grid_view
    const button = (label: string, message: Message, disabled = false) =>
        h.button(
            [
                h.Type("button"),
                h.Class(button_class),
                h.Disabled(disabled),
                h.OnClick(to_parent(message)),
            ],
            [label]
        )

    return h.section(
        [h.Class("w-full space-y-4"), h.AriaLabel("Artwork gallery")],
        [
            h.div(
                [h.Class("flex flex-wrap items-center gap-2")],
                [
                    button(
                        model.grid_view ? "3D view" : "Artwork list",
                        ToggledGridView(),
                        !model.scene_available
                    ),
                    button("Previous", ClickedBrowseArtwork({ direction: -1 })),
                    h.span(
                        [
                            h.Attribute("role", "status"),
                            h.Class(
                                "px-2 text-sm text-muted-foreground tabular-nums"
                            ),
                        ],
                        [
                            selected_index < 0
                                ? `${frames.length} artworks`
                                : `${selected_index + 1} / ${frames.length}`,
                        ]
                    ),
                    button("Next", ClickedBrowseArtwork({ direction: 1 })),
                    button(
                        "Reset view",
                        ClickedResetView(),
                        !model.scene_available
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        scene_hidden
                            ? "hidden"
                            : "relative h-[60vh] min-h-80 w-full overflow-hidden rounded-[var(--radius-surface)] border border-border"
                    ),
                    h.Attribute("aria-hidden", scene_hidden ? "true" : "false"),
                    h.OnMount(Mount.mapMessage(mountGallery(), to_parent)),
                ],
                []
            ),
            !scene_hidden
                ? h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      [
                          "Drag to look around. Scroll to move closer. Select an artwork to read about it. Use Previous / Next or focus the gallery and press the arrow keys to browse; Escape closes the selection.",
                      ]
                  )
                : h.empty,
            model.imagesState._tag === "ImagesLoading"
                ? h.p(
                      [
                          h.Attribute("role", "status"),
                          h.Class("text-sm text-muted-foreground"),
                      ],
                      [`Loading artworks: ${loaded_count} / ${frames.length}`]
                  )
                : h.empty,
            failed_count > 0
                ? h.div(
                      [
                          h.Class("flex flex-wrap items-center gap-3"),
                          h.Attribute("role", "status"),
                      ],
                      [
                          h.p(
                              [h.Class("text-sm text-muted-foreground")],
                              [
                                  `${failed_count} artwork image${failed_count === 1 ? "" : "s"} could not load. Titles and descriptions are still available.`,
                              ]
                          ),
                          button(
                              "Retry images",
                              ClickedRetryImages(),
                              model.image_busy
                          ),
                      ]
                  )
                : h.empty,
            Option.match(model.maybeError, {
                onNone: () => h.empty,
                onSome: (error) =>
                    h.p(
                        [
                            h.Attribute("role", "alert"),
                            h.Class(
                                "rounded-lg bg-destructive/10 p-3 text-sm text-foreground"
                            ),
                        ],
                        [error]
                    ),
            }),
            details_key !== undefined
                ? detailsView(
                      details_key,
                      Option.fromUndefinedOr(model.imageOverrides[details_key]),
                      Option.fromUndefinedOr(model.textOverrides[details_key]),
                      to_parent,
                      h,
                      is_artwork_list_details
                          ? hrefs.artwork_list()
                          : hrefs.item(details_key),
                      is_artwork_list_details
                          ? ClickedArtworkList()
                          : ClickedFrame({ frameKey: details_key }),
                      is_artwork_list_details
                  )
                : h.empty,
            model.grid_view && details_key === undefined
                ? h.div(
                      [
                          h.Class("grid grid-cols-2 gap-3 md:grid-cols-4"),
                          h.AriaLabel("All artworks"),
                      ],
                      frames.map((frame) => {
                          const text =
                              model.textOverrides[frame.key] ??
                              getGalleryText(frame.key)
                          return h.button(
                              [
                                  h.Type("button"),
                                  h.Class(
                                      "overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card p-3 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                                  ),
                                  h.Attribute(
                                      "aria-pressed",
                                      selected_key === frame.key
                                          ? "true"
                                          : "false"
                                  ),
                                  h.OnClick(
                                      to_parent(
                                          ClickedArtworkListItem({
                                              frameKey: frame.key,
                                          })
                                      )
                                  ),
                              ],
                              [
                                  model.texture_states[frame.key] === "failed"
                                      ? h.div(
                                            [
                                                h.Class(
                                                    "flex aspect-square items-center justify-center bg-muted p-4 text-sm text-muted-foreground"
                                                ),
                                            ],
                                            ["Image unavailable"]
                                        )
                                      : h.img([
                                            h.Attribute(
                                                "src",
                                                model.imageOverrides[
                                                    frame.key
                                                ] ?? frame.url
                                            ),
                                            h.Attribute("alt", ""),
                                            h.Attribute("loading", "lazy"),
                                            h.Class(
                                                "aspect-square w-full bg-muted object-contain"
                                            ),
                                            h.Style(
                                                artwork_image_transition_style(
                                                    frame.key
                                                )
                                            ),
                                            ...(!model.scene_available
                                                ? [
                                                      h.OnLoad(
                                                          to_parent(
                                                              UpdatedTextureState(
                                                                  {
                                                                      frame_key:
                                                                          frame.key,
                                                                      status: "loaded",
                                                                  }
                                                              )
                                                          )
                                                      ),
                                                      h.OnError(
                                                          to_parent(
                                                              UpdatedTextureState(
                                                                  {
                                                                      frame_key:
                                                                          frame.key,
                                                                      status: "failed",
                                                                  }
                                                              )
                                                          )
                                                      ),
                                                  ]
                                                : []),
                                        ]),
                                  h.strong(
                                      [
                                          h.Class(
                                              "mt-2 block text-sm text-card-foreground"
                                          ),
                                      ],
                                      [text?.title ?? frame.label]
                                  ),
                                  h.span(
                                      [
                                          h.Class(
                                              "block text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [text?.artist ?? ""]
                                  ),
                              ]
                          )
                      })
                  )
                : h.empty,
            selected_key !== undefined && details_key === undefined
                ? artworkPanel(model, selected_key, to_parent, h)
                : h.empty,
        ]
    )
}

const artworkPanel = <ParentMessage>(
    model: Model,
    frame_key: string,
    to_parent: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const text = model.textOverrides[frame_key] ?? getGalleryText(frame_key)
    if (text === undefined)
        return h.p(
            [],
            ["Artwork not found. Choose another artwork from the list."]
        )
    const settings = model.image_settings[frame_key] ?? default_image_settings
    const button = (label: string, message: Message, disabled = false) =>
        h.button(
            [
                h.Type("button"),
                h.Class(button_class),
                h.Disabled(disabled),
                h.OnClick(to_parent(message)),
            ],
            [label]
        )
    return h.keyed("div")(
        frame_key,
        [
            h.Class(
                "space-y-4 rounded-[var(--radius-surface)] border border-border bg-card p-4 text-card-foreground"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-3")],
                [
                    h.div(
                        [h.Attribute("aria-live", "polite")],
                        [
                            h.h2(
                                [h.Class("text-xl font-semibold")],
                                [text.title]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    [text.artist, text.year]
                                        .filter(Boolean)
                                        .join(" · "),
                                ]
                            ),
                        ]
                    ),
                    button("Close", ClickedCloseEditor()),
                ]
            ),
            h.p(
                [h.Class("max-w-3xl text-sm leading-relaxed")],
                [text.description]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    [text.medium, text.dimensions, text.price]
                        .filter(Boolean)
                        .join(" · "),
                ]
            ),
            button(
                model.editing ? "Done editing" : "Edit artwork",
                ClickedEditArtwork()
            ),
            model.editing
                ? h.div(
                      [h.Class("space-y-4 border-t border-border pt-4")],
                      [
                          h.p(
                              [h.Class("text-sm text-muted-foreground")],
                              ["Changes remain in this browser session."]
                          ),
                          model.scene_available
                              ? h.submodel({
                                    slotId: model.fileDrop.id,
                                    model: model.fileDrop,
                                    view: FileDrop.view,
                                    viewInputs: {
                                        multiple: false,
                                        accept: ["image/*"],
                                        toView: (attributes) =>
                                            h.label(
                                                [
                                                    ...attributes.root,
                                                    h.Class(
                                                        model.image_busy
                                                            ? "pointer-events-none block rounded-lg border-2 border-dashed border-border p-5 text-center opacity-50"
                                                            : "block cursor-pointer rounded-lg border-2 border-dashed border-border p-5 text-center hover:border-primary data-[drag-over]:border-primary"
                                                    ),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "block text-sm"
                                                            ),
                                                        ],
                                                        [
                                                            model.image_busy
                                                                ? "Updating artwork…"
                                                                : "Drop an image here or choose a replacement",
                                                        ]
                                                    ),
                                                    h.input([
                                                        ...attributes.input,
                                                        h.Disabled(
                                                            model.image_busy
                                                        ),
                                                    ]),
                                                ]
                                            ),
                                    },
                                    toParentMessage: (message) =>
                                        to_parent(
                                            GotFileDropMessage({ message })
                                        ),
                                })
                              : h.empty,
                          model.scene_available
                              ? h.div(
                                    [
                                        h.Class(
                                            "flex flex-wrap items-center gap-2"
                                        ),
                                    ],
                                    (
                                        ["fit", "fill"] satisfies ReadonlyArray<
                                            "fit" | "fill"
                                        >
                                    ).map((mode) =>
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Class(button_class),
                                                h.Attribute(
                                                    "aria-pressed",
                                                    settings.mode === mode
                                                        ? "true"
                                                        : "false"
                                                ),
                                                h.OnClick(
                                                    to_parent(
                                                        ChangedImageSettings({
                                                            frame_key,
                                                            settings: {
                                                                ...settings,
                                                                mode,
                                                            },
                                                        })
                                                    )
                                                ),
                                            ],
                                            [
                                                mode === "fit"
                                                    ? "Fit whole image"
                                                    : "Fill frame",
                                            ]
                                        )
                                    )
                                )
                              : h.empty,
                          model.scene_available && settings.mode === "fill"
                              ? h.div(
                                    [
                                        h.Class(
                                            "grid max-w-xl gap-4 sm:grid-cols-2"
                                        ),
                                    ],
                                    (
                                        [
                                            "crop_x",
                                            "crop_y",
                                        ] satisfies ReadonlyArray<
                                            "crop_x" | "crop_y"
                                        >
                                    ).map((axis) =>
                                        h.label(
                                            [
                                                h.Class(
                                                    "flex flex-col gap-2 text-sm"
                                                ),
                                            ],
                                            [
                                                axis === "crop_x"
                                                    ? "Horizontal crop position"
                                                    : "Vertical crop position",
                                                h.input([
                                                    h.Type("range"),
                                                    h.Attribute("min", "0"),
                                                    h.Attribute("max", "100"),
                                                    h.Attribute("step", "1"),
                                                    h.Value(
                                                        String(
                                                            settings[axis] * 100
                                                        )
                                                    ),
                                                    h.OnInput((value) =>
                                                        to_parent(
                                                            ChangedImageSettings(
                                                                {
                                                                    frame_key,
                                                                    settings: {
                                                                        ...settings,
                                                                        [axis]:
                                                                            Number(
                                                                                value
                                                                            ) /
                                                                            100,
                                                                    },
                                                                }
                                                            )
                                                        )
                                                    ),
                                                ]),
                                            ]
                                        )
                                    )
                                )
                              : h.empty,
                          h.div(
                              [h.Class("flex flex-wrap gap-2")],
                              [
                                  button(
                                      "Edit text details",
                                      ClickedDetails({ frameKey: frame_key })
                                  ),
                                  model.imageOverrides[frame_key] !== undefined
                                      ? button(
                                            "Restore original image",
                                            ClickedRestoreFrameImage({
                                                frameKey: frame_key,
                                            }),
                                            model.image_busy
                                        )
                                      : h.empty,
                              ]
                          ),
                      ]
                  )
                : h.empty,
        ]
    )
}
