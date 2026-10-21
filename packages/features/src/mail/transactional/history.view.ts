import type { Html, HtmlBuilder } from "foldkit/html"
import {
    default_transactional_copy,
    type TransactionalCopy,
    type TransactionalTemplateState,
} from "@urm/email/transactional-content"
import {
    RequestedTransactionalHistory,
    RestoreTransactionalCopy,
    type Model,
    type Message as EditorMessage,
} from "./editor.ts"

const button_classes =
    "inline-flex min-h-11 items-center text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"

export const transactional_history_view = <Message>(
    editor: Model["editors"][number],
    state: TransactionalTemplateState | undefined,
    loaded: boolean,
    h: HtmlBuilder<Message>,
    to_message: (message: EditorMessage) => Message
): Html => {
    const disabled = !loaded || editor.busy
    const restore = (version: number, label: string): Html =>
        h.button(
            [
                h.Type("button"),
                h.Class(button_classes),
                h.Disabled(
                    disabled || editor.dirty || version === editor.base_version
                ),
                h.OnClick(
                    to_message(
                        RestoreTransactionalCopy({
                            template_id: editor.template_id,
                            source_version: version,
                        })
                    )
                ),
            ],
            [label]
        )
    const copy_view = (copy: TransactionalCopy): Html =>
        h.dl(
            [h.Class("grid gap-2 py-3")],
            [
                h.dt([h.Class("text-sm font-medium")], ["Subject"]),
                h.dd([h.Class("break-words")], [copy.subject]),
                h.dt([h.Class("text-sm font-medium")], ["Heading"]),
                h.dd([h.Class("break-words")], [copy.heading]),
                h.dt([h.Class("text-sm font-medium")], ["Introduction"]),
                h.dd(
                    [h.Class("whitespace-pre-wrap break-words")],
                    [copy.introduction]
                ),
            ]
        )
    return h.section(
        [h.Class("grid gap-3 border-t border-border pt-6")],
        [
            h.h2([h.Class("text-xl font-semibold")], ["Version history"]),
            h.p(
                [h.Class("max-w-prose text-sm text-muted-foreground")],
                [
                    "Restoring creates a new saved version. Existing versions and outgoing emails stay unchanged until you activate the restored version.",
                ]
            ),
            ...(editor.dirty
                ? [
                      h.p(
                          [h.Class("text-sm")],
                          [
                              "Save or discard your edits before restoring a version.",
                          ]
                      ),
                  ]
                : []),
            h.div(
                [h.Class("flex flex-wrap gap-4")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(button_classes),
                            h.Disabled(disabled || editor.history.loading),
                            h.OnClick(
                                to_message(
                                    RequestedTransactionalHistory({
                                        template_id: editor.template_id,
                                        older: false,
                                    })
                                )
                            ),
                        ],
                        [
                            editor.history.loading
                                ? "Loading history…"
                                : editor.history.loaded
                                  ? "Refresh history"
                                  : "Load history",
                        ]
                    ),
                ]
            ),
            ...(editor.history.error === ""
                ? []
                : [h.p([h.Role("alert")], [editor.history.error])]),
            ...(editor.history.loaded && editor.history.versions.length === 0
                ? [
                      h.p(
                          [],
                          [
                              "No saved versions yet. This email uses the built-in copy.",
                          ]
                      ),
                  ]
                : []),
            h.ol(
                [h.Role("list"), h.Class("grid gap-3")],
                editor.history.versions.map((entry) =>
                    h.li(
                        [
                            h.Key(String(entry.version)),
                            h.Class("rounded border border-border p-4"),
                        ],
                        [
                            h.details(
                                [],
                                [
                                    h.summary(
                                        [
                                            h.Class(
                                                "min-h-11 cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                            ),
                                        ],
                                        [
                                            `Version ${entry.version}${entry.version === state?.latest?.version ? " · Latest saved" : ""}${entry.version === state?.active?.version ? " · Active" : ""}`,
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground tabular-nums"
                                            ),
                                        ],
                                        [
                                            `Saved ${new Date(entry.created_at).toISOString().replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC")}`,
                                        ]
                                    ),
                                    ...(entry.restored_from_version === null
                                        ? []
                                        : [
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "text-sm text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      entry.restored_from_version ===
                                                      0
                                                          ? "Restored from built-in copy."
                                                          : `Restored from version ${entry.restored_from_version}.`,
                                                  ]
                                              ),
                                          ]),
                                    copy_view(entry.copy),
                                    restore(
                                        entry.version,
                                        `Restore version ${entry.version} as new saved version`
                                    ),
                                ]
                            ),
                        ]
                    )
                )
            ),
            ...(editor.history.next_before_version === null
                ? []
                : [
                      h.button(
                          [
                              h.Type("button"),
                              h.Class(button_classes),
                              h.Disabled(disabled || editor.history.loading),
                              h.OnClick(
                                  to_message(
                                      RequestedTransactionalHistory({
                                          template_id: editor.template_id,
                                          older: true,
                                      })
                                  )
                              ),
                          ],
                          ["Load older versions"]
                      ),
                  ]),
            h.details(
                [h.Class("rounded border border-border p-4")],
                [
                    h.summary(
                        [
                            h.Class(
                                "min-h-11 cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            ),
                        ],
                        [
                            `Built-in copy${state?.active === null || state === undefined ? " · Active" : ""}`,
                        ]
                    ),
                    copy_view(default_transactional_copy(editor.template_id)),
                    restore(0, "Restore built-in copy as new saved version"),
                ]
            ),
        ]
    )
}
