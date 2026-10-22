import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as FileSystemDemo from "./file-system.ts"

type ToParentMessage<ParentMessage> = (
    message: FileSystemDemo.Message
) => ParentMessage

type ButtonAttribute<ParentMessage> =
    Parameters<HtmlBuilder<ParentMessage>["button"]>[0] extends ReadonlyArray<
        infer Attribute
    >
        ? Attribute
        : never

type ButtonViewAttributes<ParentMessage> = Readonly<{
    button: ReadonlyArray<ButtonAttribute<ParentMessage>>
}>

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    title: string,
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
                        [title]
                    ),
                ]
            ),
            ...children,
        ]
    )

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" | "red" = "default"
): Html => {
    const toneClass =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : tone === "red"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${toneClass}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        "mt-1 whitespace-pre-wrap break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice_button = <ParentMessage>(
    label: string,
    active: boolean,
    message: FileSystemDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: active,
            toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: FileSystemDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect FileSystem examples"),
        ],
        FileSystemDemo.stages.map((stage: FileSystemDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        FileSystemDemo.Message.SelectedFileSystemStage({
                            stage,
                        })
                    ),
                    isDisabled: model.stage === stage,
                    toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    model.stage === stage
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

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api: string) =>
        h.keyed("span")(
            api,
            [
                h.Class(
                    "rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-600"
                ),
            ],
            [api]
        )
    )

const intro_panel = <ParentMessage>(
    details: FileSystemDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [h.Class("grid gap-0 lg:grid-cols-[1.05fr_0.95fr]")],
                [
                    h.div(
                        [h.Class("p-6")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h2(
                                [
                                    h.Class(
                                        "mt-2 text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [details.description]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                api_pills(details.apis, h)
                            ),
                        ]
                    ),
                    h.pre(
                        [
                            h.Class(
                                "overflow-x-auto border-t border-border bg-background/60 p-5 font-mono text-xs leading-5 lg:border-l lg:border-t-0"
                            ),
                        ],
                        [h.code([], [details.code])]
                    ),
                ]
            ),
        ]
    )

const read_write_view = <ParentMessage>(
    model: FileSystemDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FileSystemDemo.read_write_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Service program",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "config file",
                                        model.readWriteCase === "Config",
                                        FileSystemDemo.Message.SelectedFileSystemReadWriteCase(
                                            {
                                                readWriteCase: "Config",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "directory ops",
                                        model.readWriteCase === "Directory",
                                        FileSystemDemo.Message.SelectedFileSystemReadWriteCase(
                                            {
                                                readWriteCase: "Directory",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "FileSystem provided",
                                String(snapshot.serviceProvided),
                                h,
                                "green"
                            ),
                            metric(
                                "config exists",
                                String(snapshot.exists),
                                h,
                                "green"
                            ),
                            metric(
                                "readFileString",
                                snapshot.content,
                                h,
                                "cyan"
                            ),
                            metric("writeFileString", snapshot.writes, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Directory + metadata",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "readDirectory",
                                snapshot.directoryEntries,
                                h
                            ),
                            metric("glob", snapshot.globMatches, h, "cyan"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "stat type",
                                        snapshot.statType,
                                        h,
                                        "green"
                                    ),
                                    metric("mode", snapshot.statMode, h),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.readWriteCase === "Directory"
                                        ? "This case also calls makeDirectory with recursive: true on the provided test service."
                                        : "The program stays platform-independent: the same Effect would run against a Node, Bun, browser-capable, or test implementation that satisfies FileSystem.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const handle_view = <ParentMessage>(
    model: FileSystemDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FileSystemDemo.handle_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "File handle",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Read", "Seek", "Flags"] as const).map(
                                    (handleCase: FileSystemDemo.HandleCase) =>
                                        choice_button(
                                            handleCase,
                                            model.handleCase === handleCase,
                                            FileSystemDemo.Message.SelectedFileSystemHandleCase(
                                                {
                                                    handleCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "isFile",
                                String(snapshot.isFile),
                                h,
                                "green"
                            ),
                            metric("FileTypeId", snapshot.typeId, h, "cyan"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric("stat type", snapshot.statType, h),
                                    metric("mode", snapshot.statMode, h),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Cursor + flags",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "readAlloc(5)",
                                        snapshot.firstRead,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "seek(6, start)",
                                        snapshot.cursorAfterSeek,
                                        h
                                    ),
                                    metric(
                                        "next readAlloc(4)",
                                        snapshot.secondRead,
                                        h,
                                        "green"
                                    ),
                                    metric("SeekMode", snapshot.seekModes, h),
                                ]
                            ),
                            metric("OpenFlag values", snapshot.openFlags, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "A real fs.open returns this handle inside Scope. The demo uses a deterministic in-memory File-shaped value so no host file is opened.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const stream_view = <ParentMessage>(
    model: FileSystemDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FileSystemDemo.stream_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Incremental API",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "stream",
                                        model.streamCase === "Stream",
                                        FileSystemDemo.Message.SelectedFileSystemStreamCase(
                                            {
                                                streamCase: "Stream",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "watch",
                                        model.streamCase === "Watch",
                                        FileSystemDemo.Message.SelectedFileSystemStreamCase(
                                            {
                                                streamCase: "Watch",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "stream chunks",
                                String(snapshot.streamChunkCount),
                                h,
                                "cyan"
                            ),
                            metric("flattened bytes", snapshot.streamBytes, h),
                            metric("sink role", snapshot.sinkRole, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Watch feed",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "event count",
                                        String(snapshot.watchCount),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "recursive",
                                        String(snapshot.recursive),
                                        h
                                    ),
                                ]
                            ),
                            metric("events", snapshot.watchEvents, h, "cyan"),
                            metric("WatchBackend", snapshot.backendRole, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const test_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = FileSystemDemo.test_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "makeNoop defaults",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "exists(missing)",
                                String(snapshot.bareExists),
                                h
                            ),
                            metric(
                                "remove(missing) Exit",
                                snapshot.bareRemove,
                                h,
                                "green"
                            ),
                            metric(
                                "readFileString(missing) Exit",
                                snapshot.bareRead,
                                h,
                                "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The no-op implementation is intentionally test-friendly rather than realistic: missing existence checks are false and remove is harmless.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Overrides + derived methods",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "makeNoop override",
                                snapshot.overriddenRead,
                                h,
                                "cyan"
                            ),
                            metric(
                                "layerNoop provided",
                                snapshot.layeredRead,
                                h,
                                "green"
                            ),
                            metric(
                                "FileSystem.make derives",
                                snapshot.derivedByMake,
                                h
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Use make when implementing a platform backend from core primitives; use makeNoop or layerNoop when a test only needs a handful of controlled operations.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: FileSystemDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    panel(
        "What to notice",
        [
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ],
        h
    )

export const view = <ParentMessage>(
    model: FileSystemDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = FileSystemDemo.stage_details[model.stage]

    return h.div(
        [h.Class("space-y-5")],
        [
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("max-w-3xl")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                            ),
                                        ],
                                        ["effect / FileSystem"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Portable file I/O behind an Effect service",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Read and write through Context, inspect scoped file handles, model incremental I/O as Stream / Sink, and swap in focused no-op implementations for tests.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap gap-2 lg:justify-end"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["15 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["PlatformError"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["no explicit any"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "ReadWrite"
                ? read_write_view(model, to_parent_message, h)
                : model.stage === "Handles"
                  ? handle_view(model, to_parent_message, h)
                  : model.stage === "Streams"
                    ? stream_view(model, to_parent_message, h)
                    : test_view(h),
            notice_panel(details, h),
        ]
    )
}
