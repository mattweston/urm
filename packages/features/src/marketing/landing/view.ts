import { Array, Match as M, Option } from "effect"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"
import clsx from "clsx"
import {
    Button,
    Disclosure,
    DragAndDrop,
    FileDrop,
    Switch,
    Textarea,
} from "@foldkit/ui"
import type { Image } from "@urm/domain/schemas/media"
import { RichTextEditor } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import type { SiteAppearanceSettings } from "@urm/domain/schemas/site-appearance"
import { ContentTemplateCategory } from "@urm/domain/schemas/content-templates"
import { site_appearance_preview_style } from "@urm/ui/styles/site-preview.ts"
import { copy_text } from "./copy.ts"
import {
    ChangedMotion,
    ClickedCancel,
    ClickedEdit,
    ClickedSave,
    ClickedSaveTemplate,
    ClearedHeroImage,
    ClearedLogoImage,
    GotHeroImageDropMessage,
    GotLogoImageDropMessage,
    AddedBlockItem,
    AddedBlock,
    GotLandingDragAndDropMessage,
    GotLandingRichTextEditorMessage,
    RemovedBlockItem,
    RemovedBlock,
    SelectedHeroImage,
    SelectedLogoImage,
    type Message,
    ToggledFaq,
    ToggledHeroImageLibrary,
    ToggledLogoImageLibrary,
    ToggledMotionPreview,
    UpdatedBlockItem,
    UpdatedCopy,
    UpdatedTemplateCategory,
    UpdatedTemplateDescription,
    UpdatedTemplateName,
    UpdatedTemplateTags,
} from "./message.ts"
import type { LandingItemSection, LandingSection, Model } from "./model.ts"

const landing_sections: ReadonlyArray<LandingSection> = [
    "hero",
    "intro",
    "rich_text",
    "features",
    "modules",
    "showcase",
    "integrations",
    "stack",
    "pricing",
    "faq",
    "cta",
]

const landing_section_labels: Readonly<Record<LandingSection, string>> = {
    hero: "Hero",
    intro: "Introduction",
    rich_text: "Rich text",
    features: "Features",
    modules: "Modules",
    showcase: "Showcase",
    integrations: "Integrations",
    stack: "Technology stack",
    pricing: "Pricing",
    faq: "FAQ",
    cta: "Call to action",
}

type CopyView = (key: string, class_name: string, label: string) => Html

const modules: ReadonlyArray<readonly [string, string]> = [
    ["Documents", "Landing, blog, notes"],
    ["Forms", "Contact, surveys"],
    ["Media", "Galleries, library, video, music"],
    ["Tags", "Organise content and people"],
    ["Mail", "Email and campaigns"],
    ["Events", "Maps and tickets"],
    ["Dashboard", "Stats and analytics"],
    ["Tasks", "Track work"],
    ["Issues", "Tickets and triage"],
    ["Social", "Post to Instagram, etc."],
    ["Presentations", "Slides and decks"],
    ["Custom entities", "Your own content types"],
    ["Generative UI", "Make your own website components"],
    ["Data", "CSV, table and form builders"],
    ["Members", "Profiles and uploads"],
    ["Realtime chat", "Admins, members and sysadmin"],
    ["Domains", "Multiple sites, one account"],
    ["Shop", "Ecommerce"],
    ["Funding", "Donations and campaigns"],
]

const showcases: ReadonlyArray<readonly [string, string]> = [
    ["Rory McLeod", "rorymcleod.com"],
    ["Barney's Broadcasting Company", "barneysbroadcasting.company"],
    ["Sarene Creole Cuisine", "sarenecreolecuisine.co.uk"],
    ["Raprobate", "raprobate.com"],
    ["Gilly", "gilly.网站"],
    ["Martin Melody", "martinmelody.com"],
]

const integration_assets: ReadonlyArray<
    readonly [string, string, string, string, string]
> = [
    [
        "Bento",
        "Email",
        "/branding/logos/bento-brand-wordmark.svg",
        "https://bentonow.com",
        "bg-[#111827]",
    ],
    [
        "Instagram",
        "Social",
        "/branding/logos/instagram/03 Black Glyph/Instagram_Glyph_Black.svg",
        "https://developers.facebook.com/docs/instagram-api",
        "bg-white",
    ],
    [
        "Stripe",
        "Payments",
        "/branding/logos/stripe/Stripe wordmark - Blurple.svg",
        "https://stripe.com",
        "bg-white",
    ],
    [
        "Polar",
        "Payments",
        "/branding/logos/polar/Logomark/logomark_black.svg",
        "https://polar.sh",
        "bg-white",
    ],
]

const stack: ReadonlyArray<readonly [string, string]> = [
    ["Astro", "Framework"],
    ["TanStack", "Router, Query, etc."],
    ["Solid.js", "UI runtime"],
    ["Zero", "Sync engine"],
    ["Effect-TS", "Backend"],
    ["Postgres", "Database"],
    ["PlanetScale", "Database"],
    ["Foldkit UI", "Components"],
    ["Solid UI", "Kobalte / primitives"],
    ["Cloudflare", "Edge / hosting"],
    ["Railway", "Deploy"],
    ["Tailwind", "CSS"],
]

const control_base_class =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow,transform] hover:-translate-y-px focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
const control_primary_class = `${control_base_class} border-primary bg-primary text-primary-foreground [box-shadow:var(--shadow-primary)] hover:bg-primary/90`
const control_outline_class = `${control_base_class} border-border bg-background text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent hover:text-accent-foreground`
const control_ghost_class = `${control_base_class} border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground`
const control_small_class = "min-h-8 px-3 py-1 text-xs"
const badge_primary_class =
    "inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-primary"
const badge_accent_class =
    "inline-flex items-center rounded-full bg-accent px-3 py-1 text-accent-foreground"
const browser_mockup_class =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background"
const browser_toolbar_class =
    "flex min-h-11 items-center gap-3 border-b-(length:--surface-border-width) border-border bg-muted/50 px-4 before:block before:size-2 before:rounded-full before:bg-muted-foreground/40 before:[box-shadow:0_0_0_4px_color-mix(in_oklab,var(--muted-foreground)_22%,transparent),16px_0_0_0_color-mix(in_oklab,var(--muted-foreground)_22%,transparent)]"
const browser_address_class =
    "ml-5 min-w-0 flex-1 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 py-1 font-mono text-xs text-muted-foreground"
const window_mockup_class =
    "relative overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background pt-8 before:absolute before:left-4 before:top-3 before:size-2 before:rounded-full before:bg-muted-foreground/40 before:[box-shadow:14px_0_0_color-mix(in_oklab,var(--muted-foreground)_40%,transparent),28px_0_0_color-mix(in_oklab,var(--muted-foreground)_40%,transparent)]"

const pricing: ReadonlyArray<readonly [string, string, string]> = [
    [
        "Starter",
        "£5",
        "Per site/database. Core features, your data stays yours; export anytime.",
    ],
    [
        "Pro",
        "Usage",
        "Scale as you grow. Sysadmin support and higher capacity.",
    ],
    ["Contribute", "Free", "Submit PRs, report issues, and help shape URM."],
]

const revealAttributes = <Message>(
    animation: "up" | "fade" | "scale",
    index: number,
    h: HtmlBuilder<Message>
): ReadonlyArray<Attribute<Message>> => [
    h.DataAttribute("reveal", animation),
    h.Attribute(
        "style",
        `--reveal-index:${index};--reveal-delay:${Math.min(index, 8) * 3}%;--reveal-delay-time:${Math.min(index, 8) * 70}ms`
    ),
]

const editableCopyView =
    <ParentMessage>(
        model: Model,
        toParentMessage: (message: Message) => ParentMessage,
        h: HtmlBuilder<ParentMessage>
    ): CopyView =>
    (key, class_name, label) => {
        if (model.publication_view === true) {
            const text = copy_text(model.drafts, key)
            return key === "hero_title"
                ? h.h1([h.Class(class_name)], [text])
                : key.endsWith("_title")
                  ? h.h2([h.Class(class_name)], [text])
                  : h.p([h.Class(class_name)], [text])
        }
        const textareaView = (is_editing: boolean): Html =>
            Textarea.view(
                is_editing
                    ? {
                          id: `landing-copy-${key}`,
                          value: copy_text(model.drafts, key),
                          onInput: (text) =>
                              toParentMessage(UpdatedCopy({ key, text })),
                          toView: (attributes) =>
                              h.div(
                                  [],
                                  [
                                      h.label(
                                          [
                                              ...attributes.label,
                                              h.Class("sr-only"),
                                          ],
                                          [label]
                                      ),
                                      h.textarea([
                                          ...attributes.textarea,
                                          h.Class(
                                              clsx(
                                                  "block min-h-0 w-full resize-none overflow-hidden whitespace-pre-wrap border-x-0 border-y border-dashed border-foreground/8 bg-transparent px-0 py-1 [field-sizing:content] hover:border-foreground/12 focus:border-foreground/18 focus:outline-none",
                                                  class_name,
                                                  "cursor-text"
                                              )
                                          ),
                                      ]),
                                  ]
                              ),
                      }
                    : {
                          id: `landing-copy-${key}`,
                          value: copy_text(model.drafts, key),
                          isReadOnly: true,
                          toView: (attributes) =>
                              h.div(
                                  [],
                                  [
                                      h.label(
                                          [
                                              ...attributes.label,
                                              h.Class("sr-only"),
                                          ],
                                          [label]
                                      ),
                                      h.textarea([
                                          ...attributes.textarea,
                                          h.Class(
                                              clsx(
                                                  "pointer-events-none block min-h-0 w-full resize-none overflow-hidden whitespace-pre-wrap border-0 bg-transparent p-0 [field-sizing:content] focus:outline-none",
                                                  class_name
                                              )
                                          ),
                                      ]),
                                  ]
                              ),
                      },
                h
            )

        return M.value(model.editor_state).pipe(
            M.tagsExhaustive({
                Viewing: () => textareaView(false),
                Editing: () => textareaView(true),
            })
        )
    }

const editableItemCopyView = <ParentMessage>(
    model: Model,
    section: LandingItemSection,
    index: number,
    field: "first" | "second",
    value: string,
    class_name: string,
    label: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (model.publication_view === true)
        return h.span([h.Class(class_name)], [value])
    const id = `landing-${section}-${index}-${field}`
    const is_editing = model.editor_state._tag === "Editing"
    return Textarea.view(
        {
            id,
            value,
            ...(is_editing
                ? {
                      onInput: (text) =>
                          toParentMessage(
                              UpdatedBlockItem({
                                  section,
                                  index,
                                  field,
                                  text,
                              })
                          ),
                  }
                : { isReadOnly: true }),
            toView: (attributes) =>
                h.div(
                    [],
                    [
                        h.label(
                            [...attributes.label, h.Class("sr-only")],
                            [label]
                        ),
                        h.textarea([
                            ...attributes.textarea,
                            h.Class(
                                clsx(
                                    "block min-h-0 w-full resize-none overflow-hidden whitespace-pre-wrap bg-transparent p-0 [field-sizing:content] focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]",
                                    is_editing
                                        ? "cursor-text border-x-0 border-y border-dashed border-foreground/15"
                                        : "pointer-events-none border-0",
                                    class_name
                                )
                            ),
                        ]),
                    ]
                ),
        },
        h
    )
}

const actionsView = <ParentMessage>(
    model: Model,
    section: "hero" | "cta",
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const items = model.block_items[section] ?? []
    const is_editing = model.editor_state._tag === "Editing"
    return h.div(
        [
            h.Class(
                section === "cta"
                    ? "mt-10 flex flex-wrap justify-center gap-4"
                    : "flex flex-wrap gap-3"
            ),
        ],
        [
            ...items.map((item, index) => {
                const class_name =
                    item.third === "primary"
                        ? control_primary_class
                        : item.third === "link"
                          ? control_ghost_class
                          : control_outline_class
                if (!is_editing) {
                    return h.keyed("a")(
                        item.id,
                        [h.Href(item.second), h.Class(class_name)],
                        [item.first]
                    )
                }
                return h.keyed("div")(
                    item.id,
                    [h.Class("min-w-40")],
                    [
                        h.div(
                            [h.Class(`${class_name} w-full cursor-text`)],
                            [
                                editableItemCopyView(
                                    model,
                                    section,
                                    index,
                                    "first",
                                    item.first,
                                    "text-center font-mono font-medium",
                                    `${section} action ${index + 1} label`,
                                    toParentMessage,
                                    h
                                ),
                            ]
                        ),
                        h.div(
                            [h.Class("mt-1")],
                            [
                                editableItemCopyView(
                                    model,
                                    section,
                                    index,
                                    "second",
                                    item.second,
                                    "text-center font-mono text-xs text-foreground/60",
                                    `${section} action ${index + 1} URL`,
                                    toParentMessage,
                                    h
                                ),
                            ]
                        ),
                        h.button(
                            [
                                h.OnClick(
                                    toParentMessage(
                                        RemovedBlockItem({ section, index })
                                    )
                                ),
                                h.AriaLabel(
                                    `Remove ${section} action ${index + 1}`
                                ),
                                h.Class(
                                    "mt-1 min-h-8 w-full rounded-full px-2 text-xs text-error hover:bg-accent"
                                ),
                            ],
                            ["Remove action"]
                        ),
                    ]
                )
            }),
            ...(is_editing && items.length < 3
                ? [
                      h.button(
                          [
                              h.OnClick(
                                  toParentMessage(AddedBlockItem({ section }))
                              ),
                              h.AriaLabel(
                                  section === "hero"
                                      ? "Add hero action"
                                      : "Add call-to-action button"
                              ),
                              h.Class(
                                  `${control_outline_class} min-h-12 border-dashed`
                              ),
                          ],
                          ["Add action"]
                      ),
                  ]
                : []),
        ]
    )
}

const moduleView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")],
        Array.map(modules, ([title, description], index) =>
            h.article(
                [
                    ...revealAttributes("scale", index, h),
                    h.Class(
                        "group rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-5 [box-shadow:var(--shadow-surface)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:[box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "font-mono font-semibold text-foreground transition-colors group-hover:text-primary"
                            ),
                        ],
                        [title]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-foreground/60")],
                        [description]
                    ),
                ]
            )
        )
    )

const serviceCardsView = <ParentMessage>(
    items: ReadonlyArray<readonly [string, string]>,
    marker: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-4 sm:grid-cols-2 lg:grid-cols-4")],
        Array.map(items, ([name, type], index) =>
            h.article(
                [
                    ...revealAttributes("scale", index, h),
                    h.Class(
                        "group flex items-center gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 [box-shadow:var(--shadow-surface)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:[box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.span(
                        [
                            h.AriaHidden(true),
                            h.Class(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-surface)] bg-muted font-mono text-xs font-medium tracking-widest text-foreground/40 transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                            ),
                        ],
                        [marker]
                    ),
                    h.div(
                        [],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "mb-0.5 block text-base font-bold text-foreground transition-colors group-hover:text-primary"
                                    ),
                                ],
                                [name]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "block font-mono text-xs tracking-tight text-foreground/50"
                                    ),
                                ],
                                [type]
                            ),
                        ]
                    ),
                ]
            )
        )
    )

const integrationCardsView = <ParentMessage>(
    model: Model,
    media_images: ReadonlyArray<Image>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const items = model.block_items.integrations ?? []
    const bundled_source = (asset_id: string): string | undefined => {
        switch (asset_id) {
            case "urm.integration.bento":
                return integration_assets[0]?.[2]
            case "urm.integration.instagram":
                return integration_assets[1]?.[2]
            case "urm.integration.stripe":
                return integration_assets[2]?.[2]
            case "urm.integration.polar":
                return integration_assets[3]?.[2]
            default:
                return undefined
        }
    }
    const image_for = (image_id: string): Image | undefined =>
        Option.getOrUndefined(
            Array.findFirst(media_images, (image) => image.id === image_id)
        )

    return h.div(
        [h.Class("grid gap-4 sm:grid-cols-2 lg:grid-cols-4")],
        [
            ...items.map((item, index) => {
                const domain_image = image_for(item.second)
                const image_source =
                    domain_image?.url ?? bundled_source(item.second)
                const image_alt = domain_image?.alt ?? item.third
                const controls_open = Option.contains(
                    model.logo_image_library_index,
                    index
                )
                const upload_busy = Option.contains(
                    model.logo_image_upload_index,
                    index
                )
                const image =
                    image_source === undefined
                        ? h.span(
                              [h.Class("font-mono text-xs text-foreground/50")],
                              ["Add logo"]
                          )
                        : h.img([
                              h.Src(image_source),
                              h.Alt(image_alt),
                              h.Class("max-h-full max-w-full object-contain"),
                          ])

                return h.keyed("article")(
                    item.id,
                    [
                        ...revealAttributes("scale", index, h),
                        h.Class(
                            "group rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 [box-shadow:var(--shadow-surface)]"
                        ),
                    ],
                    [
                        ...(model.editor_state._tag === "Editing" &&
                        controls_open
                            ? [
                                  h.submodel({
                                      slotId: model.logo_image_drop.id,
                                      model: model.logo_image_drop,
                                      view: FileDrop.view,
                                      viewInputs: {
                                          accept: [
                                              "image/png",
                                              "image/jpeg",
                                              "image/webp",
                                              "image/gif",
                                          ],
                                          isDisabled: upload_busy,
                                          toView: (attributes) =>
                                              h.div(
                                                  [
                                                      ...attributes.root,
                                                      h.Class(
                                                          "flex min-h-28 items-center justify-center rounded-[var(--radius-control)] border-2 border-dashed border-primary/50 bg-muted/40 p-3"
                                                      ),
                                                  ],
                                                  [
                                                      image,
                                                      h.input(attributes.input),
                                                  ]
                                              ),
                                      },
                                      toParentMessage: (message) =>
                                          toParentMessage(
                                              GotLogoImageDropMessage({
                                                  itemId: item.id,
                                                  message,
                                              })
                                          ),
                                  }),
                                  h.div(
                                      [h.Class("mt-2 flex flex-wrap gap-2")],
                                      [
                                          h.label(
                                              [
                                                  h.For(
                                                      model.logo_image_drop.id
                                                  ),
                                                  h.Class(
                                                      control_outline_class
                                                  ),
                                              ],
                                              [
                                                  upload_busy
                                                      ? "Uploading…"
                                                      : "Upload",
                                              ]
                                          ),
                                          ...(item.second.length === 0
                                              ? []
                                              : [
                                                    h.button(
                                                        [
                                                            h.Type("button"),
                                                            h.OnClick(
                                                                toParentMessage(
                                                                    ClearedLogoImage(
                                                                        {
                                                                            index,
                                                                        }
                                                                    )
                                                                )
                                                            ),
                                                            h.Class(
                                                                control_ghost_class
                                                            ),
                                                        ],
                                                        ["Remove image"]
                                                    ),
                                                ]),
                                      ]
                                  ),
                                  h.div(
                                      [
                                          h.Class(
                                              "mt-3 grid max-h-40 grid-cols-3 gap-2 overflow-y-auto"
                                          ),
                                      ],
                                      media_images.map((media_image) =>
                                          h.keyed("button")(
                                              media_image.id,
                                              [
                                                  h.Type("button"),
                                                  h.AriaLabel(
                                                      `Use ${media_image.alt || "this image"} as ${item.first}`
                                                  ),
                                                  h.OnClick(
                                                      toParentMessage(
                                                          SelectedLogoImage({
                                                              index,
                                                              image_id:
                                                                  media_image.id,
                                                              alt: media_image.alt,
                                                          })
                                                      )
                                                  ),
                                                  h.Class(
                                                      "aspect-square overflow-hidden rounded-[var(--radius-control)] border border-border bg-muted"
                                                  ),
                                              ],
                                              [
                                                  h.img([
                                                      h.Src(media_image.url),
                                                      h.Alt(media_image.alt),
                                                      h.Class(
                                                          "size-full object-contain p-1"
                                                      ),
                                                  ]),
                                              ]
                                          )
                                      )
                                  ),
                              ]
                            : [
                                  h.div(
                                      [
                                          h.Class(
                                              "flex h-28 items-center justify-center rounded-[var(--radius-control)] bg-muted/40 p-3"
                                          ),
                                      ],
                                      [image]
                                  ),
                              ]),
                        h.div(
                            [h.Class("mt-3")],
                            [
                                editableItemCopyView(
                                    model,
                                    "integrations",
                                    index,
                                    "first",
                                    item.first,
                                    "text-lg font-bold",
                                    `Logo ${index + 1} name`,
                                    toParentMessage,
                                    h
                                ),
                            ]
                        ),
                        ...(model.editor_state._tag === "Editing"
                            ? [
                                  h.div(
                                      [h.Class("mt-2 flex gap-2")],
                                      [
                                          h.button(
                                              [
                                                  h.Type("button"),
                                                  h.OnClick(
                                                      toParentMessage(
                                                          ToggledLogoImageLibrary(
                                                              {
                                                                  index,
                                                              }
                                                          )
                                                      )
                                                  ),
                                                  h.Class(
                                                      control_outline_class
                                                  ),
                                              ],
                                              [
                                                  controls_open
                                                      ? "Close media"
                                                      : "Edit image",
                                              ]
                                          ),
                                          h.button(
                                              [
                                                  h.Type("button"),
                                                  h.OnClick(
                                                      toParentMessage(
                                                          RemovedBlockItem({
                                                              section:
                                                                  "integrations",
                                                              index,
                                                          })
                                                      )
                                                  ),
                                                  h.Class(control_ghost_class),
                                              ],
                                              ["Remove"]
                                          ),
                                      ]
                                  ),
                              ]
                            : []),
                    ]
                )
            }),
            ...(model.editor_state._tag === "Editing"
                ? [
                      h.button(
                          [
                              h.Type("button"),
                              h.OnClick(
                                  toParentMessage(
                                      AddedBlockItem({
                                          section: "integrations",
                                      })
                                  )
                              ),
                              h.Class(
                                  `${control_outline_class} min-h-32 border-dashed`
                              ),
                          ],
                          ["Add logo"]
                      ),
                  ]
                : []),
        ]
    )
}

const showcaseView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3")],
        Array.map(showcases, ([name, url], index) =>
            h.a(
                [
                    ...revealAttributes("scale", index, h),
                    h.Href(`https://${url}`),
                    h.Target("_blank"),
                    h.Rel("noopener noreferrer"),
                    h.Class(
                        "group flex h-full flex-col items-center gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-8 text-center [box-shadow:var(--shadow-surface)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:[box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    h.span(
                        [
                            h.AriaHidden(true),
                            h.Class(
                                "flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-border font-mono text-xs font-medium tracking-widest text-foreground/40 transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                            ),
                        ],
                        ["LOGO"]
                    ),
                    h.div(
                        [],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "mb-1 block text-lg font-bold text-foreground"
                                    ),
                                ],
                                [name]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "block break-all font-mono text-sm tracking-tight text-primary opacity-80 transition-opacity group-hover:opacity-100"
                                    ),
                                ],
                                [url]
                            ),
                        ]
                    ),
                ]
            )
        )
    )

const sectionView = <ParentMessage>(
    id: string,
    style: string,
    title: Html,
    body: Html,
    content: Html,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [
            h.Id(id),
            h.Attribute("style", style),
            h.Class(
                clsx("py-16 md:py-24", {
                    "border-y border-border/50 bg-muted/50": [
                        "features",
                        "showcase",
                        "stack",
                        "faq",
                    ].includes(id),
                    relative: ![
                        "features",
                        "showcase",
                        "stack",
                        "faq",
                    ].includes(id),
                })
            ),
        ],
        [
            h.div(
                [h.Class("container mx-auto px-4")],
                [
                    h.div(
                        [
                            ...revealAttributes("up", 0, h),
                            h.DataAttribute("distance-preset", "small"),
                            h.Class(
                                clsx("max-w-2xl", {
                                    "mx-auto mb-16 text-center": [
                                        "showcase",
                                        "pricing",
                                    ].includes(id),
                                    "mx-auto mb-12 text-center": id === "faq",
                                    "mb-12": ![
                                        "showcase",
                                        "pricing",
                                        "faq",
                                    ].includes(id),
                                })
                            ),
                        ],
                        [title, body]
                    ),
                    content,
                ]
            ),
        ]
    )

const richTextView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    model.editor_state._tag === "Editing"
        ? RichTextEditor<ParentMessage>(
              {
                  id: "landing-rich-text-editor",
                  model: model.rich_text_editor,
                  toParentMessage: (message) =>
                      toParentMessage(
                          GotLandingRichTextEditorMessage({ message })
                      ),
                  label: "Rich text",
                  description:
                      "Write directly in the page. Use slash commands to add headings, quotes, and images.",
                  placeholder: "Start writing…",
              },
              h
          )
        : h.div(
              [h.Class("prose mx-auto max-w-3xl")],
              model.rich_text_editor.document.children.map((block) => {
                  if (block.type === "image") {
                      return h.img([
                          h.Src(block.src),
                          h.Alt(block.alt),
                          h.Class(
                              "h-auto w-full rounded-[var(--radius-surface)]"
                          ),
                      ])
                  }
                  const children = block.children.map((child) =>
                      model.publication_view === true
                          ? (child.marks ?? []).reduce<Html>(
                                (text, mark) =>
                                    mark.type === "bold"
                                        ? h.strong([], [text])
                                        : mark.type === "italic"
                                          ? h.em([], [text])
                                          : h.a([h.Href(mark.href)], [text]),
                                h.span([], [child.text])
                            )
                          : child.text
                  )
                  if (block.type === "heading") {
                      if (block.level === 1)
                          return h.h1(
                              [h.Class("text-4xl font-bold tracking-tight")],
                              children
                          )
                      if (block.level === 2)
                          return h.h2(
                              [h.Class("text-3xl font-bold tracking-tight")],
                              children
                          )
                      return h.h3(
                          [h.Class("text-2xl font-semibold tracking-tight")],
                          children
                      )
                  }
                  if (block.type === "blockquote") {
                      return h.blockquote(
                          [
                              h.Class(
                                  "border-l-4 border-primary pl-5 text-xl italic text-foreground/75"
                              ),
                          ],
                          children
                      )
                  }
                  return h.p(
                      [h.Class("text-lg leading-relaxed text-foreground/80")],
                      children
                  )
              })
          )

const featureShowcaseView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-20 md:space-y-32")],
        [
            ...Array.map(model.block_items.features ?? [], (item, index) =>
                h.keyed("article")(
                    item.id,
                    [
                        ...revealAttributes("up", index, h),
                        h.Class(
                            "group grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
                        ),
                    ],
                    [
                        h.div(
                            [
                                h.Class(
                                    clsx(
                                        "rounded-[var(--radius-surface-sm)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:[box-shadow:var(--shadow-overlay)]",
                                        {
                                            "order-2 lg:order-1": index !== 1,
                                            "lg:order-2": index === 1,
                                        }
                                    )
                                ),
                            ],
                            [
                                h.div(
                                    [
                                        h.Class(
                                            index === 2
                                                ? `${browser_mockup_class} [box-shadow:var(--shadow-surface)]`
                                                : `${window_mockup_class} [box-shadow:var(--shadow-surface)]`
                                        ),
                                    ],
                                    [
                                        index === 2
                                            ? h.div(
                                                  [
                                                      h.Class(
                                                          browser_toolbar_class
                                                      ),
                                                  ],
                                                  [
                                                      h.div(
                                                          [
                                                              h.Class(
                                                                  browser_address_class
                                                              ),
                                                          ],
                                                          ["github.com/urm"]
                                                      ),
                                                  ]
                                              )
                                            : h.empty,
                                        h.div(
                                            [
                                                h.Class(
                                                    "relative flex aspect-video items-center justify-center overflow-hidden bg-muted/30 px-4 py-16"
                                                ),
                                            ],
                                            [
                                                h.div(
                                                    [
                                                        h.AriaHidden(true),
                                                        h.Class(
                                                            clsx(
                                                                "absolute inset-0",
                                                                index === 0
                                                                    ? "bg-gradient-to-br from-primary/5 to-secondary/5"
                                                                    : index ===
                                                                        1
                                                                      ? "bg-gradient-to-bl from-secondary/5 to-accent/5"
                                                                      : "bg-gradient-to-tr from-error/5 to-primary/5"
                                                            )
                                                        ),
                                                    ],
                                                    []
                                                ),
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "z-10 font-mono text-foreground/40"
                                                        ),
                                                    ],
                                                    [
                                                        index === 0
                                                            ? "Content & Contacts View"
                                                            : index === 1
                                                              ? "Data Export Tool"
                                                              : "Public Repository",
                                                    ]
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                            ]
                        ),
                        h.div(
                            [
                                h.Class(
                                    index === 1
                                        ? "lg:order-1"
                                        : "order-1 lg:order-2"
                                ),
                            ],
                            [
                                h.span(
                                    [
                                        h.Class(
                                            `${badge_primary_class} mb-3 font-mono tracking-wide`
                                        ),
                                    ],
                                    [
                                        index === 0
                                            ? "Dashboard"
                                            : index === 1
                                              ? "Data"
                                              : "Code",
                                    ]
                                ),
                                h.h3(
                                    [
                                        h.Class(
                                            "mb-3 text-2xl font-bold text-foreground"
                                        ),
                                    ],
                                    [
                                        editableItemCopyView(
                                            model,
                                            "features",
                                            index,
                                            "first",
                                            item.first,
                                            "font-inherit",
                                            `Feature ${index + 1} heading`,
                                            toParentMessage,
                                            h
                                        ),
                                    ]
                                ),
                                h.p(
                                    [
                                        h.Class(
                                            "mb-6 text-base leading-relaxed text-foreground/80"
                                        ),
                                    ],
                                    [
                                        editableItemCopyView(
                                            model,
                                            "features",
                                            index,
                                            "second",
                                            item.second,
                                            "font-inherit",
                                            `Feature ${index + 1} body`,
                                            toParentMessage,
                                            h
                                        ),
                                    ]
                                ),
                                h.ul(
                                    [
                                        h.Class(
                                            "list-none space-y-2 text-base text-foreground/80"
                                        ),
                                    ],
                                    [
                                        h.li(
                                            [
                                                h.Class(
                                                    "flex items-center gap-2"
                                                ),
                                            ],
                                            ["✓ Data ownership and privacy"]
                                        ),
                                        h.li(
                                            [
                                                h.Class(
                                                    "flex items-center gap-2"
                                                ),
                                            ],
                                            ["✓ Open, inspectable workflows"]
                                        ),
                                    ]
                                ),
                                h.a(
                                    [
                                        h.Href(
                                            index === 1
                                                ? "https://urm.urm.dev/contact"
                                                : index === 2
                                                  ? "https://github.com"
                                                  : "https://docs.urm.dev"
                                        ),
                                        h.Class(
                                            index === 1
                                                ? `${control_primary_class} mt-6 w-full font-mono [box-shadow:var(--shadow-overlay)]`
                                                : index === 2
                                                  ? `${control_ghost_class} mt-6 w-full font-mono`
                                                  : `${control_outline_class} mt-6 w-full font-mono`
                                        ),
                                    ],
                                    [
                                        index === 1
                                            ? "Get in touch"
                                            : index === 2
                                              ? "GitHub"
                                              : "Get started",
                                    ]
                                ),
                                ...(model.editor_state._tag === "Editing"
                                    ? [
                                          h.button(
                                              [
                                                  h.OnClick(
                                                      toParentMessage(
                                                          RemovedBlockItem({
                                                              section:
                                                                  "features",
                                                              index,
                                                          })
                                                      )
                                                  ),
                                                  h.AriaLabel(
                                                      `Remove feature ${index + 1}`
                                                  ),
                                                  h.Class(
                                                      `${control_ghost_class} mt-3 w-full text-error`
                                                  ),
                                              ],
                                              ["Remove feature"]
                                          ),
                                      ]
                                    : []),
                            ]
                        ),
                    ]
                )
            ),
            ...(model.editor_state._tag === "Editing"
                ? [
                      h.button(
                          [
                              h.OnClick(
                                  toParentMessage(
                                      AddedBlockItem({ section: "features" })
                                  )
                              ),
                              h.Class(
                                  `${control_outline_class} min-h-12 w-full border-dashed`
                              ),
                          ],
                          ["Add feature"]
                      ),
                  ]
                : []),
        ]
    )

const pricingView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("mx-auto grid max-w-5xl gap-6 md:grid-cols-3")],
        Array.map(pricing, ([title, price, description], index) =>
            h.article(
                [
                    ...revealAttributes("scale", index, h),
                    h.Class(
                        clsx(
                            "relative overflow-hidden rounded-[var(--radius-surface)] bg-background transition-shadow",
                            index === 1
                                ? "z-10 scale-105 border-2 border-primary [box-shadow:var(--shadow-overlay)]"
                                : "border-(length:--surface-border-width) border-border [box-shadow:var(--shadow-surface)] hover:[box-shadow:var(--shadow-surface)]"
                        )
                    ),
                ],
                [
                    index === 1
                        ? h.div(
                              [
                                  h.Class(
                                      "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
                                  ),
                              ],
                              [
                                  h.span(
                                      [
                                          h.Class(
                                              `${badge_primary_class} font-mono text-xs uppercase tracking-widest`
                                          ),
                                      ],
                                      ["Recommended"]
                                  ),
                              ]
                          )
                        : h.empty,
                    h.div(
                        [h.Class("flex h-full flex-col p-6")],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "font-mono text-sm font-semibold uppercase tracking-widest"
                                    ),
                                ],
                                [title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "my-2 font-mono text-4xl font-bold text-primary"
                                    ),
                                ],
                                [price]
                            ),
                            h.p(
                                [h.Class("mb-4 text-base text-foreground/80")],
                                [description]
                            ),
                            h.ul(
                                [
                                    h.Class(
                                        "mb-6 flex-1 space-y-3 text-sm text-foreground/80"
                                    ),
                                ],
                                [
                                    h.li([], ["✓ Export your data"]),
                                    h.li([], ["✓ No vendor lock-in"]),
                                    h.li([], ["✓ Open source codebase"]),
                                ]
                            ),
                        ]
                    ),
                ]
            )
        )
    )

const faqView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const items = model.block_items.faq ?? []
    if (model.publication_view === true)
        return h.div(
            [h.Class("mx-auto max-w-2xl space-y-4")],
            items.map((item) =>
                h.details(
                    [
                        h.Class(
                            "rounded-[var(--radius-surface)] border border-border bg-background"
                        ),
                    ],
                    [
                        h.summary(
                            [
                                h.Class(
                                    "cursor-pointer p-5 text-lg font-medium text-foreground"
                                ),
                            ],
                            [item.first]
                        ),
                        h.p(
                            [
                                h.Class(
                                    "px-5 pb-5 text-base leading-relaxed text-foreground/70"
                                ),
                            ],
                            [item.second]
                        ),
                    ]
                )
            )
        )
    if (model.editor_state._tag === "Editing") {
        return h.div(
            [h.Class("mx-auto max-w-2xl space-y-4")],
            [
                ...items.map((item, index) =>
                    h.keyed("article")(
                        item.id,
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-5 [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [
                            editableItemCopyView(
                                model,
                                "faq",
                                index,
                                "first",
                                item.first,
                                "text-lg font-medium text-foreground",
                                `FAQ ${index + 1} question`,
                                toParentMessage,
                                h
                            ),
                            h.div(
                                [h.Class("mt-3")],
                                [
                                    editableItemCopyView(
                                        model,
                                        "faq",
                                        index,
                                        "second",
                                        item.second,
                                        "text-base leading-relaxed text-foreground/70",
                                        `FAQ ${index + 1} answer`,
                                        toParentMessage,
                                        h
                                    ),
                                ]
                            ),
                            h.button(
                                [
                                    h.OnClick(
                                        toParentMessage(
                                            RemovedBlockItem({
                                                section: "faq",
                                                index,
                                            })
                                        )
                                    ),
                                    h.AriaLabel(`Remove FAQ ${index + 1}`),
                                    h.Class(
                                        `${control_ghost_class} mt-3 text-error`
                                    ),
                                ],
                                ["Remove question"]
                            ),
                        ]
                    )
                ),
                h.button(
                    [
                        h.OnClick(
                            toParentMessage(AddedBlockItem({ section: "faq" }))
                        ),
                        h.Class(
                            `${control_outline_class} min-h-12 w-full border-dashed`
                        ),
                    ],
                    ["Add question"]
                ),
            ]
        )
    }
    return h.div(
        [h.Class("mx-auto max-w-2xl space-y-4")],
        Array.map(items, (item, index) =>
            Disclosure.view(
                {
                    id: `landing-faq-${index}`,
                    isOpen: model.open_faqs[item.first] ?? false,
                    onToggle: (is_open) =>
                        toParentMessage(
                            ToggledFaq({ key: item.first, is_open })
                        ),
                    toView: (attributes) =>
                        h.div(
                            [
                                ...revealAttributes("up", index, h),
                                h.DataAttribute("distance-preset", "small"),
                                h.Class(
                                    "group rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background [box-shadow:var(--shadow-surface)]"
                                ),
                            ],
                            [
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(
                                            "flex w-full cursor-pointer items-center justify-between gap-1.5 p-5 text-left text-lg font-medium text-foreground"
                                        ),
                                    ],
                                    [
                                        item.first,
                                        h.span(
                                            [
                                                h.AriaHidden(true),
                                                h.Class(
                                                    "shrink-0 transition duration-300 group-data-[open]:-rotate-180"
                                                ),
                                            ],
                                            ["⌄"]
                                        ),
                                    ]
                                ),
                                h.div(attributes.panel, [
                                    attributes.animatePanel(
                                        h.div(
                                            [
                                                h.Class(
                                                    "px-5 pb-5 text-base leading-relaxed text-foreground/70"
                                                ),
                                            ],
                                            [item.second]
                                        )
                                    ),
                                ]),
                            ]
                        ),
                },
                h
            )
        )
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    media_images: ReadonlyArray<Image> = [],
    site_appearance: SiteAppearanceSettings = {
        theme_id: "default",
        appearance: "system",
    },
    preview_only = false
): Html => {
    const is_editing = model.editor_state._tag === "Editing"
    const active_motion =
        is_editing && !model.preview_motion ? "none" : model.motion
    const selected_hero_image = Option.flatMap(model.hero_image, (image) =>
        image._tag === "DomainImage"
            ? Array.findFirst(
                  media_images,
                  (candidate) => candidate.id === image.image_id
              )
            : Option.none()
    )
    const selected_hero_image_id = Option.match(model.hero_image, {
        onNone: () => "",
        onSome: (image) => (image._tag === "DomainImage" ? image.image_id : ""),
    })
    const copy = editableCopyView(model, toParentMessage, h)
    const change_motion = (motion: string): ParentMessage => {
        switch (motion) {
            case "fade":
                return toParentMessage(ChangedMotion({ motion: "fade" }))
            case "rise":
                return toParentMessage(ChangedMotion({ motion: "rise" }))
            case "stagger":
                return toParentMessage(ChangedMotion({ motion: "stagger" }))
            default:
                return toParentMessage(ChangedMotion({ motion: "none" }))
        }
    }
    const section = (key: string, content: Html) =>
        sectionView(
            key,
            block_style(key === "philosophy" ? "intro" : key),
            copy(
                `${key}_title`,
                "mb-3 text-3xl font-bold text-foreground",
                `${key} title`
            ),
            copy(
                `${key}_body`,
                "text-lg leading-relaxed text-foreground/70",
                `${key} description`
            ),
            content,
            h
        )

    function block_style(section: string): string {
        const index = model.blocks.findIndex(
            (candidate) => candidate === section
        )
        return index === -1 ? "display:none" : `order:${index + 1}`
    }

    const to_drag_and_drop_message = (
        message: DragAndDrop.Message
    ): ParentMessage =>
        toParentMessage(GotLandingDragAndDropMessage({ message }))

    const block_editor = h.div(
        [h.Class("container mx-auto mt-3 border-t border-border pt-3")],
        [
            h.div(
                [h.Class("flex flex-wrap items-start gap-4")],
                [
                    h.div(
                        [h.Class("min-w-64 flex-1")],
                        [
                            h.p(
                                [h.Class("mb-2 text-xs font-semibold")],
                                ["Page blocks"]
                            ),
                            h.ol(
                                [
                                    h.Class(
                                        "grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
                                    ),
                                    ...DragAndDrop.droppable(
                                        "urm-landing-blocks",
                                        "Landing page blocks"
                                    ),
                                ],
                                model.blocks.map((block, index) =>
                                    h.keyed("li")(
                                        block,
                                        [
                                            h.Class(
                                                "flex min-h-10 cursor-grab items-center gap-2 rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-xs active:cursor-grabbing"
                                            ),
                                            ...DragAndDrop.draggable<ParentMessage>(
                                                {
                                                    model: model.drag_and_drop,
                                                    toParentMessage:
                                                        to_drag_and_drop_message,
                                                    itemId: block,
                                                    containerId:
                                                        "urm-landing-blocks",
                                                    index,
                                                },
                                                h
                                            ),
                                            ...DragAndDrop.sortable(block),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.AriaHidden(true),
                                                    h.Class(
                                                        "text-foreground/50"
                                                    ),
                                                ],
                                                ["⋮⋮"]
                                            ),
                                            h.span(
                                                [h.Class("min-w-0 flex-1")],
                                                [landing_section_labels[block]]
                                            ),
                                            h.button(
                                                [
                                                    h.OnClick(
                                                        toParentMessage(
                                                            RemovedBlock({
                                                                section: block,
                                                            })
                                                        )
                                                    ),
                                                    h.AriaLabel(
                                                        `Remove ${landing_section_labels[block]} block`
                                                    ),
                                                    h.Class(
                                                        "grid size-7 place-items-center rounded-full hover:bg-accent"
                                                    ),
                                                ],
                                                ["×"]
                                            ),
                                        ]
                                    )
                                )
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("min-w-48")],
                        [
                            h.p(
                                [h.Class("mb-2 text-xs font-semibold")],
                                ["Add block"]
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                landing_sections.flatMap((section) =>
                                    model.blocks.includes(section)
                                        ? []
                                        : [
                                              h.button(
                                                  [
                                                      h.OnClick(
                                                          toParentMessage(
                                                              AddedBlock({
                                                                  section,
                                                              })
                                                          )
                                                      ),
                                                      h.Class(
                                                          `${control_outline_class} ${control_small_class}`
                                                      ),
                                                  ],
                                                  [
                                                      `Add ${landing_section_labels[section]}`,
                                                  ]
                                              ),
                                          ]
                                )
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

    const edit_switch = Switch.view(
        {
            id: "landing-edit-mode",
            isChecked: is_editing,
            onToggle: (is_checked) =>
                toParentMessage(is_checked ? ClickedEdit() : ClickedCancel()),
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            `${control_outline_class} ${control_small_class} group gap-2 rounded-full font-mono`
                        ),
                    ],
                    [
                        h.span(
                            [h.Id(Switch.labelId("landing-edit-mode"))],
                            ["Edit page"]
                        ),
                        h.span(
                            [
                                h.AriaHidden(true),
                                h.DataAttribute("switch-track", ""),
                                h.Class(
                                    "relative h-6 w-11 shrink-0 rounded-full border border-border bg-muted transition-colors duration-150 group-data-[checked]:border-primary group-data-[checked]:bg-primary"
                                ),
                            ],
                            [
                                h.span(
                                    [
                                        h.DataAttribute("switch-thumb", ""),
                                        h.Class(
                                            "absolute left-0.5 top-0.5 size-5 rounded-full bg-background [box-shadow:var(--shadow-control)] transition-transform duration-150 ease-out group-data-[checked]:translate-x-5"
                                        ),
                                    ],
                                    []
                                ),
                            ]
                        ),
                        h.span(
                            [
                                h.Id(Switch.descriptionId("landing-edit-mode")),
                                h.Class("sr-only"),
                            ],
                            ["Toggle inline editing"]
                        ),
                    ]
                ),
        },
        h
    )

    return h.main(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            ...(preview_only
                ? []
                : [
                      h.aside(
                          [
                              h.Attribute("style", "order:0"),
                              h.Class(
                                  "sticky top-0 z-40 border-b border-border bg-background/95 px-5 py-3 backdrop-blur"
                              ),
                          ],
                          [
                              h.div(
                                  [
                                      h.Class(
                                          "container mx-auto flex flex-wrap items-center justify-between gap-3"
                                      ),
                                  ],
                                  [
                                      h.div(
                                          [],
                                          [
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "text-xs font-semibold uppercase tracking-[0.18em] text-primary"
                                                      ),
                                                  ],
                                                  [
                                                      model.preset === "blank"
                                                          ? "Landing page · Block editor"
                                                          : "Landing template · URM marketing",
                                                  ]
                                              ),
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "mt-1 text-xs text-foreground/60"
                                                      ),
                                                  ],
                                                  [
                                                      Option.isSome(
                                                          model.page_id
                                                      )
                                                          ? "Save draft updates this landing page and its site preview."
                                                          : "Template preview — changes are not saved to a domain.",
                                                  ]
                                              ),
                                          ]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "flex flex-wrap items-center gap-2"
                                              ),
                                          ],
                                          [
                                              ...(is_editing
                                                  ? [
                                                        h.div(
                                                            [
                                                                h.Class(
                                                                    "grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(14rem,2fr)_minmax(9rem,1fr)_minmax(12rem,1fr)_auto]"
                                                                ),
                                                            ],
                                                            [
                                                                h.label(
                                                                    [
                                                                        h.For(
                                                                            "landing-template-name"
                                                                        ),
                                                                        h.Class(
                                                                            "grid min-w-0 flex-1 gap-1 text-xs font-semibold"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        "Template name",
                                                                        h.input(
                                                                            [
                                                                                h.Id(
                                                                                    "landing-template-name"
                                                                                ),
                                                                                h.Name(
                                                                                    "template_name"
                                                                                ),
                                                                                h.Value(
                                                                                    model.template_name
                                                                                ),
                                                                                h.OnInput(
                                                                                    (
                                                                                        value
                                                                                    ) =>
                                                                                        toParentMessage(
                                                                                            UpdatedTemplateName(
                                                                                                {
                                                                                                    value,
                                                                                                }
                                                                                            )
                                                                                        )
                                                                                ),
                                                                                h.Attribute(
                                                                                    "maxlength",
                                                                                    "160"
                                                                                ),
                                                                                h.Class(
                                                                                    `${control_outline_class} min-w-0 bg-background text-base`
                                                                                ),
                                                                            ]
                                                                        ),
                                                                    ]
                                                                ),
                                                                h.label(
                                                                    [
                                                                        h.For(
                                                                            "landing-template-description"
                                                                        ),
                                                                        h.Class(
                                                                            "grid min-w-0 gap-1 text-xs font-semibold"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        "Description",
                                                                        h.input(
                                                                            [
                                                                                h.Id(
                                                                                    "landing-template-description"
                                                                                ),
                                                                                h.Name(
                                                                                    "template_description"
                                                                                ),
                                                                                h.Value(
                                                                                    model.template_description
                                                                                ),
                                                                                h.OnInput(
                                                                                    (
                                                                                        value
                                                                                    ) =>
                                                                                        toParentMessage(
                                                                                            UpdatedTemplateDescription(
                                                                                                {
                                                                                                    value,
                                                                                                }
                                                                                            )
                                                                                        )
                                                                                ),
                                                                                h.Maxlength(
                                                                                    500
                                                                                ),
                                                                                h.Class(
                                                                                    `${control_outline_class} min-w-0 bg-background text-base`
                                                                                ),
                                                                            ]
                                                                        ),
                                                                    ]
                                                                ),
                                                                h.label(
                                                                    [
                                                                        h.For(
                                                                            "landing-template-category"
                                                                        ),
                                                                        h.Class(
                                                                            "grid min-w-0 gap-1 text-xs font-semibold"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        "Category",
                                                                        h.select(
                                                                            [
                                                                                h.Id(
                                                                                    "landing-template-category"
                                                                                ),
                                                                                h.Name(
                                                                                    "template_category"
                                                                                ),
                                                                                h.Value(
                                                                                    model.template_category
                                                                                ),
                                                                                h.OnInput(
                                                                                    (
                                                                                        value
                                                                                    ) =>
                                                                                        toParentMessage(
                                                                                            UpdatedTemplateCategory(
                                                                                                {
                                                                                                    value,
                                                                                                }
                                                                                            )
                                                                                        )
                                                                                ),
                                                                                h.Required(
                                                                                    true
                                                                                ),
                                                                                h.Class(
                                                                                    `${control_outline_class} min-w-0 bg-background text-base`
                                                                                ),
                                                                            ],
                                                                            ContentTemplateCategory.literals.map(
                                                                                (
                                                                                    category
                                                                                ) =>
                                                                                    h.option(
                                                                                        [
                                                                                            h.Value(
                                                                                                category
                                                                                            ),
                                                                                        ],
                                                                                        [
                                                                                            category,
                                                                                        ]
                                                                                    )
                                                                            )
                                                                        ),
                                                                    ]
                                                                ),
                                                                h.label(
                                                                    [
                                                                        h.For(
                                                                            "landing-template-tags"
                                                                        ),
                                                                        h.Class(
                                                                            "grid min-w-0 gap-1 text-xs font-semibold"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        "Tags (comma-separated)",
                                                                        h.input(
                                                                            [
                                                                                h.Id(
                                                                                    "landing-template-tags"
                                                                                ),
                                                                                h.Name(
                                                                                    "template_tags"
                                                                                ),
                                                                                h.Value(
                                                                                    model.template_tags
                                                                                ),
                                                                                h.OnInput(
                                                                                    (
                                                                                        value
                                                                                    ) =>
                                                                                        toParentMessage(
                                                                                            UpdatedTemplateTags(
                                                                                                {
                                                                                                    value,
                                                                                                }
                                                                                            )
                                                                                        )
                                                                                ),
                                                                                h.AriaDescribedBy(
                                                                                    "landing-template-tags-help"
                                                                                ),
                                                                                h.Class(
                                                                                    `${control_outline_class} min-w-0 bg-background text-base`
                                                                                ),
                                                                            ]
                                                                        ),
                                                                        h.span(
                                                                            [
                                                                                h.Id(
                                                                                    "landing-template-tags-help"
                                                                                ),
                                                                                h.Class(
                                                                                    "font-normal text-muted-foreground"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                "Up to 12 tags; 40 characters each.",
                                                                            ]
                                                                        ),
                                                                    ]
                                                                ),
                                                                h.button(
                                                                    [
                                                                        h.Type(
                                                                            "button"
                                                                        ),
                                                                        h.OnClick(
                                                                            toParentMessage(
                                                                                ClickedSaveTemplate()
                                                                            )
                                                                        ),
                                                                        h.Disabled(
                                                                            model.template_save_status ===
                                                                                "saving"
                                                                        ),
                                                                        h.Class(
                                                                            `${control_outline_class} ${control_small_class}`
                                                                        ),
                                                                    ],
                                                                    [
                                                                        model.template_save_status ===
                                                                        "saving"
                                                                            ? "Saving…"
                                                                            : "Save as template",
                                                                    ]
                                                                ),
                                                            ]
                                                        ),
                                                        h.label(
                                                            [
                                                                h.For(
                                                                    "landing-motion-preset"
                                                                ),
                                                                h.Class(
                                                                    "text-xs font-semibold"
                                                                ),
                                                            ],
                                                            ["Motion"]
                                                        ),
                                                        h.select(
                                                            [
                                                                h.Id(
                                                                    "landing-motion-preset"
                                                                ),
                                                                h.Name(
                                                                    "motion"
                                                                ),
                                                                h.Value(
                                                                    model.motion
                                                                ),
                                                                h.OnInput(
                                                                    change_motion
                                                                ),
                                                                h.Class(
                                                                    `${control_outline_class} ${control_small_class}`
                                                                ),
                                                            ],
                                                            [
                                                                h.option(
                                                                    [
                                                                        h.Value(
                                                                            "none"
                                                                        ),
                                                                    ],
                                                                    ["None"]
                                                                ),
                                                                h.option(
                                                                    [
                                                                        h.Value(
                                                                            "fade"
                                                                        ),
                                                                    ],
                                                                    ["Fade"]
                                                                ),
                                                                h.option(
                                                                    [
                                                                        h.Value(
                                                                            "rise"
                                                                        ),
                                                                    ],
                                                                    ["Rise"]
                                                                ),
                                                                h.option(
                                                                    [
                                                                        h.Value(
                                                                            "stagger"
                                                                        ),
                                                                    ],
                                                                    ["Stagger"]
                                                                ),
                                                            ]
                                                        ),
                                                        h.button(
                                                            [
                                                                h.Type(
                                                                    "button"
                                                                ),
                                                                h.AriaPressed(
                                                                    String(
                                                                        model.preview_motion
                                                                    )
                                                                ),
                                                                h.OnClick(
                                                                    toParentMessage(
                                                                        ToggledMotionPreview()
                                                                    )
                                                                ),
                                                                h.Class(
                                                                    `${model.preview_motion ? control_primary_class : control_outline_class} ${control_small_class}`
                                                                ),
                                                            ],
                                                            ["Preview motion"]
                                                        ),
                                                        Button.view(
                                                            {
                                                                onClick:
                                                                    toParentMessage(
                                                                        ClickedSave()
                                                                    ),
                                                                toView: (
                                                                    attributes
                                                                ) =>
                                                                    h.button(
                                                                        [
                                                                            ...attributes.button,
                                                                            h.Class(
                                                                                `${control_primary_class} ${control_small_class} rounded-full font-mono`
                                                                            ),
                                                                        ],
                                                                        [
                                                                            "Save draft",
                                                                        ]
                                                                    ),
                                                            },
                                                            h
                                                        ),
                                                    ]
                                                  : []),
                                              edit_switch,
                                          ]
                                      ),
                                  ]
                              ),
                              ...(model.template_save_status === "saved"
                                  ? [
                                        h.p(
                                            [
                                                h.Attribute(
                                                    "aria-live",
                                                    "polite"
                                                ),
                                                h.Class(
                                                    "container mx-auto mt-2 text-sm text-primary"
                                                ),
                                            ],
                                            ["Landing template saved."]
                                        ),
                                    ]
                                  : []),
                              ...Option.match(model.template_save_error, {
                                  onNone: () => [],
                                  onSome: (error) => [
                                      h.p(
                                          [
                                              h.Role("alert"),
                                              h.Class(
                                                  "container mx-auto mt-2 text-sm text-error"
                                              ),
                                          ],
                                          [error]
                                      ),
                                  ],
                              }),
                              ...(is_editing ? [block_editor] : []),
                          ]
                      ),
                  ]),
            h.div(
                [
                    h.DataAttribute("landing-motion", active_motion),
                    h.DataAttribute(
                        "landing-motion-preview",
                        String(is_editing && model.preview_motion)
                    ),
                    h.DataAttribute(
                        "site-appearance",
                        site_appearance.appearance
                    ),
                    h.Style(site_appearance_preview_style(site_appearance)),
                    h.Class(
                        "site-appearance-preview flex min-h-screen flex-col bg-background text-foreground"
                    ),
                ],
                [
                    h.section(
                        [
                            h.Id("home"),
                            h.Attribute("style", block_style("hero")),
                            h.Class("relative overflow-hidden py-16 md:py-24"),
                        ],
                        [
                            h.div(
                                [
                                    h.AriaHidden(true),
                                    h.Class(
                                        "absolute inset-0 z-0 bg-[radial-gradient(var(--foreground)_1px,transparent_1px)] opacity-[0.03] [background-size:16px_16px]"
                                    ),
                                ],
                                []
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "container relative mx-auto grid items-center gap-10 px-4 lg:grid-cols-2 lg:gap-12"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    ...revealAttributes(
                                                        "up",
                                                        0,
                                                        h
                                                    ),
                                                    h.DataAttribute(
                                                        "distance-preset",
                                                        "small"
                                                    ),
                                                    h.Class("mb-6"),
                                                ],
                                                [
                                                    copy(
                                                        "hero_title",
                                                        "text-4xl font-bold leading-tight tracking-tight md:text-5xl",
                                                        "Hero title"
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...revealAttributes(
                                                        "up",
                                                        1,
                                                        h
                                                    ),
                                                    h.DataAttribute(
                                                        "distance-preset",
                                                        "small"
                                                    ),
                                                    h.Class("mb-8"),
                                                ],
                                                [
                                                    copy(
                                                        "hero_lede",
                                                        "text-xl font-medium leading-relaxed text-foreground/80",
                                                        "Hero introduction"
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...revealAttributes(
                                                        "up",
                                                        2,
                                                        h
                                                    ),
                                                    h.DataAttribute(
                                                        "distance-preset",
                                                        "small"
                                                    ),
                                                    h.Class("mb-8 max-w-lg"),
                                                ],
                                                [
                                                    copy(
                                                        "hero_detail",
                                                        "text-base text-foreground/60",
                                                        "Hero detail"
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...revealAttributes(
                                                        "up",
                                                        3,
                                                        h
                                                    ),
                                                    h.DataAttribute(
                                                        "distance-preset",
                                                        "small"
                                                    ),
                                                ],
                                                [
                                                    actionsView(
                                                        model,
                                                        "hero",
                                                        toParentMessage,
                                                        h
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            ...revealAttributes("up", 1, h),
                                            h.DataAttribute(
                                                "distance-preset",
                                                "medium"
                                            ),
                                            h.Class(
                                                `${browser_mockup_class} transform-gpu [box-shadow:var(--shadow-overlay)] transition-all duration-700 ease-out [perspective:2000px] [transform:rotateY(-12deg)_rotateX(5deg)] hover:-translate-y-1 hover:[transform:rotateY(-5deg)_rotateX(2deg)_translateY(-5px)]`
                                            ),
                                        ],
                                        [
                                            ...(Option.isNone(model.hero_image)
                                                ? [
                                                      h.div(
                                                          [
                                                              h.DataAttribute(
                                                                  "hero-placeholder-toolbar",
                                                                  ""
                                                              ),
                                                              h.Class(
                                                                  browser_toolbar_class
                                                              ),
                                                          ],
                                                          [
                                                              h.div(
                                                                  [
                                                                      h.Class(
                                                                          browser_address_class
                                                                      ),
                                                                  ],
                                                                  ["urm.dev"]
                                                              ),
                                                          ]
                                                      ),
                                                  ]
                                                : []),
                                            ...(is_editing
                                                ? [
                                                      h.submodel({
                                                          slotId: model
                                                              .hero_image_drop
                                                              .id,
                                                          model: model.hero_image_drop,
                                                          view: FileDrop.view,
                                                          viewInputs: {
                                                              accept: [
                                                                  "image/png",
                                                                  "image/jpeg",
                                                                  "image/webp",
                                                                  "image/gif",
                                                              ],
                                                              isDisabled:
                                                                  model.hero_image_upload_busy,
                                                              toView: (
                                                                  attributes
                                                              ) =>
                                                                  h.div(
                                                                      [
                                                                          ...attributes.root,
                                                                          h.AriaLabel(
                                                                              "Hero image dropzone"
                                                                          ),
                                                                          h.Class(
                                                                              "group relative flex aspect-video items-center justify-center overflow-hidden border-2 border-dashed border-primary/50 bg-muted/50 transition data-[drag-over]:border-primary data-[drag-over]:bg-primary/10"
                                                                          ),
                                                                      ],
                                                                      [
                                                                          Option.match(
                                                                              selected_hero_image,
                                                                              {
                                                                                  onNone: () =>
                                                                                      h.div(
                                                                                          [
                                                                                              h.AriaHidden(
                                                                                                  true
                                                                                              ),
                                                                                              h.Class(
                                                                                                  "space-y-4 text-center opacity-35"
                                                                                              ),
                                                                                          ],
                                                                                          [
                                                                                              h.span(
                                                                                                  [
                                                                                                      h.Class(
                                                                                                          `${badge_primary_class} font-mono text-xs uppercase tracking-widest`
                                                                                                      ),
                                                                                                  ],
                                                                                                  [
                                                                                                      "Dashboard",
                                                                                                  ]
                                                                                              ),
                                                                                              h.div(
                                                                                                  [
                                                                                                      h.Class(
                                                                                                          "mx-auto h-2 w-32 rounded bg-border"
                                                                                                      ),
                                                                                                  ],
                                                                                                  []
                                                                                              ),
                                                                                              h.div(
                                                                                                  [
                                                                                                      h.Class(
                                                                                                          "mx-auto h-2 w-48 rounded bg-border"
                                                                                                      ),
                                                                                                  ],
                                                                                                  []
                                                                                              ),
                                                                                              h.div(
                                                                                                  [
                                                                                                      h.Class(
                                                                                                          "mx-auto h-2 w-24 rounded bg-border"
                                                                                                      ),
                                                                                                  ],
                                                                                                  []
                                                                                              ),
                                                                                          ]
                                                                                      ),
                                                                                  onSome: (
                                                                                      image
                                                                                  ) =>
                                                                                      h.img(
                                                                                          [
                                                                                              h.Src(
                                                                                                  image.url
                                                                                              ),
                                                                                              h.Alt(
                                                                                                  image.alt
                                                                                              ),
                                                                                              h.Class(
                                                                                                  "absolute inset-0 size-full object-cover"
                                                                                              ),
                                                                                          ]
                                                                                      ),
                                                                              }
                                                                          ),
                                                                          h.div(
                                                                              [
                                                                                  h.Class(
                                                                                      "absolute inset-x-4 bottom-4 z-20 rounded-[var(--radius-surface)] border border-border bg-background/95 p-3 [box-shadow:var(--shadow-overlay)]"
                                                                                  ),
                                                                              ],
                                                                              [
                                                                                  h.p(
                                                                                      [
                                                                                          h.Class(
                                                                                              "text-sm font-semibold"
                                                                                          ),
                                                                                      ],
                                                                                      [
                                                                                          model.hero_image_upload_busy
                                                                                              ? "Uploading hero image…"
                                                                                              : "Hero image",
                                                                                      ]
                                                                                  ),
                                                                                  h.p(
                                                                                      [
                                                                                          h.Class(
                                                                                              "mt-0.5 text-xs text-foreground/60"
                                                                                          ),
                                                                                      ],
                                                                                      [
                                                                                          "Drop an image anywhere here, upload a file, or choose from the library.",
                                                                                      ]
                                                                                  ),
                                                                                  h.div(
                                                                                      [
                                                                                          h.Class(
                                                                                              "mt-3 flex flex-wrap gap-2"
                                                                                          ),
                                                                                      ],
                                                                                      [
                                                                                          h.label(
                                                                                              [
                                                                                                  h.For(
                                                                                                      model
                                                                                                          .hero_image_drop
                                                                                                          .id
                                                                                                  ),
                                                                                                  h.Class(
                                                                                                      `${control_primary_class} ${model.hero_image_upload_busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`
                                                                                                  ),
                                                                                              ],
                                                                                              [
                                                                                                  "Upload image",
                                                                                              ]
                                                                                          ),
                                                                                          h.input(
                                                                                              attributes.input
                                                                                          ),
                                                                                          h.button(
                                                                                              [
                                                                                                  h.Type(
                                                                                                      "button"
                                                                                                  ),
                                                                                                  h.AriaExpanded(
                                                                                                      model.hero_image_library_open
                                                                                                  ),
                                                                                                  h.OnClick(
                                                                                                      toParentMessage(
                                                                                                          ToggledHeroImageLibrary()
                                                                                                      )
                                                                                                  ),
                                                                                                  h.Class(
                                                                                                      control_outline_class
                                                                                                  ),
                                                                                              ],
                                                                                              [
                                                                                                  "Choose from library",
                                                                                              ]
                                                                                          ),
                                                                                          ...Option.match(
                                                                                              model.hero_image,
                                                                                              {
                                                                                                  onNone: () => [],
                                                                                                  onSome: () => [
                                                                                                      h.button(
                                                                                                          [
                                                                                                              h.Type(
                                                                                                                  "button"
                                                                                                              ),
                                                                                                              h.OnClick(
                                                                                                                  toParentMessage(
                                                                                                                      ClearedHeroImage()
                                                                                                                  )
                                                                                                              ),
                                                                                                              h.Class(
                                                                                                                  control_ghost_class
                                                                                                              ),
                                                                                                          ],
                                                                                                          [
                                                                                                              "Remove",
                                                                                                          ]
                                                                                                      ),
                                                                                                  ],
                                                                                              }
                                                                                          ),
                                                                                      ]
                                                                                  ),
                                                                                  Option.match(
                                                                                      model.hero_image_upload_error,
                                                                                      {
                                                                                          onNone: () =>
                                                                                              h.empty,
                                                                                          onSome: (
                                                                                              error
                                                                                          ) =>
                                                                                              h.p(
                                                                                                  [
                                                                                                      h.Class(
                                                                                                          "mt-2 text-xs text-error"
                                                                                                      ),
                                                                                                  ],
                                                                                                  [
                                                                                                      error,
                                                                                                  ]
                                                                                              ),
                                                                                      }
                                                                                  ),
                                                                              ]
                                                                          ),
                                                                      ]
                                                                  ),
                                                          },
                                                          toParentMessage: (
                                                              message
                                                          ) =>
                                                              toParentMessage(
                                                                  GotHeroImageDropMessage(
                                                                      {
                                                                          message,
                                                                      }
                                                                  )
                                                              ),
                                                      }),
                                                      ...(model.hero_image_library_open
                                                          ? [
                                                                h.div(
                                                                    [
                                                                        h.Class(
                                                                            "border-t border-border bg-background p-3"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        h.p(
                                                                            [
                                                                                h.Class(
                                                                                    "mb-3 text-sm font-semibold"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                "Domain image library",
                                                                            ]
                                                                        ),
                                                                        ...(media_images.length ===
                                                                        0
                                                                            ? [
                                                                                  h.p(
                                                                                      [
                                                                                          h.Class(
                                                                                              "text-sm text-foreground/60"
                                                                                          ),
                                                                                      ],
                                                                                      [
                                                                                          "No images yet. Upload one directly into the hero above.",
                                                                                      ]
                                                                                  ),
                                                                              ]
                                                                            : [
                                                                                  h.div(
                                                                                      [
                                                                                          h.Class(
                                                                                              "grid max-h-56 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4"
                                                                                          ),
                                                                                      ],
                                                                                      media_images.map(
                                                                                          (
                                                                                              image
                                                                                          ) =>
                                                                                              h.keyed(
                                                                                                  "button"
                                                                                              )(
                                                                                                  image.id,
                                                                                                  [
                                                                                                      h.Type(
                                                                                                          "button"
                                                                                                      ),
                                                                                                      h.AriaLabel(
                                                                                                          `Use ${image.alt || "this image"} as the hero image`
                                                                                                      ),
                                                                                                      h.AriaPressed(
                                                                                                          selected_hero_image_id ===
                                                                                                              image.id
                                                                                                              ? "true"
                                                                                                              : "false"
                                                                                                      ),
                                                                                                      h.OnClick(
                                                                                                          toParentMessage(
                                                                                                              SelectedHeroImage(
                                                                                                                  {
                                                                                                                      image_id:
                                                                                                                          image.id,
                                                                                                                      alt: image.alt,
                                                                                                                  }
                                                                                                              )
                                                                                                          )
                                                                                                      ),
                                                                                                      h.Class(
                                                                                                          "aspect-square overflow-hidden rounded-[var(--radius-control)] border-2 border-border bg-muted transition hover:border-primary aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-ring"
                                                                                                      ),
                                                                                                  ],
                                                                                                  [
                                                                                                      h.img(
                                                                                                          [
                                                                                                              h.Src(
                                                                                                                  image.url
                                                                                                              ),
                                                                                                              h.Alt(
                                                                                                                  image.alt
                                                                                                              ),
                                                                                                              h.Class(
                                                                                                                  "size-full object-cover"
                                                                                                              ),
                                                                                                          ]
                                                                                                      ),
                                                                                                  ]
                                                                                              )
                                                                                      )
                                                                                  ),
                                                                              ]),
                                                                    ]
                                                                ),
                                                            ]
                                                          : []),
                                                  ]
                                                : [
                                                      h.div(
                                                          [
                                                              h.Class(
                                                                  "relative flex aspect-video items-center justify-center overflow-hidden bg-muted/50"
                                                              ),
                                                          ],
                                                          [
                                                              Option.match(
                                                                  selected_hero_image,
                                                                  {
                                                                      onNone: () =>
                                                                          h.div(
                                                                              [
                                                                                  h.Class(
                                                                                      "space-y-4 text-center"
                                                                                  ),
                                                                              ],
                                                                              [
                                                                                  h.span(
                                                                                      [
                                                                                          ...revealAttributes(
                                                                                              "fade",
                                                                                              0,
                                                                                              h
                                                                                          ),
                                                                                          h.Class(
                                                                                              `${badge_primary_class} font-mono text-xs uppercase tracking-widest`
                                                                                          ),
                                                                                      ],
                                                                                      [
                                                                                          "Dashboard",
                                                                                      ]
                                                                                  ),
                                                                                  h.div(
                                                                                      [
                                                                                          h.Class(
                                                                                              "mx-auto h-2 w-32 rounded bg-border"
                                                                                          ),
                                                                                      ],
                                                                                      []
                                                                                  ),
                                                                                  h.div(
                                                                                      [
                                                                                          h.Class(
                                                                                              "mx-auto h-2 w-48 rounded bg-border"
                                                                                          ),
                                                                                      ],
                                                                                      []
                                                                                  ),
                                                                                  h.div(
                                                                                      [
                                                                                          h.Class(
                                                                                              "mx-auto h-2 w-24 rounded bg-border"
                                                                                          ),
                                                                                      ],
                                                                                      []
                                                                                  ),
                                                                              ]
                                                                          ),
                                                                      onSome: (
                                                                          image
                                                                      ) =>
                                                                          h.img(
                                                                              [
                                                                                  h.Src(
                                                                                      image.url
                                                                                  ),
                                                                                  h.Alt(
                                                                                      image.alt
                                                                                  ),
                                                                                  h.Class(
                                                                                      "absolute inset-0 size-full object-cover"
                                                                                  ),
                                                                              ]
                                                                          ),
                                                                  }
                                                              ),
                                                          ]
                                                      ),
                                                  ]),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.section(
                        [
                            h.Id("philosophy"),
                            h.Attribute("style", block_style("intro")),
                            h.Class("bg-background py-16 md:py-24"),
                        ],
                        [
                            h.div(
                                [h.Class("container mx-auto px-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mx-auto max-w-3xl text-center"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    ...revealAttributes(
                                                        "fade",
                                                        0,
                                                        h
                                                    ),
                                                    h.Class(
                                                        `${badge_accent_class} mb-6 px-4 py-1.5 font-mono uppercase tracking-widest`
                                                    ),
                                                ],
                                                ["Philosophy"]
                                            ),
                                            h.div(
                                                [
                                                    ...revealAttributes(
                                                        "up",
                                                        1,
                                                        h
                                                    ),
                                                    h.DataAttribute(
                                                        "distance-preset",
                                                        "small"
                                                    ),
                                                    h.Class("mb-6"),
                                                ],
                                                [
                                                    copy(
                                                        "philosophy_title",
                                                        "text-3xl font-bold tracking-tight text-foreground md:text-4xl",
                                                        "Philosophy title"
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...revealAttributes(
                                                        "up",
                                                        2,
                                                        h
                                                    ),
                                                    h.DataAttribute(
                                                        "distance-preset",
                                                        "small"
                                                    ),
                                                ],
                                                [
                                                    copy(
                                                        "philosophy_body",
                                                        "text-lg leading-relaxed text-foreground/80 md:text-xl",
                                                        "Philosophy body"
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    model.blocks.includes("rich_text")
                        ? h.section(
                              [
                                  h.Id("rich_text"),
                                  h.Attribute(
                                      "style",
                                      block_style("rich_text")
                                  ),
                                  h.Class("bg-background py-16 md:py-24"),
                              ],
                              [
                                  h.div(
                                      [h.Class("container mx-auto px-4")],
                                      [richTextView(model, toParentMessage, h)]
                                  ),
                              ]
                          )
                        : h.empty,
                    section(
                        "features",
                        featureShowcaseView(model, toParentMessage, h)
                    ),
                    section("modules", moduleView(h)),
                    section("showcase", showcaseView(h)),
                    section(
                        "integrations",
                        integrationCardsView(
                            model,
                            media_images,
                            toParentMessage,
                            h
                        )
                    ),
                    section("stack", serviceCardsView(stack, "DEV", h)),
                    section("pricing", pricingView(h)),
                    section("faq", faqView(model, toParentMessage, h)),
                    h.section(
                        [
                            h.Attribute("style", block_style("cta")),
                            h.Class(
                                "relative overflow-hidden border-t border-border bg-background pb-20 pt-20 md:pb-32 md:pt-32"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.AriaHidden(true),
                                    h.Class(
                                        "absolute inset-0 z-0 bg-gradient-to-b from-transparent to-primary/5"
                                    ),
                                ],
                                []
                            ),
                            h.div(
                                [
                                    ...revealAttributes("fade", 0, h),
                                    h.Class(
                                        "container relative mx-auto max-w-xl px-4 text-center"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                `${badge_primary_class} mb-6 px-4 py-1.5 font-mono uppercase tracking-widest`
                                            ),
                                        ],
                                        ["Get in touch"]
                                    ),
                                    h.div(
                                        [h.Class("mb-6")],
                                        [
                                            copy(
                                                "cta_title",
                                                "text-4xl font-bold tracking-tight text-foreground md:text-5xl",
                                                "Call to action title"
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [],
                                        [
                                            copy(
                                                "cta_body",
                                                "text-xl text-foreground/70",
                                                "Call to action body"
                                            ),
                                        ]
                                    ),
                                    actionsView(
                                        model,
                                        "cta",
                                        toParentMessage,
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}
