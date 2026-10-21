/** # Newsletter editor and isolated previews */
import * as Foldkit from "foldkit"
import * as Ui from "@foldkit/ui"
import { type Html, type HtmlBuilder } from "foldkit/html"

import {
    newsletterBasicTemplate,
    safe_external_email_image_src,
} from "@urm/email/templates"
import { publication_email_theme } from "@urm/email/publication-theme"
import {
    emailNewsletterBlocksPlainText,
    type EmailNewsletterBlock,
    type EmailNewsletterDocument,
} from "@urm/email/newsletter-content"
import {
    RichTextEditor,
    type LinkSuggestion,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import {
    content_email_draft_href,
    content_email_new_href,
} from "../../content/route.ts"
import { newsletterHref as newsletter_delivery_href } from "../platform/route.ts"
import { bookmark_url_field_view } from "../../content/bookmarks/bookmark-url-field.view.ts"
import type { Model } from "./newsletter.model.ts"
import { has_unsaved_changes } from "./newsletter.update.ts"
import type { Message } from "./newsletter.message.ts"
import {
    CancelledNewsletterSubscriberSend,
    AddedNewsletterGalleryImage,
    AddedNewsletterBlock,
    ChangedNewsletterBlockField,
    ChangedNewsletterBlockImage,
    ChangedNewsletterTemplateMetadata,
    ClickedDeleteNewsletterDraft,
    ClickedSendNewsletterSubscribers,
    ClickedSendNewsletterTest,
    GotNewsletterRichTextEditorMessage,
    ClosedNewsletterImagePicker,
    RequestedNewsletterImageUpload,
    SelectedNewsletterMediaImage,
    MovedNewsletterBlock,
    MovedNewsletterGalleryImage,
    RemovedNewsletterBlock,
    RemovedNewsletterGalleryImage,
    SelectedNewsletterDraftChanged,
    SubmittedNewsletterDraft,
    SubmittedNewsletterTemplate,
    ToggledNewsletterEditing,
    UpdatedNewsletterDraft,
    UpdatedNewsletterTestRecipient,
} from "./newsletter.message.ts"

const input_classes =
    "h-10 w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"

const inline_input_classes =
    "min-h-12 w-full min-w-0 max-w-full resize-y rounded border border-current/20 bg-transparent px-2 py-1 leading-normal outline-none hover:border-current/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50 [field-sizing:content]"

type MediaImage = Readonly<{ src: string; url: string; alt: string }>

type NewsletterDraftField =
    | "name"
    | "subject"
    | "headline"
    | "body_text"
    | "cta_url"
    | "cta_label"
    | "list_key"

const optional_text = (value: string): string | undefined => {
    const trimmed = value.trim()

    return trimmed.length === 0 ? undefined : trimmed
}

const preview_image_src = (src: string, origin: string): string =>
    src.startsWith("/api/uploads/") && origin !== "" ? `${origin}${src}` : src

const preview_block_document = (
    document: EmailNewsletterDocument,
    origin: string
): EmailNewsletterDocument => ({
    ...document,
    blocks: document.blocks.map((block) => {
        if (block.type === "rich_text")
            return {
                ...block,
                document: {
                    ...block.document,
                    children: block.document.children.map((node) =>
                        node.type === "image"
                            ? {
                                  ...node,
                                  src: preview_image_src(node.src, origin),
                              }
                            : node
                    ),
                },
            }
        if (block.type === "article_card")
            return {
                ...block,
                image: {
                    ...block.image,
                    src: preview_image_src(block.image.src, origin),
                },
            }
        if (block.type === "gallery")
            return {
                ...block,
                images: block.images.map((image) => ({
                    ...image,
                    src: preview_image_src(image.src, origin),
                })),
            }
        return block
    }),
})

export const preview_email = (model: Model, origin = "") => {
    const draft = model.draft
    const cta_url = optional_text(draft.cta_url)
    const cta_label = optional_text(draft.cta_label)
    const body_text = emailNewsletterBlocksPlainText(model.block_document)
    const populated_body_text = optional_text(body_text)
    const has_image = model.block_document.blocks.some((block) =>
        block.type === "rich_text"
            ? block.document.children.some(
                  (node) => node.type === "image" && node.src.trim() !== ""
              )
            : block.type === "article_card"
              ? block.image.src.trim() !== ""
              : block.type === "gallery"
                ? block.images.some((image) => image.src.trim() !== "")
                : false
    )

    return newsletterBasicTemplate.render({
        theme: publication_email_theme(model.publication_theme),
        to: "subscriber@example.com",
        subject: optional_text(draft.subject) ?? "Newsletter subject",
        headline: optional_text(draft.headline) ?? "Newsletter headline",
        body_text:
            populated_body_text ??
            "Write the newsletter body to preview the email copy.",
        ...(populated_body_text === undefined && !has_image
            ? {}
            : {
                  block_document: preview_block_document(
                      model.block_document,
                      origin
                  ),
              }),
        ...(cta_url === undefined ? {} : { cta_url }),
        ...(cta_label === undefined ? {} : { cta_label }),
    })
}

const field_view = (
    label: string,
    field: NewsletterDraftField,
    value: string,
    placeholder: string,
    h: HtmlBuilder<Message>,
    required = false,
    inline = false
): Html =>
    h.label(
        [
            h.For(`newsletter-${field}`),
            h.Class("grid gap-2 text-sm font-medium"),
        ],
        [
            h.span([], [required ? `${label} *` : label]),
            h.input([
                h.Id(`newsletter-${field}`),
                h.Name(field),
                h.Type(field === "cta_url" ? "url" : "text"),
                h.Value(value),
                h.Required(required),
                h.Placeholder(placeholder),
                h.OnInput((next_value) =>
                    UpdatedNewsletterDraft({ field, value: next_value })
                ),
                h.Class(inline ? inline_input_classes : input_classes),
                ...(field === "headline"
                    ? [
                          h.Style({
                              fontSize: "30px",
                              fontWeight: "700",
                              lineHeight: "1.1",
                          }),
                      ]
                    : field === "cta_label" && inline
                      ? [
                            h.Style({
                                background: "var(--email-primary)",
                                color: "var(--email-primary-foreground)",
                                borderRadius: "var(--email-button-radius)",
                                fontWeight: "700",
                                textAlign: "center",
                            }),
                        ]
                      : []),
            ]),
        ]
    )

const template_field_view = (
    id: string,
    label: string,
    field: "name" | "description" | "tags",
    value: string,
    maxlength: number,
    h: HtmlBuilder<Message>,
    required = false
): Html =>
    h.label(
        [h.For(id), h.Class("grid gap-1 text-sm font-medium")],
        [
            h.span([], [required ? `${label} *` : label]),
            h.input([
                h.Id(id),
                h.Name(field),
                h.Type("text"),
                h.Value(value),
                h.Maxlength(maxlength),
                h.Required(required),
                h.OnInput((next_value) =>
                    ChangedNewsletterTemplateMetadata({
                        field,
                        value: next_value,
                    })
                ),
                h.Class(input_classes),
            ]),
        ]
    )

const template_form_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("mt-6 grid gap-4 border-t border-border pt-6")],
        [
            h.div(
                [h.Class("grid gap-1")],
                [
                    h.h3(
                        [h.Class("text-lg font-semibold")],
                        ["Save as template"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Reuse this newsletter content across the organization. Lists and delivery settings are not included.",
                        ]
                    ),
                ]
            ),
            h.form(
                [
                    h.Class("grid gap-4 sm:grid-cols-3"),
                    h.OnSubmit(SubmittedNewsletterTemplate()),
                ],
                [
                    template_field_view(
                        "newsletter-template-name",
                        "Template name",
                        "name",
                        model.templateName,
                        160,
                        h,
                        true
                    ),
                    template_field_view(
                        "newsletter-template-description",
                        "Description",
                        "description",
                        model.templateDescription,
                        500,
                        h
                    ),
                    template_field_view(
                        "newsletter-template-tags",
                        "Tags (comma-separated)",
                        "tags",
                        model.templateTags,
                        500,
                        h
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(model.templateSaveStatus === "saving"),
                            h.Class(
                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:var(--shadow-control)] sm:col-start-3"
                            ),
                        ],
                        [
                            model.templateSaveStatus === "saving"
                                ? "Saving…"
                                : "Save as template",
                        ]
                    ),
                ]
            ),
        ]
    )

type NewsletterBlockField =
    | "eyebrow"
    | "heading"
    | "body"
    | "label"
    | "url"
    | "quote"
    | "attribution"
    | "kicker"
    | "summary"
    | "link_label"

const block_field_view = (
    block_id: string,
    label: string,
    field: NewsletterBlockField,
    value: string,
    h: HtmlBuilder<Message>,
    multiline = false
): Html => {
    const id = `${block_id}-${field}`
    const attributes = [
        h.Id(id),
        h.Name(field),
        h.Value(value),
        h.OnInput((next_value) =>
            ChangedNewsletterBlockField({
                block_id,
                field,
                value: next_value,
            })
        ),
        h.Class(field === "url" ? input_classes : inline_input_classes),
        h.Style({
            fontSize:
                field === "heading"
                    ? "24px"
                    : field === "quote"
                      ? "20px"
                      : "16px",
            fontWeight: [
                "heading",
                "label",
                "link_label",
                "eyebrow",
                "kicker",
            ].includes(field)
                ? "700"
                : "400",
            ...(field === "label"
                ? {
                      background: "var(--email-primary)",
                      color: "var(--email-primary-foreground)",
                      borderRadius: "var(--email-button-radius)",
                      textAlign: "center",
                  }
                : {}),
            ...(field === "link_label"
                ? { color: "var(--email-link)", textDecoration: "underline" }
                : {}),
        }),
    ]

    return h.label(
        [h.For(id), h.Class("grid gap-1 text-xs font-medium")],
        [
            h.span([], [label]),
            multiline || field === "heading" || field === "quote"
                ? h.textarea([...attributes, h.Rows(multiline ? 3 : 2)])
                : h.input([
                      ...attributes,
                      h.Type(field === "url" ? "url" : "text"),
                  ]),
        ]
    )
}

const image_preview_view = (
    src: string,
    alt: string,
    h: HtmlBuilder<Message>
): Html => {
    const safe_src = src.startsWith("/api/uploads/")
        ? src
        : safe_external_email_image_src(src)
    return safe_src === undefined
        ? h.p(
              [
                  h.Class(
                      "grid min-h-32 place-items-center rounded border border-dashed border-current/30 p-4 text-sm"
                  ),
              ],
              ["Choose a Media Library image or add an HTTPS image URL below."]
          )
        : h.img([
              h.Src(safe_src),
              h.Alt(alt),
              h.Class("block h-auto w-full rounded"),
          ])
}

const block_image_field_view = (
    block_id: string,
    image_id: string,
    label: string,
    field: "src" | "alt",
    value: string,
    h: HtmlBuilder<Message>
): Html => {
    const id = `${block_id}-${image_id}-${field}`
    return h.label(
        [h.For(id), h.Class("grid gap-2 text-sm font-medium text-foreground")],
        [
            h.span([], [label]),
            h.input([
                h.Id(id),
                h.Name(field),
                h.Type(field === "src" ? "url" : "text"),
                ...(field === "src" ? [h.List("newsletter-media-images")] : []),
                ...(field === "src"
                    ? [h.AriaDescribedBy("newsletter-media-help")]
                    : []),
                h.Value(value),
                h.OnInput((next_value) =>
                    ChangedNewsletterBlockImage({
                        block_id,
                        image_id,
                        field,
                        value: next_value,
                    })
                ),
                h.Class(input_classes),
            ]),
        ]
    )
}

const block_title = (block: EmailNewsletterBlock): string => {
    switch (block.type) {
        case "rich_text":
            return "Rich text"
        case "hero":
            return "Hero"
        case "call_to_action":
            return "Call to action"
        case "testimonial":
            return "Testimonial"
        case "article_card":
            return "Article card"
        case "gallery":
            return "Gallery"
    }
}

const block_fields_view = (
    block: EmailNewsletterBlock,
    model: Model,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => {
    switch (block.type) {
        case "rich_text":
            return [
                RichTextEditor<Message>(
                    {
                        id: "newsletter-body-editor",
                        model: model.editor,
                        toParentMessage: (message) =>
                            GotNewsletterRichTextEditorMessage({ message }),
                        label: "Body content",
                        description:
                            "Type / for rich-text blocks. Add links from saved bookmarks or enter a URL.",
                        placeholder: "Write the newsletter body…",
                        isDisabled: model.saving,
                        linkSuggestions: link_suggestions,
                    },
                    h
                ),
            ]
        case "hero":
            return [
                block_field_view(
                    block.block_id,
                    "Eyebrow",
                    "eyebrow",
                    block.eyebrow,
                    h
                ),
                block_field_view(
                    block.block_id,
                    "Heading",
                    "heading",
                    block.heading,
                    h
                ),
                block_field_view(
                    block.block_id,
                    "Body",
                    "body",
                    block.body,
                    h,
                    true
                ),
            ]
        case "call_to_action":
            return [
                block_field_view(
                    block.block_id,
                    "Heading",
                    "heading",
                    block.heading,
                    h
                ),
                block_field_view(
                    block.block_id,
                    "Body",
                    "body",
                    block.body,
                    h,
                    true
                ),
                h.div(
                    [h.Class("grid gap-4 md:grid-cols-2")],
                    [
                        block_field_view(
                            block.block_id,
                            "Button label",
                            "label",
                            block.label,
                            h
                        ),
                        bookmark_url_field_view(
                            {
                                id: `${block.block_id}-url`,
                                label: "Button URL",
                                value: block.url,
                                suggestions: link_suggestions,
                                on_input: (value) =>
                                    ChangedNewsletterBlockField({
                                        block_id: block.block_id,
                                        field: "url",
                                        value,
                                    }),
                            },
                            h
                        ),
                    ]
                ),
            ]
        case "testimonial":
            return [
                block_field_view(
                    block.block_id,
                    "Quote",
                    "quote",
                    block.quote,
                    h,
                    true
                ),
                block_field_view(
                    block.block_id,
                    "Attribution",
                    "attribution",
                    block.attribution,
                    h
                ),
            ]
        case "article_card":
            return [
                image_preview_view(block.image.src, block.image.alt, h),
                h.p(
                    [h.Class("text-sm text-muted-foreground")],
                    [
                        "Choose a Media Library image or use a durable HTTPS URL. Leave alternative text empty only when the image is decorative.",
                    ]
                ),
                h.div(
                    [h.Class("grid gap-4 md:grid-cols-2")],
                    [
                        block_image_field_view(
                            block.block_id,
                            block.image.image_id,
                            "Image URL",
                            "src",
                            block.image.src,
                            h
                        ),
                        block_image_field_view(
                            block.block_id,
                            block.image.image_id,
                            "Image alternative text",
                            "alt",
                            block.image.alt,
                            h
                        ),
                    ]
                ),
                block_field_view(
                    block.block_id,
                    "Kicker",
                    "kicker",
                    block.kicker,
                    h
                ),
                block_field_view(
                    block.block_id,
                    "Heading",
                    "heading",
                    block.heading,
                    h
                ),
                block_field_view(
                    block.block_id,
                    "Summary",
                    "summary",
                    block.summary,
                    h,
                    true
                ),
                h.div(
                    [h.Class("grid gap-4 md:grid-cols-2")],
                    [
                        block_field_view(
                            block.block_id,
                            "Link label",
                            "link_label",
                            block.link_label,
                            h
                        ),
                        bookmark_url_field_view(
                            {
                                id: `${block.block_id}-url`,
                                label: "Article URL",
                                value: block.url,
                                suggestions: link_suggestions,
                                on_input: (value) =>
                                    ChangedNewsletterBlockField({
                                        block_id: block.block_id,
                                        field: "url",
                                        value,
                                    }),
                            },
                            h
                        ),
                    ]
                ),
            ]
        case "gallery":
            return [
                h.p(
                    [h.Class("text-sm text-muted-foreground")],
                    [
                        "Choose Media Library images or use durable HTTPS URLs. Leave alternative text empty only when an image is decorative.",
                    ]
                ),
                ...block.images.map((image, image_index) =>
                    h.keyed("div")(
                        image.image_id,
                        [
                            h.Class(
                                "grid min-w-0 gap-3 rounded border border-current/20 p-3"
                            ),
                        ],
                        [
                            image_preview_view(image.src, image.alt, h),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap items-center justify-between gap-2"
                                    ),
                                ],
                                [
                                    h.h4(
                                        [h.Class("text-sm font-semibold")],
                                        [`Image ${image_index + 1}`]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        [
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.OnClick(
                                                        MovedNewsletterGalleryImage(
                                                            {
                                                                block_id:
                                                                    block.block_id,
                                                                image_id:
                                                                    image.image_id,
                                                                direction: "up",
                                                            }
                                                        )
                                                    ),
                                                    h.Disabled(
                                                        image_index === 0 ||
                                                            model.saving
                                                    ),
                                                    h.AriaLabel(
                                                        `Move gallery image ${image_index + 1} up`
                                                    ),
                                                    h.Class(
                                                        "inline-flex h-10 items-center rounded-[var(--radius-control)] border border-border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                                                    ),
                                                ],
                                                ["Move up"]
                                            ),
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.OnClick(
                                                        MovedNewsletterGalleryImage(
                                                            {
                                                                block_id:
                                                                    block.block_id,
                                                                image_id:
                                                                    image.image_id,
                                                                direction:
                                                                    "down",
                                                            }
                                                        )
                                                    ),
                                                    h.Disabled(
                                                        image_index ===
                                                            block.images
                                                                .length -
                                                                1 ||
                                                            model.saving
                                                    ),
                                                    h.AriaLabel(
                                                        `Move gallery image ${image_index + 1} down`
                                                    ),
                                                    h.Class(
                                                        "inline-flex h-10 items-center rounded-[var(--radius-control)] border border-border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                                                    ),
                                                ],
                                                ["Move down"]
                                            ),
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.OnClick(
                                                        RemovedNewsletterGalleryImage(
                                                            {
                                                                block_id:
                                                                    block.block_id,
                                                                image_id:
                                                                    image.image_id,
                                                            }
                                                        )
                                                    ),
                                                    h.Disabled(model.saving),
                                                    h.AriaLabel(
                                                        `Remove gallery image ${image_index + 1}`
                                                    ),
                                                    h.Class(
                                                        "inline-flex h-10 items-center rounded-[var(--radius-control)] border border-border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                                                    ),
                                                ],
                                                ["Remove"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            block_image_field_view(
                                block.block_id,
                                image.image_id,
                                "Image URL",
                                "src",
                                image.src,
                                h
                            ),
                            block_image_field_view(
                                block.block_id,
                                image.image_id,
                                "Alternative text",
                                "alt",
                                image.alt,
                                h
                            ),
                        ]
                    )
                ),
                h.button(
                    [
                        h.Type("button"),
                        h.OnClick(
                            AddedNewsletterGalleryImage({
                                block_id: block.block_id,
                            })
                        ),
                        h.Disabled(block.images.length >= 6 || model.saving),
                        h.Class(
                            "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                        ),
                    ],
                    ["Add image"]
                ),
            ]
    }
}

const block_editor_view = (
    block: EmailNewsletterBlock,
    index: number,
    model: Model,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    h: HtmlBuilder<Message>
): Html => {
    const title = block_title(block)
    const email_theme = publication_email_theme(model.publication_theme)
    const control_classes =
        "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"

    return h.keyed("li")(
        block.block_id,
        [h.Class("grid min-w-0 gap-4")],
        [
            h.div(
                [h.Class("flex flex-wrap items-center justify-between gap-3")],
                [
                    h.h3([h.Class("font-semibold")], [title]),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        MovedNewsletterBlock({
                                            block_id: block.block_id,
                                            direction: "up",
                                        })
                                    ),
                                    h.Disabled(index === 0 || model.saving),
                                    h.AriaLabel(`Move ${title} block up`),
                                    h.Class(control_classes),
                                ],
                                ["Move up"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        MovedNewsletterBlock({
                                            block_id: block.block_id,
                                            direction: "down",
                                        })
                                    ),
                                    h.Disabled(
                                        index ===
                                            model.block_document.blocks.length -
                                                1 || model.saving
                                    ),
                                    h.AriaLabel(`Move ${title} block down`),
                                    h.Class(control_classes),
                                ],
                                ["Move down"]
                            ),
                            block.type === "rich_text"
                                ? h.span(
                                      [
                                          h.Class(
                                              "inline-flex h-10 items-center px-2 text-xs text-muted-foreground"
                                          ),
                                      ],
                                      ["Required block"]
                                  )
                                : h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(
                                              RemovedNewsletterBlock({
                                                  block_id: block.block_id,
                                              })
                                          ),
                                          h.Disabled(model.saving),
                                          h.AriaLabel(`Remove ${title} block`),
                                          h.Class(control_classes),
                                      ],
                                      ["Remove"]
                                  ),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class("grid min-w-0 gap-4"),
                    h.Style({
                        padding: block.type === "rich_text" ? "0" : "24px",
                        borderRadius: `${email_theme.content_border_radius}px`,
                        background:
                            block.type === "hero" ||
                            block.type === "testimonial"
                                ? email_theme.muted_background_color
                                : email_theme.content_background_color,
                        border:
                            block.type === "call_to_action" ||
                            block.type === "article_card"
                                ? `2px solid ${email_theme.border_color}`
                                : "none",
                        textAlign:
                            block.type === "testimonial" ? "center" : "left",
                    }),
                ],
                block_fields_view(block, model, link_suggestions, h)
            ),
        ]
    )
}

const email_blocks_view = (
    model: Model,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    media_images: ReadonlyArray<MediaImage>,
    h: HtmlBuilder<Message>
): Html =>
    h.fieldset(
        [h.Class("grid min-w-0 gap-6"), h.Disabled(model.saving)],
        [
            h.legend([h.Class("sr-only")], ["Email blocks"]),
            h.ol(
                [h.Class("grid gap-4")],
                model.block_document.blocks.map((block, index) =>
                    block_editor_view(block, index, model, link_suggestions, h)
                )
            ),
            ...(model.image_picker_open
                ? [
                      h.section(
                          [
                              h.Class(
                                  "fixed inset-x-4 top-1/2 z-50 grid max-h-[80vh] -translate-y-1/2 gap-3 overflow-y-auto rounded-[var(--radius-surface)] border border-border bg-card p-4 text-card-foreground shadow-xl sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2"
                              ),
                              h.AriaLabel("Choose newsletter image"),
                          ],
                          [
                              h.div(
                                  [
                                      h.Class(
                                          "flex flex-wrap items-center justify-between gap-2"
                                      ),
                                  ],
                                  [
                                      h.h3(
                                          [h.Class("text-sm font-semibold")],
                                          ["Add image"]
                                      ),
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(
                                                  ClosedNewsletterImagePicker()
                                              ),
                                              h.Class(
                                                  "min-h-10 rounded px-3 text-sm underline"
                                              ),
                                          ],
                                          ["Cancel"]
                                      ),
                                  ]
                              ),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.OnClick(
                                          RequestedNewsletterImageUpload()
                                      ),
                                      h.Class(
                                          "min-h-11 w-fit rounded-[var(--radius-control)] border border-border bg-background px-4 text-sm font-medium"
                                      ),
                                  ],
                                  ["Upload new image"]
                              ),
                              h.p(
                                  [h.Class("text-sm font-medium")],
                                  ["Media Library"]
                              ),
                              media_images.length === 0
                                  ? h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        ["No images in this workspace."]
                                    )
                                  : h.div(
                                        [
                                            h.Class(
                                                "grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3"
                                            ),
                                        ],
                                        media_images.map((image) =>
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.OnClick(
                                                        SelectedNewsletterMediaImage(
                                                            image
                                                        )
                                                    ),
                                                    h.AriaLabel(
                                                        `Insert ${image.alt || "Media image"}`
                                                    ),
                                                    h.Class(
                                                        "grid gap-1 rounded-[var(--radius-control)] border border-border bg-background p-2 text-left text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                                                    ),
                                                ],
                                                [
                                                    h.img([
                                                        h.Src(image.url),
                                                        h.Alt(""),
                                                        h.Class(
                                                            "aspect-square w-full rounded object-cover"
                                                        ),
                                                    ]),
                                                    h.span(
                                                        [h.Class("truncate")],
                                                        [
                                                            image.alt ||
                                                                "Media image",
                                                        ]
                                                    ),
                                                ]
                                            )
                                        )
                                    ),
                          ]
                      ),
                  ]
                : []),
            h.div(
                [h.Class("flex flex-wrap items-center gap-2")],
                [
                    h.span(
                        [h.Class("mr-1 text-sm font-medium")],
                        ["Add block"]
                    ),
                    ...[
                        ["hero", "Hero"],
                        ["call_to_action", "Call to action"],
                        ["testimonial", "Testimonial"],
                    ].map(([kind, label]) =>
                        h.button(
                            [
                                h.Type("button"),
                                h.OnClick(
                                    kind === "hero"
                                        ? AddedNewsletterBlock({ kind: "hero" })
                                        : kind === "call_to_action"
                                          ? AddedNewsletterBlock({
                                                kind: "call_to_action",
                                            })
                                          : AddedNewsletterBlock({
                                                kind: "testimonial",
                                            })
                                ),
                                h.Disabled(model.saving),
                                h.Class(
                                    "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                                ),
                            ],
                            [label ?? "Block"]
                        )
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                AddedNewsletterBlock({ kind: "article_card" })
                            ),
                            h.Disabled(model.saving),
                            h.Class(
                                "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                            ),
                        ],
                        ["Article card"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                AddedNewsletterBlock({ kind: "gallery" })
                            ),
                            h.Disabled(model.saving),
                            h.Class(
                                "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                            ),
                        ],
                        ["Gallery"]
                    ),
                ]
            ),
        ]
    )

const editor_view = (
    model: Model,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    media_images: ReadonlyArray<MediaImage>,
    h: HtmlBuilder<Message>
): Html => {
    const email_theme = publication_email_theme(model.publication_theme)
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.h2([h.Class("text-xl font-semibold")], ["Edit email"]),
            h.p(
                [h.Class("mt-1 text-sm text-muted-foreground")],
                [
                    "Edit the message below. Turn off Edit to check the inbox preview.",
                ]
            ),
            h.form(
                [
                    h.Class("mt-6 grid gap-4"),
                    h.OnSubmit(SubmittedNewsletterDraft()),
                ],
                [
                    h.fieldset(
                        [
                            h.Disabled(model.saving),
                            h.Class("grid gap-4 sm:grid-cols-2"),
                        ],
                        [
                            h.legend([h.Class("sr-only")], ["Draft settings"]),
                            field_view(
                                "Draft name",
                                "name",
                                model.draft.name,
                                "June update",
                                h,
                                true
                            ),
                            field_view(
                                "List key",
                                "list_key",
                                model.draft.list_key,
                                "newsletter",
                                h,
                                true
                            ),
                        ]
                    ),
                    h.fieldset(
                        [h.Disabled(model.saving), h.Class("grid gap-4")],
                        [
                            h.legend([h.Class("sr-only")], ["Message"]),
                            field_view(
                                "Subject",
                                "subject",
                                model.draft.subject,
                                "URM update",
                                h
                            ),
                            h.div(
                                [
                                    h.Class("min-w-0 rounded p-3 sm:p-6"),
                                    h.Style({
                                        background:
                                            email_theme.background_color,
                                    }),
                                ],
                                [
                                    h.div(
                                        [
                                            h.AriaLabel("Email editing canvas"),
                                            h.Class(
                                                "mx-auto grid w-full min-w-0 max-w-[560px] gap-6 p-4 sm:p-8"
                                            ),
                                            h.Style({
                                                colorScheme:
                                                    model.publication_theme
                                                        ?.site_theme
                                                        .appearance === "dark"
                                                        ? "dark"
                                                        : "light",
                                                "--email-primary":
                                                    email_theme.primary_color,
                                                "--email-primary-foreground":
                                                    email_theme.primary_text_color,
                                                "--email-button-radius": `${email_theme.button_border_radius}px`,
                                                "--email-link":
                                                    email_theme.link_color,
                                                "--background":
                                                    email_theme.content_background_color,
                                                "--foreground":
                                                    email_theme.text_color,
                                                "--card":
                                                    email_theme.content_background_color,
                                                "--card-foreground":
                                                    email_theme.text_color,
                                                "--muted":
                                                    email_theme.muted_background_color,
                                                "--muted-foreground":
                                                    email_theme.muted_text_color,
                                                "--accent":
                                                    email_theme.muted_background_color,
                                                "--accent-foreground":
                                                    email_theme.text_color,
                                                "--border":
                                                    email_theme.border_color,
                                                "--input":
                                                    email_theme.border_color,
                                                "--ring":
                                                    email_theme.link_color,
                                                "--primary":
                                                    email_theme.primary_color,
                                                "--primary-foreground":
                                                    email_theme.primary_text_color,
                                                color: email_theme.text_color,
                                                background:
                                                    email_theme.content_background_color,
                                                fontFamily:
                                                    email_theme.font_family,
                                                border: `2px solid ${email_theme.border_color}`,
                                                borderRadius: `${email_theme.content_border_radius}px`,
                                            }),
                                        ],
                                        [
                                            h.p(
                                                [
                                                    h.Style({
                                                        color: email_theme.muted_text_color,
                                                        fontSize: "12px",
                                                        fontWeight: "700",
                                                        letterSpacing: "0.08em",
                                                        textTransform:
                                                            "uppercase",
                                                    }),
                                                ],
                                                [email_theme.brand_name]
                                            ),
                                            field_view(
                                                "Headline",
                                                "headline",
                                                model.draft.headline,
                                                "Latest from URM",
                                                h,
                                                false,
                                                true
                                            ),
                                            email_blocks_view(
                                                model,
                                                link_suggestions,
                                                media_images,
                                                h
                                            ),
                                            h.div(
                                                [h.Class("grid gap-4")],
                                                [
                                                    field_view(
                                                        "Footer button label",
                                                        "cta_label",
                                                        model.draft.cta_label,
                                                        "Read update",
                                                        h,
                                                        false,
                                                        true
                                                    ),
                                                    bookmark_url_field_view(
                                                        {
                                                            id: "newsletter-cta_url",
                                                            label: "Footer button URL",
                                                            value: model.draft
                                                                .cta_url,
                                                            suggestions:
                                                                link_suggestions,
                                                            on_input: (value) =>
                                                                UpdatedNewsletterDraft(
                                                                    {
                                                                        field: "cta_url",
                                                                        value,
                                                                    }
                                                                ),
                                                        },
                                                        h
                                                    ),
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
                                "flex flex-wrap items-center justify-between gap-3 pt-2"
                            ),
                        ],
                        [
                            model.selectedDraftId === ""
                                ? h.span(
                                      [
                                          h.Class(
                                              "text-xs text-muted-foreground"
                                          ),
                                      ],
                                      ["New unsaved draft"]
                                  )
                                : h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(
                                              ClickedDeleteNewsletterDraft()
                                          ),
                                          h.Disabled(model.saving),
                                          h.Class(
                                              "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-destructive/30 bg-destructive/10 px-4 text-sm font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 [box-shadow:var(--shadow-control)]"
                                          ),
                                      ],
                                      ["Delete"]
                                  ),
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Disabled(model.saving || model.uploading),
                                    h.Class(
                                        "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                [
                                    model.saving
                                        ? "Saving..."
                                        : model.uploading
                                          ? "Uploading image…"
                                          : "Save draft",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            template_form_view(model, h),
            ...(model.selectedDraftId === ""
                ? []
                : [
                      h.button(
                          [
                              h.Type("button"),
                              h.Disabled(
                                  model.saving ||
                                      model.uploading ||
                                      model.sending !== null
                              ),
                              h.OnClick(
                                  SelectedNewsletterDraftChanged({
                                      draftId: model.selectedDraftId,
                                  })
                              ),
                              h.Class(
                                  "inline-flex min-h-11 items-center text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                              ),
                          ],
                          ["Discard edits / reload saved"]
                      ),
                  ]),
        ]
    )
}

/**
 * Displays authored email HTML in an iframe with an empty sandbox permission set.
 * Srcdoc would otherwise inherit the administration page's origin. Keep scripts,
 * same-origin access and top-level navigation disabled even when links have
 * passed validation, since stored content remains an untrusted input.
 */
const preview_view = (
    model: Model,
    h: HtmlBuilder<Message>,
    origin = globalThis.location?.origin ?? ""
): Html => {
    const email = preview_email(model, origin)

    return h.section(
        [
            h.Class(
                "flex min-h-0 flex-col gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold tracking-tight")],
                        [model.draft.name.trim() || "Untitled newsletter"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Rendered from the production newsletter template."]
                    ),
                ]
            ),
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
                        ["Subject"]
                    ),
                    h.div(
                        [h.Class("mt-2 text-base font-medium")],
                        [email.subject]
                    ),
                ]
            ),
            h.iframe(
                [
                    h.Srcdoc(email.html ?? ""),
                    h.Sandbox(""),
                    h.Class(
                        "h-[32rem] w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-white"
                    ),
                    h.AriaLabel("Email visual preview"),
                ],
                []
            ),
        ]
    )
}

const recipients_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.aside(
        [
            h.Class(
                "h-fit rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.h2([h.Class("text-lg font-semibold")], ["Recipients"]),
            h.p(
                [h.Class("mt-1 text-sm text-muted-foreground")],
                [
                    `${model.recipients.length} subscribed contact${model.recipients.length === 1 ? "" : "s"} on “${model.draft.list_key.trim() || "newsletter"}”.`,
                ]
            ),
            model.recipients.length === 0
                ? h.div(
                      [
                          h.Class(
                              "mt-4 rounded-[var(--radius-surface)] border border-dashed border-border p-4 text-sm text-muted-foreground"
                          ),
                      ],
                      ["No eligible recipients."]
                  )
                : h.div(
                      [h.Class("mt-4 grid gap-2")],
                      model.recipients
                          .slice(0, 8)
                          .map((recipient) =>
                              h.keyed("div")(
                                  recipient.contact_id,
                                  [
                                      h.Class(
                                          "min-w-0 rounded-[var(--radius-control)] border border-border bg-background px-3 py-2"
                                      ),
                                  ],
                                  [
                                      h.div(
                                          [
                                              h.Class(
                                                  "truncate text-sm font-medium"
                                              ),
                                          ],
                                          [recipient.name]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "truncate text-xs text-muted-foreground"
                                              ),
                                          ],
                                          [recipient.email]
                                      ),
                                  ]
                              )
                          )
                  ),
            ...(model.editing
                ? []
                : [
                      h.p(
                          [h.Class("mt-4 text-xs text-muted-foreground")],
                          [
                              "Sending is development-only until desktop authentication is connected.",
                          ]
                      ),
                      h.div(
                          [
                              h.Class(
                                  "mt-5 grid gap-3 border-t border-border pt-5"
                              ),
                          ],
                          [
                              h.h3(
                                  [h.Class("text-sm font-semibold")],
                                  ["Send a test"]
                              ),
                              h.label(
                                  [
                                      h.For("newsletter-test-name"),
                                      h.Class("grid gap-2 text-sm font-medium"),
                                  ],
                                  [
                                      h.span([], ["Recipient name"]),
                                      h.input([
                                          h.Id("newsletter-test-name"),
                                          h.Name("test_recipient_name"),
                                          h.Type("text"),
                                          h.Value(model.testRecipientName),
                                          h.OnInput((value) =>
                                              UpdatedNewsletterTestRecipient({
                                                  field: "name",
                                                  value,
                                              })
                                          ),
                                          h.Class(input_classes),
                                      ]),
                                  ]
                              ),
                              h.label(
                                  [
                                      h.For("newsletter-test-email"),
                                      h.Class("grid gap-2 text-sm font-medium"),
                                  ],
                                  [
                                      h.span([], ["Recipient email"]),
                                      h.input([
                                          h.Id("newsletter-test-email"),
                                          h.Name("test_recipient_email"),
                                          h.Type("email"),
                                          h.Value(model.testRecipientEmail),
                                          h.OnInput((value) =>
                                              UpdatedNewsletterTestRecipient({
                                                  field: "email",
                                                  value,
                                              })
                                          ),
                                          h.Class(input_classes),
                                      ]),
                                  ]
                              ),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.OnClick(ClickedSendNewsletterTest()),
                                      h.Disabled(
                                          model.sending !== null ||
                                              model.saving ||
                                              model.uploading ||
                                              has_unsaved_changes(model)
                                      ),
                                      h.Class(
                                          "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50 [box-shadow:var(--shadow-control)]"
                                      ),
                                  ],
                                  [
                                      model.sending === "test"
                                          ? "Sending..."
                                          : "Send test",
                                  ]
                              ),
                              h.div(
                                  [h.Class("mt-2 border-t border-border pt-4")],
                                  [
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(
                                                  ClickedSendNewsletterSubscribers()
                                              ),
                                              h.Disabled(
                                                  model.sending !== null ||
                                                      model.saving ||
                                                      model.uploading ||
                                                      has_unsaved_changes(model)
                                              ),
                                              h.Class(
                                                  model.confirmingSubscriberSend
                                                      ? "inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] border border-destructive/30 bg-destructive px-4 text-sm font-medium text-destructive-foreground disabled:opacity-50"
                                                      : "inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 [box-shadow:var(--shadow-primary)]"
                                              ),
                                          ],
                                          [
                                              model.sending === "subscribers"
                                                  ? "Sending..."
                                                  : model.confirmingSubscriberSend
                                                    ? `Confirm send to ${model.recipients.length}`
                                                    : `Send to ${model.recipients.length} subscribers`,
                                          ]
                                      ),
                                      ...(model.confirmingSubscriberSend
                                          ? [
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.OnClick(
                                                            CancelledNewsletterSubscriberSend()
                                                        ),
                                                        h.Class(
                                                            "mt-2 inline-flex h-9 w-full items-center justify-center rounded-[var(--radius-control)] text-sm text-muted-foreground hover:bg-accent"
                                                        ),
                                                    ],
                                                    ["Cancel"]
                                                ),
                                            ]
                                          : []),
                                  ]
                              ),
                          ]
                      ),
                  ]),
        ]
    )

const send_history_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.h2([h.Class("text-lg font-semibold")], ["Send history"]),
            model.sends.length === 0
                ? h.p(
                      [h.Class("mt-2 text-sm text-muted-foreground")],
                      ["No newsletter sends yet."]
                  )
                : h.div(
                      [h.Class("mt-4 grid gap-2")],
                      model.sends
                          .slice(0, 12)
                          .map((send) =>
                              h.keyed("div")(
                                  send.id,
                                  [
                                      h.Class(
                                          "grid gap-2 rounded-[var(--radius-control)] border border-border bg-background px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                                      ),
                                  ],
                                  [
                                      h.div(
                                          [h.Class("min-w-0")],
                                          [
                                              h.div(
                                                  [
                                                      h.Class(
                                                          "font-medium capitalize"
                                                      ),
                                                  ],
                                                  [
                                                      `${send.audience} · ${send.status}`,
                                                  ]
                                              ),
                                              h.div(
                                                  [
                                                      h.Class(
                                                          "text-xs text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      new Date(
                                                          send.created_at
                                                      ).toLocaleString(),
                                                  ]
                                              ),
                                          ]
                                      ),
                                      h.span(
                                          [h.Class("text-muted-foreground")],
                                          [`${send.accepted_count} accepted`]
                                      ),
                                      h.span(
                                          [
                                              h.Class(
                                                  send.failed_count > 0
                                                      ? "text-destructive"
                                                      : "text-muted-foreground"
                                              ),
                                          ],
                                          [`${send.failed_count} failed`]
                                      ),
                                  ]
                              )
                          )
                  ),
        ]
    )

const secondary_action_classes =
    "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [box-shadow:var(--shadow-control)]"

const delivery_toolbar_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.section(
        [
            h.Class(
                "flex flex-col gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground sm:flex-row sm:items-end sm:justify-between [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h1(
                        [h.Class("text-3xl font-bold tracking-tight")],
                        ["Newsletter"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Select saved content, verify recipients, and manage delivery.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-col gap-3 sm:flex-row sm:items-end")],
                [
                    Ui.Select.view(
                        {
                            id: "newsletter-draft",
                            value: model.selectedDraftId,
                            onChange: (draftId) =>
                                SelectedNewsletterDraftChanged({ draftId }),
                            toView: (attributes) =>
                                h.div(
                                    [h.Class("min-w-48 space-y-1.5")],
                                    [
                                        h.label(
                                            [
                                                ...attributes.label,
                                                h.Class("text-sm font-medium"),
                                            ],
                                            ["Draft"]
                                        ),
                                        h.select(
                                            [
                                                ...attributes.select,
                                                h.Disabled(
                                                    model.drafts.length === 0
                                                ),
                                                h.Class(input_classes),
                                            ],
                                            [
                                                ...(model.drafts.length === 0
                                                    ? [
                                                          h.option(
                                                              [h.Value("")],
                                                              [
                                                                  "No saved drafts",
                                                              ]
                                                          ),
                                                      ]
                                                    : []),
                                                ...model.drafts.map((draft) =>
                                                    h.option(
                                                        [
                                                            h.Key(draft.id),
                                                            h.Value(draft.id),
                                                        ],
                                                        [draft.name]
                                                    )
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                        },
                        h
                    ),
                    h.a(
                        [
                            h.Href(content_email_new_href()),
                            h.Class(secondary_action_classes),
                        ],
                        ["New draft"]
                    ),
                    model.selectedDraftId === ""
                        ? h.span(
                              [h.Class("text-sm text-muted-foreground")],
                              ["Select a draft to edit"]
                          )
                        : h.a(
                              [
                                  h.Href(
                                      content_email_draft_href(
                                          model.selectedDraftId,
                                          true
                                      )
                                  ),
                                  h.Class(secondary_action_classes),
                              ],
                              ["Edit content"]
                          ),
                ]
            ),
        ]
    )

const authoring_toolbar_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.section(
        [
            h.Class(
                "flex flex-col gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground sm:flex-row sm:items-end sm:justify-between [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h1(
                        [h.Class("text-3xl font-bold tracking-tight")],
                        [
                            model.selectedDraftId === ""
                                ? "New email draft"
                                : model.draft.name || "Untitled email draft",
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Author newsletter content here. Recipients and delivery remain in Mail.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap items-center gap-3")],
                [
                    h.a(
                        [
                            h.Href(newsletter_delivery_href()),
                            h.Class(secondary_action_classes),
                        ],
                        ["Open delivery"]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex h-10 items-center gap-3 text-sm font-medium"
                            ),
                        ],
                        [
                            h.span([], ["Edit"]),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Role("switch"),
                                    h.AriaChecked(model.editing),
                                    h.AriaLabel("Edit newsletter draft"),
                                    h.OnClick(ToggledNewsletterEditing()),
                                    h.Class(
                                        model.editing
                                            ? "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-(length:--control-border-width) border-border bg-primary transition-colors [box-shadow:var(--shadow-primary)]"
                                            : "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input transition-colors"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.AriaHidden(true),
                                            h.Class(
                                                model.editing
                                                    ? "pointer-events-none inline-block size-4 translate-x-6 rounded-full bg-background shadow transition-transform"
                                                    : "pointer-events-none inline-block size-4 translate-x-1 rounded-full bg-background shadow transition-transform"
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
        ]
    )

const feedback_view = (
    model: Model,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => [
    ...(has_unsaved_changes(model)
        ? [
              h.p(
                  [h.Class("text-sm text-muted-foreground")],
                  [
                      "Unsaved changes. Save this draft before sending; turning off Edit only changes the preview.",
                  ]
              ),
          ]
        : []),
    ...(model.error === null
        ? []
        : [
              h.div(
                  [
                      h.Role("alert"),
                      h.Class(
                          "rounded-[var(--radius-surface)] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                      ),
                  ],
                  [model.error]
              ),
          ]),
    ...(model.notice === null
        ? []
        : [
              h.div(
                  [
                      h.Role("status"),
                      h.Class(
                          "rounded-[var(--radius-surface)] border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
                      ),
                  ],
                  [model.notice]
              ),
          ]),
]

export const view = Foldkit.Submodel.defineView<Model, Message>(
    (model, h: HtmlBuilder<Message>): Html =>
        h.div(
            [
                h.Class(
                    "h-full min-h-0 overflow-auto bg-background text-foreground"
                ),
            ],
            [
                h.main(
                    [
                        h.Class(
                            "mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-8"
                        ),
                    ],
                    [
                        delivery_toolbar_view(model, h),
                        ...feedback_view(model, h),
                        h.div(
                            [
                                h.Class(
                                    "grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]"
                                ),
                            ],
                            [preview_view(model, h), recipients_view(model, h)]
                        ),
                        send_history_view(model, h),
                    ]
                ),
            ]
        )
)

type AuthoringViewInputs = Readonly<{
    link_suggestions: ReadonlyArray<LinkSuggestion>
    media_images?: ReadonlyArray<
        Readonly<{ src: string; url: string; alt: string }>
    >
    preview_origin?: string
}>

export const authoring_view = Foldkit.Submodel.defineView<
    Model,
    Message,
    AuthoringViewInputs
>(
    (model, inputs, h: HtmlBuilder<Message>): Html =>
        h.main(
            [
                h.Class(
                    "mx-auto flex max-w-7xl flex-col gap-6 bg-background p-4 text-foreground md:p-8"
                ),
            ],
            [
                authoring_toolbar_view(model, h),
                ...(model.editing
                    ? [
                          h.p(
                              [
                                  h.Id("newsletter-media-help"),
                                  h.Class("text-sm text-muted-foreground"),
                              ],
                              [
                                  "Choose a Media Library image, upload a new one, or paste a permanent HTTPS URL. Private uploads are published when the newsletter is sent.",
                              ]
                          ),
                      ]
                    : []),
                h.datalist(
                    [h.Id("newsletter-media-images")],
                    (inputs.media_images ?? []).map((image) =>
                        h.option(
                            [h.Value(image.src)],
                            [image.alt || "Media image"]
                        )
                    )
                ),
                ...feedback_view(model, h),
                model.editing
                    ? editor_view(
                          model,
                          inputs.link_suggestions,
                          inputs.media_images ?? [],
                          h
                      )
                    : preview_view(model, h, inputs.preview_origin),
            ]
        )
)
