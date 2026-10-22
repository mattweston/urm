import { grep_url_href } from "./route.ts"
import { Option } from "effect"
import { childAttributes } from "foldkit/html"
import { documentation_origin } from "./links.ts"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Preview } from "./data.ts"
import {
    ChangedQuery,
    SourceDropdown,
    GotSourceDropdownMessage,
    RepoDropdown,
    GotRepositoryDropdownMessage,
    request_parameters,
    Autocomplete,
    GotAutocompleteMessage,
    ShowMoreFiles,
    PreviousFiles,
    NextDocuments,
    PreviousDocuments,
    request_key,
    search_preview,
    suggest_topics,
} from "./model.ts"
import { group_context } from "./context.ts"
import { code_file_view } from "./code.view.ts"
import { code_skeleton, documentation_skeleton } from "./loading.view.ts"
import { markdown_section_view } from "./markdown.view.ts"
import type { Model, Message } from "./model.ts"

const source_options: ReadonlyArray<Model["doc_source"]> = [
    "all",
    "urm",
    "effect",
    "foldkit",
    "foldkit-plus",
]
const source_labels: Record<Model["doc_source"], string> = {
    all: "All sources",
    urm: "URM",
    effect: "Effect v4",
    foldkit: "Foldkit",
    "foldkit-plus": "Foldkit Plus",
}
const repo_options: ReadonlyArray<Model["repo_source"]> = [
    "all",
    "urm",
    "effect",
    "foldkit",
    "foldkit-plus",
]
const repo_labels: Record<Model["repo_source"], string> = {
    all: "All repositories",
    urm: "URM",
    effect: "Effect v4",
    foldkit: "Foldkit",
    "foldkit-plus": "Foldkit Plus",
}

export const view = (
    model: Model,
    preview: Preview,
    h: HtmlBuilder<Message>
): Html => {
    const remote = preview.snapshot === "remote"
    const response = model.response
    const local = remote ? undefined : search_preview(preview, model)
    const grouped_files = remote
        ? (response?.groups ?? [])
        : group_context(preview, search_preview(preview, model))
    const result = local ?? {
        error: model.failure_key === request_key(model) ? model.failure : "",
        matches: grouped_files.flatMap((file) =>
            file.blocks.flatMap((block) =>
                block.lines.flatMap((line) => line.matches)
            )
        ),
        selected: response?.selected,
        occurrences: response?.occurrences ?? 0,
        files: response?.files ?? 0,
        shown_files: (response?.file_offset ?? 0) + grouped_files.length,
        sections: response?.sections ?? [],
    }
    const loading =
        remote &&
        model.response_key !== request_key(model) &&
        model.failure_key !== request_key(model)
    const pages = new Map<string, Array<(typeof result.sections)[number]>>()
    for (const entry of result.sections) {
        const existing = pages.get(entry.section.path)
        if (existing === undefined) pages.set(entry.section.path, [entry])
        else existing.push(entry)
    }
    const suggestions = remote
        ? model.suggestions
        : suggest_topics(preview.sections, model.query)
    const card = "min-w-0 rounded-lg border p-4 space-y-3"
    return h.section(
        [h.Class("grep-view mx-auto w-full max-w-6xl space-y-6")],
        [
            h.h1([h.Class("text-3xl font-bold")], ["Grep"]),
            h.p(
                [h.Class("text-muted-foreground")],
                [
                    !remote && preview.files.length === 0
                        ? "The local search preview is available in development."
                        : remote
                          ? "Local development search: URM, Effect v4, Foldkit, and Foldkit Plus. Code matches case-sensitive substrings; documentation matches topic names, titles, and aliases ignoring case."
                          : `Preview: ${preview.files.length} source files.`,
                ]
            ),
            ...(!remote && preview.files.length === 0
                ? []
                : [
                      h.div(
                          [h.Class("space-y-2")],
                          [
                              h.label(
                                  [
                                      h.For("grep-topics-input"),
                                      h.Class("text-sm font-medium"),
                                  ],
                                  ["Search code and documentation"]
                              ),
                              h.submodel({
                                  slotId: model.autocomplete.id,
                                  model: model.autocomplete,
                                  view: Autocomplete.view,
                                  viewInputs: {
                                      maybeSelectedValue: Option.some(
                                          model.query
                                      ),
                                      restingInputValue: model.query,
                                      items: suggestions,
                                      itemToValue: (topic: string) => topic,
                                      itemToDisplayText: (topic: string) =>
                                          topic,
                                      itemToConfig: (topic: string) => ({
                                          className: "grep-topic-option",
                                          content: h.span([], [topic]),
                                      }),
                                      inputAttributes: childAttributes([
                                          h.Class(
                                              "w-full rounded-md border border-input bg-background text-foreground px-3 py-2 pr-10 focus:ring-2 focus:ring-ring"
                                          ),
                                      ]),
                                      itemsAttributes: childAttributes([
                                          h.Class("grep-topic-options"),
                                      ]),
                                      attributes: childAttributes([
                                          h.Class("relative w-full"),
                                      ]),
                                      inputWrapperAttributes: childAttributes([
                                          h.Class("relative"),
                                      ]),
                                      buttonContent: h.span([], ["⌄"]),
                                      buttonAttributes: childAttributes([
                                          h.Class(
                                              "absolute inset-y-0 right-0 px-3 text-muted-foreground"
                                          ),
                                          h.AriaLabel("Show topic suggestions"),
                                      ]),
                                      backdropAttributes: childAttributes([
                                          h.Class("fixed inset-0 z-40"),
                                      ]),
                                      anchor: {
                                          placement: "bottom-start",
                                          gap: 4,
                                          padding: 8,
                                      },
                                  },
                                  toParentMessage: (message) =>
                                      GotAutocompleteMessage({ message }),
                              }),
                          ]
                      ),
                      h.p(
                          [
                              h.Class("text-sm text-muted-foreground"),
                              h.Role("status"),
                              h.AriaLive("polite"),
                          ],
                          [
                              result.error ||
                                  (loading ? "Searching…" : "") ||
                                  `${result.occurrences} occurrences · ${result.files} files · ${remote ? (response?.section_count ?? 0) : result.sections.length} documentation sections`,
                          ]
                      ),
                      ...(result.error === ""
                          ? []
                          : [
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(
                                            ChangedQuery({ query: model.query })
                                        ),
                                    ],
                                    ["Restart search"]
                                ),
                            ]),
                      h.div(
                          [
                              h.Class("grid gap-6 lg:grid-cols-2"),
                              h.AriaBusy(loading),
                          ],
                          [
                              h.section(
                                  [
                                      h.Class(
                                          "min-w-0 space-y-4 lg:h-[calc(100vh-16rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
                                      ),
                                  ],
                                  [
                                      h.h2(
                                          [h.Class("text-lg font-semibold")],
                                          ["Documentation"]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "flex flex-wrap items-center gap-2 text-sm"
                                              ),
                                          ],
                                          [
                                              h.span(
                                                  [h.Id("grep-source-label")],
                                                  ["Documentation source"]
                                              ),
                                              h.submodel({
                                                  slotId: model.source_dropdown
                                                      .id,
                                                  model: model.source_dropdown,
                                                  view: SourceDropdown.view,
                                                  viewInputs: {
                                                      maybeSelectedValue:
                                                          Option.some(
                                                              model.doc_source
                                                          ),
                                                      items: source_options,
                                                      itemToValue: (
                                                          source: Model["doc_source"]
                                                      ) => source,
                                                      itemToConfig: (
                                                          source: Model["doc_source"]
                                                      ) => ({
                                                          className:
                                                              "grep-topic-option",
                                                          content: h.span(
                                                              [],
                                                              [
                                                                  source_labels[
                                                                      source
                                                                  ],
                                                              ]
                                                          ),
                                                      }),
                                                      buttonContent: h.span(
                                                          [],
                                                          [
                                                              source_labels[
                                                                  model
                                                                      .doc_source
                                                              ],
                                                              " ▾",
                                                          ]
                                                      ),
                                                      buttonAttributes:
                                                          childAttributes([
                                                              h.AriaLabelledBy(
                                                                  "grep-source-label"
                                                              ),
                                                              h.Class(
                                                                  "rounded-md border border-input bg-background text-foreground px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring"
                                                              ),
                                                          ]),
                                                      itemsAttributes:
                                                          childAttributes([
                                                              h.Class(
                                                                  "grep-topic-options min-w-40"
                                                              ),
                                                          ]),
                                                      backdropAttributes:
                                                          childAttributes([
                                                              h.Class(
                                                                  "fixed inset-0 z-40"
                                                              ),
                                                          ]),
                                                      attributes:
                                                          childAttributes([
                                                              h.Class(
                                                                  "relative inline-block"
                                                              ),
                                                          ]),
                                                      anchor: {
                                                          placement:
                                                              "bottom-start",
                                                          gap: 4,
                                                          padding: 8,
                                                      },
                                                  },
                                                  toParentMessage: (message) =>
                                                      GotSourceDropdownMessage({
                                                          message,
                                                      }),
                                              }),
                                          ]
                                      ),
                                      ...(loading
                                          ? documentation_skeleton(h)
                                          : []),
                                      ...(loading || model.doc_path === ""
                                          ? []
                                          : [
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "text-xs text-muted-foreground break-all"
                                                        ),
                                                    ],
                                                    [
                                                        model.doc_path +
                                                            (model.doc_heading
                                                                ? ` #${model.doc_heading}`
                                                                : ""),
                                                    ]
                                                ),
                                                h.a(
                                                    [
                                                        h.Href(
                                                            grep_url_href(
                                                                model.query,
                                                                {
                                                                    ...request_parameters(
                                                                        model
                                                                    ),
                                                                    doc_path:
                                                                        "",
                                                                    doc_heading:
                                                                        "",
                                                                    doc_offset: 0,
                                                                }
                                                            )
                                                        ),
                                                        h.Class(
                                                            "text-sm text-primary underline"
                                                        ),
                                                    ],
                                                    ["Return to search results"]
                                                ),
                                            ]),
                                      ...(!loading &&
                                      result.sections.length === 0
                                          ? [
                                                h.p(
                                                    [],
                                                    [
                                                        model.doc_path
                                                            ? "The linked page or heading is not indexed."
                                                            : "No documentation for this topic.",
                                                    ]
                                                ),
                                            ]
                                          : []),
                                      ...(!loading &&
                                      remote &&
                                      model.doc_offset > 0
                                          ? [
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.OnClick(
                                                            PreviousDocuments()
                                                        ),
                                                    ],
                                                    ["Previous documentation"]
                                                ),
                                            ]
                                          : []),
                                      ...(!loading
                                          ? Array.from(
                                                pages,
                                                ([path, sections]) =>
                                                    h.keyed("article")(
                                                        path,
                                                        [h.Class(card)],
                                                        [
                                                            h.h3(
                                                                [
                                                                    h.Class(
                                                                        "font-semibold"
                                                                    ),
                                                                ],
                                                                [
                                                                    sections[0]
                                                                        ?.section
                                                                        .page_title ??
                                                                        path
                                                                            .split(
                                                                                "/"
                                                                            )
                                                                            .at(
                                                                                -1
                                                                            ) ??
                                                                        path,
                                                                ]
                                                            ),
                                                            h.p(
                                                                [
                                                                    h.Class(
                                                                        "text-xs text-muted-foreground break-all"
                                                                    ),
                                                                ],
                                                                [
                                                                    `${documentation_origin(path)} · ${path}`,
                                                                ]
                                                            ),
                                                            h.a(
                                                                [
                                                                    h.Href(
                                                                        grep_url_href(
                                                                            model.query,
                                                                            {
                                                                                ...request_parameters(
                                                                                    model
                                                                                ),
                                                                                doc_path:
                                                                                    path,
                                                                                doc_heading:
                                                                                    "",
                                                                                doc_offset: 0,
                                                                            }
                                                                        )
                                                                    ),
                                                                    h.Class(
                                                                        "text-sm text-primary underline"
                                                                    ),
                                                                ],
                                                                [
                                                                    "Open indexed page",
                                                                ]
                                                            ),
                                                            ...sections.map(
                                                                ({
                                                                    section,
                                                                    reason,
                                                                }) =>
                                                                    h.keyed(
                                                                        "section"
                                                                    )(
                                                                        section.id,
                                                                        [
                                                                            h.Class(
                                                                                "space-y-3 border-t pt-3"
                                                                            ),
                                                                        ],
                                                                        [
                                                                            h.h4(
                                                                                [
                                                                                    h.Class(
                                                                                        "font-medium"
                                                                                    ),
                                                                                ],
                                                                                [
                                                                                    section.title,
                                                                                ]
                                                                            ),
                                                                            h.p(
                                                                                [
                                                                                    h.Class(
                                                                                        "text-xs text-muted-foreground"
                                                                                    ),
                                                                                ],
                                                                                [
                                                                                    reason,
                                                                                ]
                                                                            ),
                                                                            markdown_section_view(
                                                                                section,
                                                                                model,
                                                                                h
                                                                            ),
                                                                        ]
                                                                    )
                                                            ),
                                                        ]
                                                    )
                                            )
                                          : []),
                                  ]
                              ),
                              h.section(
                                  [
                                      h.Class(
                                          "min-w-0 space-y-4 lg:h-[calc(100vh-16rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
                                      ),
                                  ],
                                  [
                                      h.h2(
                                          [h.Class("text-lg font-semibold")],
                                          ["Repository code"]
                                      ),
                                      h.div(
                                          [h.Class("flex flex-wrap gap-3")],
                                          [
                                              h.span(
                                                  [
                                                      h.Class(
                                                          "self-center text-sm"
                                                      ),
                                                  ],
                                                  ["Repository source"]
                                              ),
                                              h.submodel({
                                                  slotId: model.repo_dropdown
                                                      .id,
                                                  model: model.repo_dropdown,
                                                  view: RepoDropdown.view,
                                                  viewInputs: {
                                                      maybeSelectedValue:
                                                          Option.some(
                                                              model.repo_source
                                                          ),
                                                      items: repo_options,
                                                      itemToValue: (
                                                          source: Model["repo_source"]
                                                      ) => source,
                                                      itemToConfig: (
                                                          source: Model["repo_source"]
                                                      ) => ({
                                                          className:
                                                              "grep-topic-option",
                                                          content: h.span(
                                                              [],
                                                              [
                                                                  repo_labels[
                                                                      source
                                                                  ],
                                                              ]
                                                          ),
                                                      }),
                                                      buttonContent: h.span(
                                                          [],
                                                          [
                                                              repo_labels[
                                                                  model
                                                                      .repo_source
                                                              ],
                                                              " ▾",
                                                          ]
                                                      ),
                                                      buttonAttributes:
                                                          childAttributes([
                                                              h.Class(
                                                                  "rounded-md border border-input bg-background text-foreground px-3 py-2"
                                                              ),
                                                          ]),
                                                      itemsAttributes:
                                                          childAttributes([
                                                              h.Class(
                                                                  "grep-topic-options min-w-40"
                                                              ),
                                                          ]),
                                                      backdropAttributes:
                                                          childAttributes([
                                                              h.Class(
                                                                  "fixed inset-0 z-40"
                                                              ),
                                                          ]),
                                                      attributes:
                                                          childAttributes([
                                                              h.Class(
                                                                  "relative inline-block"
                                                              ),
                                                          ]),
                                                      anchor: {
                                                          placement:
                                                              "bottom-start",
                                                          gap: 4,
                                                          padding: 8,
                                                      },
                                                  },
                                                  toParentMessage: (message) =>
                                                      GotRepositoryDropdownMessage(
                                                          {
                                                              message,
                                                          }
                                                      ),
                                              }),
                                          ]
                                      ),
                                      ...(loading ? code_skeleton(h) : []),
                                      ...(!loading &&
                                      remote &&
                                      model.visible_files > 10
                                          ? [
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.OnClick(
                                                            PreviousFiles()
                                                        ),
                                                    ],
                                                    ["Previous files"]
                                                ),
                                            ]
                                          : []),
                                      ...(!loading &&
                                      result.matches.length === 0
                                          ? [h.p([], ["No code matches."])]
                                          : []),
                                      ...(!loading
                                          ? grouped_files.map((file) =>
                                                code_file_view(
                                                    file,
                                                    result.selected?.id,
                                                    h
                                                )
                                            )
                                          : []),
                                      ...(!loading &&
                                      result.files > result.shown_files
                                          ? [
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.Class(
                                                            "w-full rounded-lg border px-4 py-3 text-sm text-primary hover:bg-muted/40"
                                                        ),
                                                        h.OnClick(
                                                            ShowMoreFiles()
                                                        ),
                                                    ],
                                                    [
                                                        `${remote ? "Next files" : "Show more files"} · ${result.files - result.shown_files} remaining`,
                                                    ]
                                                ),
                                            ]
                                          : []),
                                  ]
                              ),
                          ]
                      ),
                      ...(!loading &&
                      remote &&
                      model.doc_offset + result.sections.length <
                          (response?.section_count ?? 0)
                          ? [
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(NextDocuments()),
                                    ],
                                    ["Next documentation"]
                                ),
                            ]
                          : []),
                      h.p(
                          [h.Class("text-xs text-muted-foreground break-all")],
                          [`Snapshot ${response?.snapshot ?? preview.snapshot}`]
                      ),
                      ...(response?.diagnostics ?? preview.diagnostics).map(
                          (diagnostic) =>
                              h.p(
                                  [h.Class("text-sm text-destructive")],
                                  [diagnostic]
                              )
                      ),
                  ]),
        ]
    )
}
