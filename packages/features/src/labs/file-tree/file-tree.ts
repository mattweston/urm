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
} from "@urm/ui/foldkit/icons/view.ts"

export type FileTreeFile = Readonly<{
    _tag: "File"
    name: string
    comment?: string
    highlighted?: boolean
    href?: string
}>

export type FileTreeDirectory = Readonly<{
    _tag: "Directory"
    name: string
    entries: ReadonlyArray<FileTreeEntry>
    comment?: string
    highlighted?: boolean
    open?: boolean
}>

export type FileTreePlaceholder = Readonly<{
    _tag: "Placeholder"
    label?: string
}>

export type FileTreeEntry =
    | FileTreeFile
    | FileTreeDirectory
    | FileTreePlaceholder

export type FileTreeProps = Readonly<{
    entries: ReadonlyArray<FileTreeEntry>
    label?: string
    class?: string
}>

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

const icon_class = "size-3.5 shrink-0 text-muted-foreground"

const has_extension = (
    name: string,
    extensions: ReadonlyArray<string>
): boolean => extensions.some((extension) => name.endsWith(extension))

const file_icon = (name: string): Html => {
    const lower_name = name.toLowerCase()

    if (lower_name.endsWith(".json") || lower_name === "package-lock.json") {
        return IconFileJson({ class: icon_class })
    }
    if (has_extension(lower_name, image_extensions)) {
        return IconFileImage({ class: icon_class })
    }
    if (has_extension(lower_name, spreadsheet_extensions)) {
        return IconFileSpreadsheet({ class: icon_class })
    }
    if (has_extension(lower_name, text_extensions)) {
        return IconFileText({ class: icon_class })
    }
    if (has_extension(lower_name, code_extensions)) {
        return IconFileCode({ class: icon_class })
    }

    return IconFile({ class: icon_class })
}

const entry_label = (entry: FileTreeFile): Html => {
    const content: ReadonlyArray<Html | string> = [
        file_icon(entry.name),
        h.code(
            [h.Class("bg-transparent p-0 font-[inherit] text-inherit")],
            [entry.name]
        ),
    ]
    const class_name = entry.highlighted
        ? "inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-primary pe-1.5 text-primary-foreground [&>svg]:text-current"
        : "inline-flex shrink-0 items-center gap-1.5 rounded-sm pe-1.5"

    return entry.href === undefined
        ? h.span([h.Class(class_name)], content)
        : h.a(
              [
                  h.Href(entry.href),
                  h.Class(`${class_name} underline-offset-4 hover:underline`),
              ],
              content
          )
}

const comment = (value: string | undefined): ReadonlyArray<Html> =>
    value === undefined
        ? []
        : [
              h.span(
                  [
                      h.Class(
                          "min-w-48 max-w-96 ps-5 text-muted-foreground sm:ps-0"
                      ),
                  ],
                  [value]
              ),
          ]

const render_entries = (entries: ReadonlyArray<FileTreeEntry>): Html =>
    h.ul([h.Class("m-0 list-none space-y-0.5 p-0")], entries.map(render_entry))

const render_entry = (entry: FileTreeEntry): Html => {
    switch (entry._tag) {
        case "Placeholder":
            return h.li(
                [h.Class("px-1.5 py-0.5 text-muted-foreground")],
                [entry.label ?? "…"]
            )
        case "File":
            return h.li(
                [
                    h.Class(
                        "flex flex-wrap items-start gap-x-1.5 rounded-sm px-1.5 py-0.5 sm:flex-nowrap"
                    ),
                ],
                [entry_label(entry), ...comment(entry.comment)]
            )
        case "Directory": {
            const name_class = entry.highlighted
                ? "inline-flex items-center gap-1.5 rounded-sm bg-primary pe-1.5 text-primary-foreground [&>svg]:text-current"
                : "inline-flex items-center gap-1.5 rounded-sm pe-1.5"

            return h.li(
                [],
                [
                    h.details(
                        [
                            h.Class("group/file-tree-directory"),
                            ...(entry.open === false ? [] : [h.Open(true)]),
                        ],
                        [
                            h.summary(
                                [
                                    h.Class(
                                        "flex cursor-pointer flex-wrap items-start gap-x-1.5 rounded-sm px-1.5 py-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-nowrap"
                                    ),
                                ],
                                [
                                    h.span(
                                        [h.Class(name_class)],
                                        [
                                            h.span(
                                                [h.Class("sr-only")],
                                                ["Directory: "]
                                            ),
                                            IconFolderClosed({
                                                class: `${icon_class} group-open/file-tree-directory:hidden`,
                                            }),
                                            IconFolderOpen({
                                                class: `${icon_class} hidden group-open/file-tree-directory:block`,
                                            }),
                                            h.code(
                                                [
                                                    h.Class(
                                                        "bg-transparent p-0 font-[inherit] text-inherit"
                                                    ),
                                                ],
                                                [entry.name]
                                            ),
                                        ]
                                    ),
                                    ...comment(entry.comment),
                                ]
                            ),
                            h.div(
                                [h.Class("ms-3 border-s border-border ps-3")],
                                [
                                    render_entries(
                                        entry.entries.length === 0
                                            ? [placeholder()]
                                            : entry.entries
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            )
        }
    }
}

export const file = (
    name: string,
    options: Omit<FileTreeFile, "_tag" | "name"> = {}
): FileTreeFile => ({ _tag: "File", name, ...options })

export const directory = (
    name: string,
    entries: ReadonlyArray<FileTreeEntry>,
    options: Omit<FileTreeDirectory, "_tag" | "name" | "entries"> = {}
): FileTreeDirectory => ({ _tag: "Directory", name, entries, ...options })

export const placeholder = (label?: string): FileTreePlaceholder =>
    label === undefined
        ? { _tag: "Placeholder" }
        : { _tag: "Placeholder", label }

export const FileTree = (props: FileTreeProps): Html =>
    h.div(
        [
            h.Role("region"),
            h.AriaLabel(props.label ?? "File tree"),
            h.Class(
                `overflow-x-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted p-4 font-mono text-[0.8125rem] leading-relaxed text-foreground${props.class === undefined ? "" : ` ${props.class}`}`
            ),
        ],
        [render_entries(props.entries)]
    )
