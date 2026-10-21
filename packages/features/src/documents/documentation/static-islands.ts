import { Callout, type CalloutProps } from "@urm/ui/foldkit/callout.view.ts"
import { StepsContainer } from "@urm/ui/foldkit/steps.view.ts"
import { islandsFor } from "@foldkit/markdown"
import { inertHtml as h, type Html } from "foldkit/html"
import {
    IconFile,
    IconFileCode,
    IconFileImage,
    IconFileJson,
    IconFileSpreadsheet,
    IconFileText,
    IconFolderClosed,
    IconFolderOpen,
    IconInfo,
    IconLayout,
    IconLayoutList,
    IconTerminal,
    IconZap,
} from "@urm/ui/foldkit/icons/view.ts"

import { documentationStaticIslandDefinitions } from "./static-island-definitions.ts"

const code_extensions = [
    ".astro",
    ".css",
    ".html",
    ".js",
    ".jsx",
    ".mjs",
    ".mts",
    ".scss",
    ".ts",
    ".tsx",
    ".vue",
]
const image_extensions = [
    ".avif",
    ".gif",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".webp",
]
const text_extensions = [".md", ".mdx", ".txt"]
const spreadsheet_extensions = [".csv", ".ods", ".xls", ".xlsx"]

const has_extension = (
    name: string,
    extensions: ReadonlyArray<string>
): boolean => {
    const lower_name = name.toLowerCase()
    return extensions.some((extension) => lower_name.endsWith(extension))
}

const file_icon = (name: string): Html => {
    const lower_name = name.toLowerCase()

    if (lower_name.endsWith(".json") || lower_name === "package-lock.json") {
        return IconFileJson({ class: "documentation-tree-entry-icon" })
    }
    if (has_extension(lower_name, image_extensions)) {
        return IconFileImage({ class: "documentation-tree-entry-icon" })
    }
    if (has_extension(lower_name, spreadsheet_extensions)) {
        return IconFileSpreadsheet({ class: "documentation-tree-entry-icon" })
    }
    if (has_extension(lower_name, text_extensions)) {
        return IconFileText({ class: "documentation-tree-entry-icon" })
    }
    if (has_extension(lower_name, code_extensions)) {
        return IconFileCode({ class: "documentation-tree-entry-icon" })
    }

    return IconFile({ class: "documentation-tree-entry-icon" })
}

const card_icon = (icon: "Document" | "Info" | "Terminal" | "Zap"): Html => {
    const props = { class: "documentation-card-icon" }

    switch (icon) {
        case "Document":
            return IconFileText(props)
        case "Info":
            return IconInfo(props)
        case "Terminal":
            return IconTerminal(props)
        case "Zap":
            return IconZap(props)
    }
}

export const documentationStaticIslandViews = {
    Callout: (attributes: CalloutProps, content: ReadonlyArray<Html>) =>
        Callout({ ...attributes, children: content }),
    Card: (
        {
            title,
            icon,
        }: {
            readonly title: string
            readonly icon?: "Document" | "Info" | "Terminal" | "Zap"
        },
        content: ReadonlyArray<Html>
    ) =>
        h.article(
            [h.Class("documentation-card")],
            [
                h.div(
                    [h.Class("documentation-card-heading")],
                    [
                        ...(icon === undefined ? [] : [card_icon(icon)]),
                        h.p([h.Class("documentation-card-title")], [title]),
                    ]
                ),
                h.div([h.Class("documentation-card-body")], content),
            ]
        ),
    CardGrid: (
        { stagger }: { readonly stagger?: "true" },
        content: ReadonlyArray<Html>
    ) =>
        h.div(
            [
                h.Class(
                    stagger === "true"
                        ? "documentation-card-grid documentation-card-grid-staggered"
                        : "documentation-card-grid"
                ),
            ],
            content
        ),
    Steps: (_attributes: {}, content: ReadonlyArray<Html>) =>
        StepsContainer({ children: content }),
    DescList: (_attributes: {}, content: ReadonlyArray<Html>) =>
        h.dl([h.Class("documentation-description-list")], content),
    DescItem: (
        { term }: { readonly term: string },
        content: ReadonlyArray<Html>
    ) =>
        h.div(
            [h.Class("documentation-description-list-item")],
            [
                h.dt([h.Class("documentation-description-list-term")], [term]),
                h.dd(
                    [h.Class("documentation-description-list-details")],
                    content
                ),
            ]
        ),
    FileTree: (_attributes: {}, content: ReadonlyArray<Html>) =>
        h.div([h.Class("documentation-file-tree")], content),
    TreeDirectory: (
        { name, open }: { readonly name: string; readonly open?: "true" },
        content: ReadonlyArray<Html>
    ) =>
        h.details(
            [
                h.Class("documentation-tree-directory"),
                ...(open === "true" ? [h.Open(true)] : []),
            ],
            [
                h.summary(
                    [],
                    [
                        h.span([h.Class("sr-only")], ["Directory: "]),
                        IconFolderClosed({
                            class: "documentation-tree-entry-icon documentation-tree-folder-closed",
                        }),
                        IconFolderOpen({
                            class: "documentation-tree-entry-icon documentation-tree-folder-open",
                        }),
                        name,
                    ]
                ),
                h.div(
                    [h.Class("documentation-tree-children")],
                    content.length === 0
                        ? [
                              h.div(
                                  [h.Class("documentation-tree-placeholder")],
                                  ["…"]
                              ),
                          ]
                        : content
                ),
            ]
        ),
    TreeFile: (
        {
            name,
            comment,
            highlight,
        }: {
            readonly name: string
            readonly comment?: string
            readonly highlight?: "true"
        },
        content: ReadonlyArray<Html>
    ) =>
        h.div(
            [h.Class("documentation-tree-file")],
            [
                h.span(
                    [
                        h.Class(
                            highlight === "true"
                                ? "documentation-tree-entry documentation-tree-highlight"
                                : "documentation-tree-entry"
                        ),
                    ],
                    [file_icon(name), h.code([], [name])]
                ),
                ...(comment === undefined
                    ? []
                    : [
                          h.span(
                              [h.Class("documentation-tree-comment")],
                              [comment]
                          ),
                      ]),
                ...(content.length === 0
                    ? []
                    : [
                          h.span(
                              [h.Class("documentation-tree-comment")],
                              content
                          ),
                      ]),
            ]
        ),
    TreePlaceholder: () =>
        h.div([h.Class("documentation-tree-placeholder")], ["…"]),
    ModelSidebar: (_attributes: {}, content: ReadonlyArray<Html>) =>
        h.div([h.Class("documentation-model-sidebar")], content),
    ModelNode: (
        {
            name,
            kind,
            sidebar,
            route,
            open,
        }: {
            readonly name: string
            readonly kind?: "Model" | "Submodel" | "State"
            readonly sidebar?: string
            readonly route?: string
            readonly open?: "true"
        },
        content: ReadonlyArray<Html>
    ) =>
        h.details(
            [
                h.Class("documentation-model-node"),
                ...(open === "true" ? [h.Open(true)] : []),
            ],
            [
                h.summary(
                    [h.Class("documentation-model-node-summary")],
                    [
                        (kind ?? "Submodel") === "Model"
                            ? IconLayout({
                                  class: "documentation-model-node-icon",
                              })
                            : IconLayoutList({
                                  class: "documentation-model-node-icon",
                              }),
                        h.code(
                            [h.Class("documentation-model-node-name")],
                            [name]
                        ),
                        h.span(
                            [h.Class("documentation-model-node-kind")],
                            [kind ?? "Submodel"]
                        ),
                        ...(sidebar === undefined
                            ? []
                            : [
                                  h.span(
                                      [
                                          h.Class(
                                              "documentation-model-node-sidebar"
                                          ),
                                      ],
                                      [`Sidebar: ${sidebar}`]
                                  ),
                              ]),
                        ...(route === undefined
                            ? []
                            : [
                                  h.code(
                                      [
                                          h.Class(
                                              "documentation-model-node-route"
                                          ),
                                      ],
                                      [route]
                                  ),
                              ]),
                    ]
                ),
                h.div([h.Class("documentation-model-node-content")], content),
            ]
        ),
    Accordions: (_attributes: {}, content: ReadonlyArray<Html>) =>
        h.div([h.Class("documentation-accordions")], content),
    Accordion: (
        {
            title,
            id,
            open,
        }: {
            readonly title: string
            readonly id?: string
            readonly open?: "true"
        },
        content: ReadonlyArray<Html>
    ) =>
        h.details(
            [
                h.Class("documentation-accordion"),
                ...(id === undefined ? [] : [h.Id(id)]),
                ...(open === "true" ? [h.Open(true)] : []),
            ],
            [
                h.summary(
                    [h.Class("documentation-accordion-trigger")],
                    [
                        h.span([], [title]),
                        h.span(
                            [
                                h.Class("documentation-accordion-chevron"),
                                h.AriaHidden(true),
                            ],
                            ["›"]
                        ),
                    ]
                ),
                h.div([h.Class("documentation-accordion-content")], content),
            ]
        ),
}

export const documentationStaticIslands = islandsFor(
    documentationStaticIslandDefinitions,
    documentationStaticIslandViews
)
