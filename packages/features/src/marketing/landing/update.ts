import { Effect, Match as M, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { DragAndDrop, FileDrop } from "@foldkit/ui"
import {
    initRichTextEditor,
    updateRichTextEditor,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import {
    type LandingAction,
    LandingBlock,
    type LandingImage,
    LandingPageDocument,
    UrmBundledAssetId,
} from "@urm/domain/schemas/landing-pages"
import { urm_marketing_landing_page } from "@urm/domain/landing-page-presets"
import { initial_copy } from "./copy.ts"
import {
    Editing,
    type LandingEditorPreset,
    LandingSection,
    type Model,
    Viewing,
} from "./model.ts"
import {
    GotHeroImageDropMessage,
    GotLogoImageDropMessage,
    GotLandingDragAndDropMessage,
    GotLandingRichTextEditorMessage,
    type Message,
} from "./message.ts"

export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const urm_blocks: Model["blocks"] = [
    "hero",
    "intro",
    "features",
    "modules",
    "showcase",
    "integrations",
    "stack",
    "pricing",
    "faq",
    "cta",
]

const initial_rich_text_editor = () => initRichTextEditor("")

export const template_tags_from_input = (
    value: string
): ReadonlyArray<string> =>
    value
        .split(",")
        .map((tag) => tag.trim().toLocaleLowerCase())
        .filter((tag) => tag.length > 0)
        .reduce<ReadonlyArray<string>>(
            (tags, tag) => (tags.includes(tag) ? tags : [...tags, tag]),
            []
        )

const rich_text_document_for_document = (document: LandingPageDocument) =>
    document.blocks.find((block) => block._tag === "RichText")?.document ??
    initial_rich_text_editor().document

const block_items_for_document = (
    document: LandingPageDocument
): Model["block_items"] =>
    document.blocks.reduce<Model["block_items"]>((items, block) => {
        if (block._tag === "FeatureGrid" && block.id === "features") {
            return {
                ...items,
                features: block.items.map((item, index) => ({
                    id: `features-item-${index + 1}`,
                    first: item.heading,
                    second: item.body,
                    third: "",
                })),
            }
        }
        if (block._tag === "Faq") {
            return {
                ...items,
                faq: block.items.map((item, index) => ({
                    id: `faq-item-${index + 1}`,
                    first: item.question,
                    second: item.answer,
                    third: "",
                })),
            }
        }
        if (block._tag === "Hero" || block._tag === "Cta") {
            const section = block._tag === "Hero" ? "hero" : "cta"
            return {
                ...items,
                [section]: block.actions.map((action, index) => ({
                    id: `${section}-item-${index + 1}`,
                    first: action.label,
                    second: action.href,
                    third: action.style,
                })),
            }
        }
        if (block._tag === "LogoGrid") {
            return {
                ...items,
                integrations: block.logos.map((logo, index) => ({
                    id: `integrations-item-${index + 1}`,
                    first: logo.name,
                    second:
                        logo.image._tag === "DomainImage"
                            ? logo.image.image_id
                            : logo.image.asset_id,
                    third: logo.image.alt,
                })),
            }
        }
        return items
    }, {})

export const init = (preset: LandingEditorPreset = "urm"): UpdateReturn => {
    const block_items =
        preset === "urm"
            ? block_items_for_document(urm_marketing_landing_page)
            : {}
    const motion =
        preset === "urm"
            ? (urm_marketing_landing_page.motion ?? "none")
            : "none"
    const rich_text_editor = initial_rich_text_editor()
    return [
        {
            preset,
            page_id: Option.none(),
            loaded_content: "",
            source_document: Option.none(),
            drafts: initial_copy,
            saved_snapshot: initial_copy,
            block_items,
            saved_block_items: block_items,
            hero_image: Option.none(),
            saved_hero_image: Option.none(),
            rich_text_editor,
            saved_rich_text_document: rich_text_editor.document,
            motion,
            saved_motion: motion,
            preview_motion: false,
            hero_image_drop: FileDrop.init({ id: "landing-hero-image-upload" }),
            hero_image_library_open: false,
            hero_image_upload_busy: false,
            hero_image_upload_error: Option.none(),
            logo_image_drop: FileDrop.init({ id: "landing-logo-image-upload" }),
            logo_image_library_index: Option.none(),
            logo_image_upload_index: Option.none(),
            logo_image_upload_error: Option.none(),
            blocks: preset === "blank" ? [] : urm_blocks,
            saved_blocks: preset === "blank" ? [] : urm_blocks,
            drag_and_drop: DragAndDrop.init({ id: "urm-landing-blocks" }),
            editor_state: Viewing(),
            template_name: "",
            template_description: "Reusable landing-page template.",
            template_category: "Web",
            template_tags: "",
            template_save_status: "idle",
            template_save_error: Option.none(),
            open_faqs: {},
        },
        [],
    ]
}

export const changed_preset = (
    model: Model,
    preset: LandingEditorPreset
): Model => (model.preset === preset ? model : init(preset)[0])

const section_for_block = (
    block: LandingBlock
): Option.Option<typeof LandingSection.Type> => {
    const stored_section = S.decodeUnknownOption(LandingSection)(block.id)
    if (Option.isSome(stored_section)) return stored_section
    switch (block._tag) {
        case "Hero":
            return Option.some("hero")
        case "Intro":
            return Option.some("intro")
        case "RichText":
            return Option.some("rich_text")
        case "FeatureGrid":
            return Option.some("features")
        case "LogoGrid":
            return Option.some("integrations")
        case "Faq":
            return Option.some("faq")
        case "Cta":
            return Option.some("cta")
    }
}

const copy_for_document = (
    document: LandingPageDocument
): Readonly<Record<string, string>> =>
    document.blocks.reduce<Readonly<Record<string, string>>>((copy, block) => {
        const section = Option.getOrUndefined(section_for_block(block))
        if (section === undefined) return copy
        switch (block._tag) {
            case "Hero":
                return {
                    ...copy,
                    hero_title: block.heading,
                    hero_lede: block.body,
                }
            case "Intro":
                return {
                    ...copy,
                    philosophy_title: block.heading,
                    philosophy_body: block.body,
                }
            case "FeatureGrid":
            case "LogoGrid":
            case "Faq":
                return {
                    ...copy,
                    [`${section}_title`]: block.heading ?? "",
                }
            case "Cta":
                return {
                    ...copy,
                    cta_title: block.heading,
                    cta_body: block.body,
                }
            case "RichText":
                return copy
        }
    }, initial_copy)

export const loaded_page_content = (
    model: Model,
    page_id: string,
    content: string
): Model => {
    if (
        Option.contains(model.page_id, page_id) &&
        model.loaded_content === content
    ) {
        return model
    }
    try {
        const parsed: unknown = JSON.parse(content)
        const document = S.decodeUnknownOption(LandingPageDocument)(parsed)
        return Option.match(document, {
            onNone: () => model,
            onSome: (source_document) => {
                const drafts = copy_for_document(source_document)
                const blocks = source_document.blocks.flatMap((block) =>
                    Option.match(section_for_block(block), {
                        onNone: () => [],
                        onSome: (section) => [section],
                    })
                )
                const unique_blocks = blocks.filter(
                    (section, index) => blocks.indexOf(section) === index
                )
                const block_items = block_items_for_document(source_document)
                const hero_image = Option.fromNullishOr(
                    source_document.blocks.find(
                        (block) => block._tag === "Hero"
                    )?.image
                )
                const motion = source_document.motion ?? "none"
                const rich_text_document =
                    rich_text_document_for_document(source_document)
                return {
                    ...model,
                    page_id: Option.some(page_id),
                    loaded_content: content,
                    source_document: Option.some(source_document),
                    drafts,
                    saved_snapshot: drafts,
                    block_items,
                    saved_block_items: block_items,
                    hero_image,
                    saved_hero_image: hero_image,
                    rich_text_editor: {
                        ...initial_rich_text_editor(),
                        document: rich_text_document,
                    },
                    saved_rich_text_document: rich_text_document,
                    motion,
                    saved_motion: motion,
                    preview_motion: false,
                    hero_image_library_open: false,
                    hero_image_upload_busy: false,
                    hero_image_upload_error: Option.none(),
                    logo_image_library_index: Option.none(),
                    logo_image_upload_index: Option.none(),
                    logo_image_upload_error: Option.none(),
                    blocks: unique_blocks,
                    saved_blocks: unique_blocks,
                    editor_state: Viewing(),
                }
            },
        })
    } catch {
        return model
    }
}

const source_block_for_section = (
    model: Model,
    section: typeof LandingSection.Type
): LandingBlock | undefined =>
    Option.getOrUndefined(model.source_document)?.blocks.find((block) =>
        Option.contains(section_for_block(block), section)
    )

const action_style = (value: string): LandingAction["style"] => {
    switch (value) {
        case "primary":
            return "primary"
        case "secondary":
            return "secondary"
        case "link":
            return "link"
        default:
            return "secondary"
    }
}

const available_item_id = (
    section: string,
    items: Model["block_items"][string],
    candidate = 1
): string => {
    const id = `${section}-item-${candidate}`
    return items.some((item) => item.id === id)
        ? available_item_id(section, items, candidate + 1)
        : id
}

const actions_for_section = (
    model: Model,
    section: "hero" | "cta"
): ReadonlyArray<LandingAction> =>
    (model.block_items[section] ?? []).map((item) => ({
        label: item.first,
        href: item.second,
        style: action_style(item.third),
    }))

const landing_image_for_item = (image_id: string, alt: string): LandingImage =>
    Option.match(S.decodeUnknownOption(UrmBundledAssetId)(image_id), {
        onNone: () => ({ _tag: "DomainImage", image_id, alt }),
        onSome: (asset_id) => ({ _tag: "BundledAsset", asset_id, alt }),
    })

const block_for_section = (
    model: Model,
    section: typeof LandingSection.Type
): LandingBlock => {
    const source = source_block_for_section(model, section)
    if (section === "hero") {
        return {
            _tag: "Hero",
            id: "hero",
            heading: model.drafts.hero_title ?? "",
            body: model.drafts.hero_lede ?? "",
            actions: actions_for_section(model, "hero"),
            ...(source?._tag === "Hero" && source.eyebrow !== undefined
                ? { eyebrow: source.eyebrow }
                : {}),
            ...Option.match(model.hero_image, {
                onNone: () => ({}),
                onSome: (image) => ({ image }),
            }),
        }
    }
    if (section === "intro") {
        return {
            _tag: "Intro",
            id: "intro",
            heading: model.drafts.philosophy_title ?? "",
            body: model.drafts.philosophy_body ?? "",
            ...(source?._tag === "Intro" && source.eyebrow !== undefined
                ? { eyebrow: source.eyebrow }
                : {}),
        }
    }
    if (section === "rich_text") {
        return {
            _tag: "RichText",
            id: "rich_text",
            document: model.rich_text_editor.document,
        }
    }
    if (section === "faq") {
        return {
            _tag: "Faq",
            id: "faq",
            heading: model.drafts.faq_title ?? "",
            items: (model.block_items.faq ?? []).map((item) => ({
                question: item.first,
                answer: item.second,
            })),
        }
    }
    if (section === "cta") {
        return {
            _tag: "Cta",
            id: "cta",
            heading: model.drafts.cta_title ?? "",
            body: model.drafts.cta_body ?? "",
            actions: actions_for_section(model, "cta"),
        }
    }
    if (section === "integrations") {
        return {
            _tag: "LogoGrid",
            id: "integrations",
            heading: model.drafts.integrations_title ?? "",
            logos: (model.block_items.integrations ?? []).flatMap((item) =>
                item.second.length === 0
                    ? []
                    : [
                          {
                              name: item.first,
                              image: landing_image_for_item(
                                  item.second,
                                  item.third
                              ),
                          },
                      ]
            ),
        }
    }
    if (section === "features") {
        return {
            _tag: "FeatureGrid",
            id: "features",
            heading: model.drafts.features_title ?? "",
            items: (model.block_items.features ?? []).map((item) => ({
                heading: item.first,
                body: item.second,
            })),
        }
    }
    return {
        _tag: "FeatureGrid",
        id: section,
        heading: model.drafts[`${section}_title`] ?? "",
        items: source?._tag === "FeatureGrid" ? source.items : [],
    }
}

export const landing_page_document = (model: Model): LandingPageDocument => {
    const source_document = Option.getOrUndefined(model.source_document)
    const retained_blocks =
        source_document?.blocks.filter((block) =>
            Option.isNone(section_for_block(block))
        ) ?? []
    return {
        schema_version: 1,
        ...(source_document?.preset_id === undefined
            ? {}
            : { preset_id: source_document.preset_id }),
        motion: model.motion,
        blocks: [
            ...model.blocks.map((section) => block_for_section(model, section)),
            ...retained_blocks,
        ],
    }
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedEdit: () => [
                modifyFields(model, {
                    editor_state: () => Editing(),
                    preview_motion: () => false,
                }),
                [],
            ],
            UpdatedCopy: ({ key, text }) => [
                modifyFields(model, {
                    drafts: (drafts) => ({ ...drafts, [key]: text }),
                }),
                [],
            ],
            ClickedSave: () => [
                modifyFields(model, {
                    saved_snapshot: () => model.drafts,
                    saved_blocks: () => model.blocks,
                    saved_block_items: () => model.block_items,
                    saved_hero_image: () => model.hero_image,
                    saved_rich_text_document: () =>
                        model.rich_text_editor.document,
                    saved_motion: () => model.motion,
                    preview_motion: () => false,
                    editor_state: () => Viewing(),
                }),
                [],
            ],
            ClickedCancel: () => [
                modifyFields(model, {
                    drafts: () => model.saved_snapshot,
                    blocks: () => model.saved_blocks,
                    block_items: () => model.saved_block_items,
                    hero_image: () => model.saved_hero_image,
                    rich_text_editor: () =>
                        modifyFields(model.rich_text_editor, {
                            document: () => model.saved_rich_text_document,
                        }),
                    motion: () => model.saved_motion,
                    preview_motion: () => false,
                    editor_state: () => Viewing(),
                }),
                [],
            ],
            UpdatedTemplateName: ({ value }) => [
                modifyFields(model, {
                    template_name: () => value,
                    template_save_status: () => "idle",
                    template_save_error: () => Option.none(),
                }),
                [],
            ],
            UpdatedTemplateDescription: ({ value }) => [
                modifyFields(model, {
                    template_description: () => value,
                    template_save_status: () => "idle",
                    template_save_error: () => Option.none(),
                }),
                [],
            ],
            UpdatedTemplateCategory: ({ value }) => [
                modifyFields(model, {
                    template_category: () => value,
                    template_save_status: () => "idle",
                    template_save_error: () => Option.none(),
                }),
                [],
            ],
            UpdatedTemplateTags: ({ value }) => [
                modifyFields(model, {
                    template_tags: () => value,
                    template_save_status: () => "idle",
                    template_save_error: () => Option.none(),
                }),
                [],
            ],
            ClickedSaveTemplate: () => [
                model.template_name.trim().length === 0
                    ? modifyFields(model, {
                          template_save_status: () => "error",
                          template_save_error: () =>
                              Option.some("Enter a template name."),
                      })
                    : model.template_category.trim().length === 0
                      ? modifyFields(model, {
                            template_save_status: () => "error",
                            template_save_error: () =>
                                Option.some("Enter a template category."),
                        })
                      : template_tags_from_input(model.template_tags).length >
                          12
                        ? modifyFields(model, {
                              template_save_status: () => "error",
                              template_save_error: () =>
                                  Option.some("Use no more than 12 tags."),
                          })
                        : template_tags_from_input(model.template_tags).some(
                                (tag) => tag.length > 40
                            )
                          ? modifyFields(model, {
                                template_save_status: () => "error",
                                template_save_error: () =>
                                    Option.some(
                                        "Keep each template tag to 40 characters or fewer."
                                    ),
                            })
                          : modifyFields(model, {
                                template_save_status: () => "saving",
                                template_save_error: () => Option.none(),
                            }),
                [],
            ],
            SavedTemplate: () => [
                modifyFields(model, {
                    template_name: () => "",
                    template_description: () =>
                        "Reusable landing-page template.",
                    template_category: () => "Web",
                    template_tags: () => "",
                    template_save_status: () => "saved",
                    template_save_error: () => Option.none(),
                }),
                [],
            ],
            FailedTemplateSave: ({ error }) => [
                modifyFields(model, {
                    template_save_status: () => "error",
                    template_save_error: () => Option.some(error),
                }),
                [],
            ],
            ChangedMotion: ({ motion }) => [
                modifyFields(model, { motion: () => motion }),
                [],
            ],
            ToggledMotionPreview: () => [
                modifyFields(model, {
                    preview_motion: (is_previewing) => !is_previewing,
                }),
                [],
            ],
            ToggledFaq: ({ key, is_open }) => [
                modifyFields(model, {
                    open_faqs: (open_faqs) => ({
                        ...open_faqs,
                        [key]: is_open,
                    }),
                }),
                [],
            ],
            AddedBlock: ({ section }) => [
                model.blocks.includes(section)
                    ? model
                    : modifyFields(model, {
                          blocks: (blocks) => [...blocks, section],
                      }),
                [],
            ],
            RemovedBlock: ({ section }) => [
                modifyFields(model, {
                    blocks: (blocks) =>
                        blocks.filter((candidate) => candidate !== section),
                }),
                [],
            ],
            AddedBlockItem: ({ section }) => [
                modifyFields(model, {
                    block_items: (block_items) => {
                        const items = block_items[section] ?? []
                        const id = available_item_id(section, items)
                        return {
                            ...block_items,
                            [section]: [
                                ...items,
                                section === "faq"
                                    ? {
                                          id,
                                          first: "Question",
                                          second: "Answer",
                                          third: "",
                                      }
                                    : section === "hero" || section === "cta"
                                      ? {
                                            id,
                                            first: "Action",
                                            second: "/",
                                            third:
                                                items.length === 0
                                                    ? "primary"
                                                    : "secondary",
                                        }
                                      : section === "integrations"
                                        ? {
                                              id,
                                              first: "Logo name",
                                              second: "",
                                              third: "",
                                          }
                                        : {
                                              id,
                                              first: "Feature title",
                                              second: "Describe this feature.",
                                              third: "",
                                          },
                            ],
                        }
                    },
                }),
                [],
            ],
            RemovedBlockItem: ({ section, index }) => [
                modifyFields(model, {
                    block_items: (block_items) => ({
                        ...block_items,
                        [section]: (block_items[section] ?? []).filter(
                            (_, candidate_index) => candidate_index !== index
                        ),
                    }),
                }),
                [],
            ],
            UpdatedBlockItem: ({ section, index, field, text }) => [
                modifyFields(model, {
                    block_items: (block_items) => ({
                        ...block_items,
                        [section]: (block_items[section] ?? []).map(
                            (item, candidate_index) =>
                                candidate_index === index
                                    ? { ...item, [field]: text }
                                    : item
                        ),
                    }),
                }),
                [],
            ],
            SelectedHeroImage: ({ image_id, alt }) => [
                modifyFields(model, {
                    hero_image: () =>
                        Option.some({ _tag: "DomainImage", image_id, alt }),
                    hero_image_library_open: () => false,
                    hero_image_upload_error: () => Option.none(),
                }),
                [],
            ],
            ClearedHeroImage: () => [
                modifyFields(model, { hero_image: () => Option.none() }),
                [],
            ],
            ToggledHeroImageLibrary: () => [
                modifyFields(model, {
                    hero_image_library_open: (is_open) => !is_open,
                }),
                [],
            ],
            GotHeroImageDropMessage: ({ message: child_message }) => {
                const {
                    model: hero_image_drop,
                    commands = [],
                    outMessage: maybe_out_message_value,
                } = FileDrop.update(model.hero_image_drop, child_message)
                const maybe_out_message = Option.fromUndefinedOr(
                    maybe_out_message_value
                )

                const upload_state = Option.match(maybe_out_message, {
                    onNone: () => ({
                        busy: model.hero_image_upload_busy,
                        error: model.hero_image_upload_error,
                    }),
                    onSome: (out_message) =>
                        out_message._tag === "ReceivedFiles"
                            ? { busy: true, error: Option.none<string>() }
                            : {
                                  busy: false,
                                  error: Option.some(
                                      "Drop an image file or use the upload button."
                                  ),
                              },
                })
                return [
                    modifyFields(model, {
                        hero_image_drop: () => hero_image_drop,
                        hero_image_upload_busy: () => upload_state.busy,
                        hero_image_upload_error: () => upload_state.error,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotHeroImageDropMessage({ message })
                            )
                        )
                    ),
                ]
            },
            UploadedHeroImage: ({ image_id, alt }) => [
                modifyFields(model, {
                    hero_image: () =>
                        Option.some({ _tag: "DomainImage", image_id, alt }),
                    hero_image_upload_busy: () => false,
                    hero_image_upload_error: () => Option.none(),
                    hero_image_library_open: () => false,
                }),
                [],
            ],
            HeroImageUploadFailed: ({ error }) => [
                modifyFields(model, {
                    hero_image_upload_busy: () => false,
                    hero_image_upload_error: () => Option.some(error),
                }),
                [],
            ],
            SelectedLogoImage: ({ index, image_id, alt }) => [
                modifyFields(model, {
                    block_items: () =>
                        modifyFields(model.block_items, {
                            integrations: (items) =>
                                (items ?? []).map((item, candidate_index) =>
                                    candidate_index === index
                                        ? {
                                              ...item,
                                              second: image_id,
                                              third: alt,
                                          }
                                        : item
                                ),
                        }),
                    logo_image_library_index: () => Option.none(),
                    logo_image_upload_error: () => Option.none(),
                }),
                [],
            ],
            ClearedLogoImage: ({ index }) => [
                modifyFields(model, {
                    block_items: () =>
                        modifyFields(model.block_items, {
                            integrations: (items) =>
                                (items ?? []).map((item, candidate_index) =>
                                    candidate_index === index
                                        ? { ...item, second: "", third: "" }
                                        : item
                                ),
                        }),
                }),
                [],
            ],
            ToggledLogoImageLibrary: ({ index }) => [
                modifyFields(model, {
                    logo_image_library_index: (open_index) =>
                        Option.contains(open_index, index)
                            ? Option.none()
                            : Option.some(index),
                }),
                [],
            ],
            GotLogoImageDropMessage: ({ itemId, message: child_message }) => {
                const index = (model.block_items.integrations ?? []).findIndex(
                    (item) => item.id === itemId
                )
                if (index === -1) return [model, []]
                const {
                    model: logo_image_drop,
                    commands = [],
                    outMessage: maybe_out_message_value,
                } = FileDrop.update(model.logo_image_drop, child_message)
                const maybe_out_message = Option.fromUndefinedOr(
                    maybe_out_message_value
                )

                const upload_index = Option.match(maybe_out_message, {
                    onNone: () => model.logo_image_upload_index,
                    onSome: (out_message) =>
                        out_message._tag === "ReceivedFiles"
                            ? Option.some(index)
                            : Option.none(),
                })
                return [
                    modifyFields(model, {
                        logo_image_drop: () => logo_image_drop,
                        logo_image_upload_index: () => upload_index,
                        logo_image_upload_error: () =>
                            Option.isSome(maybe_out_message) &&
                            maybe_out_message.value._tag !== "ReceivedFiles"
                                ? Option.some("Choose an image file.")
                                : Option.none(),
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotLogoImageDropMessage({ itemId, message })
                            )
                        )
                    ),
                ]
            },
            UploadedLogoImage: ({ index, image_id, alt }) => [
                modifyFields(model, {
                    block_items: () =>
                        modifyFields(model.block_items, {
                            integrations: (items) =>
                                (items ?? []).map((item, candidate_index) =>
                                    candidate_index === index
                                        ? {
                                              ...item,
                                              second: image_id,
                                              third: alt,
                                          }
                                        : item
                                ),
                        }),
                    logo_image_upload_index: () => Option.none(),
                    logo_image_library_index: () => Option.none(),
                    logo_image_upload_error: () => Option.none(),
                }),
                [],
            ],
            LogoImageUploadFailed: ({ error }) => [
                modifyFields(model, {
                    logo_image_upload_index: () => Option.none(),
                    logo_image_upload_error: () => Option.some(error),
                }),
                [],
            ],
            GotLandingDragAndDropMessage: ({ message: child_message }) => {
                const {
                    model: drag_and_drop,
                    commands = [],
                    outMessage: maybe_out_message_value,
                } = DragAndDrop.update(model.drag_and_drop, child_message)
                const maybe_out_message = Option.fromUndefinedOr(
                    maybe_out_message_value
                )

                const blocks = Option.match(maybe_out_message, {
                    onNone: () => model.blocks,
                    onSome: (out_message) => {
                        if (out_message._tag !== "Reordered") {
                            return model.blocks
                        }
                        const block = model.blocks.find(
                            (candidate) => candidate === out_message.itemId
                        )
                        if (block === undefined) return model.blocks
                        const remaining = model.blocks.filter(
                            (candidate) => candidate !== block
                        )
                        return [
                            ...remaining.slice(0, out_message.toIndex),
                            block,
                            ...remaining.slice(out_message.toIndex),
                        ]
                    },
                })
                return [
                    modifyFields(model, {
                        drag_and_drop: () => drag_and_drop,
                        blocks: () => blocks,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotLandingDragAndDropMessage({ message })
                            )
                        )
                    ),
                ]
            },
            GotLandingRichTextEditorMessage: ({ message: child_message }) => {
                const [rich_text_editor, commands] = updateRichTextEditor(
                    model.rich_text_editor,
                    child_message
                )
                return [
                    modifyFields(model, {
                        rich_text_editor: () => rich_text_editor,
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotLandingRichTextEditorMessage({ message })
                    ),
                ]
            },
        })
    )
