import * as Ui from "@foldkit/ui"
import { Result } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ModelDemo from "./model.ts"

type ToParentMessage<ParentMessage> = (
    message: ModelDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: ModelDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: ModelDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit Model examples"),
        ],
        ModelDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        ModelDemo.SelectedModelStage({ stage })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
                                        ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                        : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                                ),
                            ],
                            [stage]
                        ),
                },
                h
            )
        )
    )

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const note_card = <ParentMessage>(
    note: ModelDemo.Note,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-3")],
                [
                    h.div(
                        [h.Class("font-mono text-xs font-semibold")],
                        [note.title]
                    ),
                    h.span(
                        [
                            h.Class(
                                note.status === "Published"
                                    ? "rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 font-mono text-[9px] text-emerald-600"
                                    : "rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-1 font-mono text-[9px] text-amber-600"
                            ),
                        ],
                        [note.status]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-2 font-mono text-[10px] text-muted-foreground")],
                [note.id]
            ),
        ]
    )

const tree_view = <ParentMessage>(
    model: ModelDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · one immutable state tree",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 lg:grid-cols-[0.9fr_1.1fr]")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Model snapshot"]
                                    ),
                                    h.pre(
                                        [
                                            h.Class(
                                                "mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-cyan-500"
                                            ),
                                        ],
                                        [JSON.stringify(model.editor, null, 2)]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    h.div(
                                        [h.Class("grid gap-2 sm:grid-cols-2")],
                                        model.editor.notes.map((note) =>
                                            note_card(note, h)
                                        )
                                    ),
                                    h.div(
                                        [h.Class("grid gap-2 sm:grid-cols-2")],
                                        [
                                            stat(
                                                "sidebar",
                                                model.editor.isSidebarOpen
                                                    ? "open"
                                                    : "closed",
                                                h
                                            ),
                                            stat(
                                                "mode",
                                                model.editor.editorMode._tag,
                                                h
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Add note",
                                ModelDemo.ClickedAddModelNote(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                model.editor.isSidebarOpen
                                    ? "Close sidebar"
                                    : "Open sidebar",
                                ModelDemo.ClickedToggleModelSidebar(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                ModelDemo.ClickedResetModelDemo(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "The Model is the whole remembered state",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Everything this miniature application needs to remember lives in one immutable value: notes, filter, sidebar state, and editor mode. A Message describes what happened; update returns the next Model.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const stat = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[9px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        "mt-2 font-mono text-sm font-semibold text-violet-500"
                    ),
                ],
                [value]
            ),
        ]
    )

const schema_case_action = <ParentMessage>(
    schemaCase: ModelDemo.SchemaCase,
    model: ModelDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        schemaCase,
        ModelDemo.SelectedModelSchemaCase({ schemaCase }),
        to_parent_message,
        model.schemaCase === schemaCase,
        h
    )

const schema_view = <ParentMessage>(
    model: ModelDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const input = ModelDemo.schemaInput(model)
    const result = ModelDemo.schemaResult(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · the Model Schema exists at runtime",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Valid", "MissingNotes", "BadMode"] as const).map(
                            (schemaCase) =>
                                schema_case_action(
                                    schemaCase,
                                    model,
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["unknown snapshot"]
                                    ),
                                    h.pre(
                                        [
                                            h.Class(
                                                "max-h-[360px] overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 whitespace-pre-wrap font-mono text-[10px] leading-5"
                                            ),
                                        ],
                                        [JSON.stringify(input, null, 2)]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Schema.decodeUnknownResult →"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        Result.isSuccess(result)
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4"
                                            : "rounded-[var(--radius-surface)] border border-destructive/40 bg-destructive/5 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                Result.isSuccess(result)
                                                    ? "font-mono text-sm font-semibold text-emerald-600"
                                                    : "font-mono text-sm font-semibold text-destructive"
                                            ),
                                        ],
                                        [
                                            Result.isSuccess(result)
                                                ? "Success<EditorModel>"
                                                : "Failure<SchemaError>",
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 max-h-[300px] overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [ModelDemo.schemaResultLabel(model)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Why Foldkit needs a Schema, not only a TypeScript type",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "TypeScript types disappear after compilation. Foldkit keeps the Model Schema as a runtime value so state can be encoded/decoded across hot updates and the same schema can validate unknown data at application boundaries.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const mode_button = <ParentMessage>(
    label: string,
    message: ModelDemo.Message,
    active: boolean,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => action(label, message, to_parent_message, active, h)

const variants_view = <ParentMessage>(
    model: ModelDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const mode = model.editor.editorMode

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · state with named variants",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            mode_button(
                                "Browsing",
                                ModelDemo.ClickedBrowseModel(),
                                mode._tag === "Browsing",
                                to_parent_message,
                                h
                            ),
                            mode_button(
                                "Editing n-1",
                                ModelDemo.ClickedEditModel(),
                                mode._tag === "Editing",
                                to_parent_message,
                                h
                            ),
                            mode_button(
                                "Previewing n-2",
                                ModelDemo.ClickedPreviewModel(),
                                mode._tag === "Previewing",
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-3"
                            ),
                        ],
                        [
                            stat("_tag", mode._tag, h),
                            stat("match", ModelDemo.modeLabel(mode), h),
                            stat(
                                "isWorking",
                                String(ModelDemo.isWorking(mode)),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "defineTaggedUnion",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const EditorMode = defineTaggedUnion({
  Browsing: {},
  Editing: { noteId: Schema.String },
  Previewing: { noteId: Schema.String },
})

EditorMode.Browsing()
EditorMode.Editing({ noteId: "n-1" })

EditorMode.match(mode, {
  Browsing: () => "...",
  Editing: ({ noteId }) => "...",
  Previewing: ({ noteId }) => "...",
})`,
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Guards and subsets",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            'Use EditorMode.guards.Editing for one variant, isAnyOf(["Editing", "Previewing"]) for several, and subset(["Editing", "Previewing"]) when another runtime Schema should accept only those named variants.',
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const filter_action = <ParentMessage>(
    filter: ModelDemo.NoteFilter,
    model: ModelDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        filter,
        ModelDemo.SelectedModelFilter({ filter }),
        to_parent_message,
        model.editor.filter === filter,
        h
    )

const fact_list = <ParentMessage>(
    title: string,
    facts: ReadonlyArray<string>,
    tone: "stored" | "derived",
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                tone === "stored"
                    ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5"
                    : "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-4 py-3"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                tone === "stored"
                                    ? "font-mono text-xs font-semibold text-cyan-500"
                                    : "font-mono text-xs font-semibold text-emerald-600"
                            ),
                        ],
                        [title]
                    ),
                ]
            ),
            h.div(
                [],
                facts.map((fact) =>
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-4 py-3 font-mono text-xs first:border-t-0"
                            ),
                        ],
                        [fact]
                    )
                )
            ),
        ]
    )

const derived_view = <ParentMessage>(
    model: ModelDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const editor = model.editor
    const visible = ModelDemo.visibleNotes(editor)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · store facts, derive presentation values",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["All", "Draft", "Published"] as const).map((filter) =>
                            filter_action(filter, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            fact_list(
                                "stored in Model",
                                ModelDemo.storedFacts(editor),
                                "stored",
                                h
                            ),
                            fact_list(
                                "derived in view/helpers",
                                ModelDemo.derivedFacts(editor),
                                "derived",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "mb-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                [`visible notes (${visible.length})`]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                                    ),
                                ],
                                visible.map((note) => note_card(note, h))
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Model the application, not one render frame",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The Model stores facts the application must remember. `visibleNotes`, `visibleCount`, `modeLabel`, and `isWorking` are deterministic consequences of those facts, so storing them too would create duplicate state that can drift out of sync.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: ModelDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Tree"
                ? tree_view(model, to_parent_message, h)
                : model.stage === "Schema"
                  ? schema_view(model, to_parent_message, h)
                  : model.stage === "Variants"
                    ? variants_view(model, to_parent_message, h)
                    : derived_view(model, to_parent_message, h),
        ]
    )
