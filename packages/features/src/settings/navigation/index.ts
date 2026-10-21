import { Effect, Option, Schema as S } from "effect"
import { Command, Subscription } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"
import { IconGripVertical } from "@urm/ui/foldkit/icons/view.ts"
import {
    ModuleId,
    SidebarItemId,
    SidebarDividerId,
    SidebarOrderItem,
    SidebarPreference,
    max_sidebar_dividers,
    module_ids,
    normalize_sidebar_order,
} from "@urm/domain/schemas/modules"

export const Snapshot = S.Struct({
    domain_id: S.String,
    ...SidebarPreference.fields,
    enabled_modules: S.Array(ModuleId),
    can_manage_modules: S.Boolean,
})
export const Model = S.Struct({
    domain_id: S.String,
    snapshot: S.Option(Snapshot),
    sidebar_order: S.Array(SidebarOrderItem),
    hidden_modules: S.Array(SidebarItemId),
    enabled_modules: S.Array(ModuleId),
    dirty_sidebar: S.Boolean,
    dirty_modules: S.Boolean,
    saving: S.Literals(["idle", "sidebar", "modules"]),
    error: S.String,
    drag_and_drop: Ui.DragAndDrop.Model,
})
export type Model = typeof Model.Type
export const Received = taggedStruct("Received", { snapshot: Snapshot })
export const Saved = taggedStruct("Saved", {
    snapshot: Snapshot,
    kind: S.Literals(["sidebar", "modules"]),
})
export const Failed = taggedStruct("Failed", {
    domain_id: S.String,
    details: S.String,
})
export const ToggleHidden = taggedStruct("ToggleHidden", { id: SidebarItemId })
export const ToggleModule = taggedStruct("ToggleModule", { id: ModuleId })
export const Save = taggedStruct("Save", {
    kind: S.Literals(["sidebar", "modules"]),
})
export const Cancel = taggedStruct("Cancel", {
    kind: S.Literals(["sidebar", "modules"]),
})
export const Reset = taggedStruct("Reset")
export const AddedDivider = taggedStruct("AddedDivider")
export const RemovedDivider = taggedStruct("RemovedDivider", {
    id: SidebarDividerId,
})
export const GotDragAndDropMessage = taggedStruct("GotDragAndDropMessage", {
    message: Ui.DragAndDrop.Message,
})
export const Message = S.Union([
    Received,
    Saved,
    Failed,
    ToggleHidden,
    ToggleModule,
    Save,
    Cancel,
    Reset,
    AddedDivider,
    RemovedDivider,
    GotDragAndDropMessage,
])
export type Message = typeof Message.Type
export const init = (domain_id = ""): Model => ({
    domain_id,
    snapshot: Option.none(),
    sidebar_order: normalize_sidebar_order([]),
    hidden_modules: [],
    enabled_modules: module_ids,
    dirty_sidebar: false,
    dirty_modules: false,
    saving: "idle",
    error: "",
    drag_and_drop: Ui.DragAndDrop.init({
        id: "sidebar-settings",
        orientation: "Vertical",
    }),
})
const toggle = <A>(items: ReadonlyArray<A>, id: A): ReadonlyArray<A> =>
    items.includes(id) ? items.filter((item) => item !== id) : [...items, id]

export const sidebar_item_label = (id: SidebarItemId): string =>
    id === "Pages"
        ? "Web"
        : id === "Documents"
          ? "Documents (inside Content)"
          : id === "Blog"
            ? "Blog (inside Web)"
            : id

export const module_label = (id: ModuleId): string =>
    id === "Documents"
        ? "Documents (Content)"
        : id === "Blog"
          ? "Blog (Web)"
          : id

const is_nested_sidebar_item = (id: SidebarOrderItem): boolean =>
    id === "Documents" || id === "Blog"
export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (message._tag === "Received" || message._tag === "Saved") {
        if (message.snapshot.domain_id !== model.domain_id) return [model, []]
        const sidebar_saved =
            message._tag === "Saved" && message.kind === "sidebar"
        const modules_saved =
            message._tag === "Saved" && message.kind === "modules"
        return [
            {
                ...model,
                snapshot: Option.some(message.snapshot),
                ...(sidebar_saved || !model.dirty_sidebar
                    ? {
                          sidebar_order: normalize_sidebar_order(
                              message.snapshot.sidebar_order
                          ),
                          hidden_modules: message.snapshot.hidden_modules,
                          dirty_sidebar: false,
                      }
                    : {}),
                ...(modules_saved || !model.dirty_modules
                    ? {
                          enabled_modules: message.snapshot.enabled_modules,
                          dirty_modules: false,
                      }
                    : {}),
                saving: message._tag === "Saved" ? "idle" : model.saving,
                error: "",
            },
            [],
        ]
    }
    if (message._tag === "Failed")
        return message.domain_id === model.domain_id
            ? [{ ...model, saving: "idle", error: message.details }, []]
            : [model, []]
    if (model.saving !== "idle" || Option.isNone(model.snapshot))
        return [model, []]
    switch (message._tag) {
        case "AddedDivider": {
            if (
                model.sidebar_order.filter(S.is(SidebarDividerId)).length >=
                max_sidebar_dividers
            )
                return [model, []]
            let index = 1
            while (model.sidebar_order.includes(`divider-${index}`)) index++
            return [
                {
                    ...model,
                    sidebar_order: [...model.sidebar_order, `divider-${index}`],
                    dirty_sidebar: true,
                },
                [],
            ]
        }
        case "RemovedDivider":
            return [
                {
                    ...model,
                    sidebar_order: model.sidebar_order.filter(
                        (id) => id !== message.id
                    ),
                    dirty_sidebar: true,
                    drag_and_drop: init().drag_and_drop,
                },
                [],
            ]
        case "ToggleHidden":
            if (message.id === "Settings") return [model, []]
            return [
                {
                    ...model,
                    hidden_modules: toggle(model.hidden_modules, message.id),
                    dirty_sidebar: true,
                },
                [],
            ]
        case "ToggleModule":
            return model.snapshot.value.can_manage_modules
                ? [
                      {
                          ...model,
                          enabled_modules: toggle(
                              model.enabled_modules,
                              message.id
                          ),
                          dirty_modules: true,
                      },
                      [],
                  ]
                : [model, []]
        case "Save":
            return message.kind === "modules" &&
                !model.snapshot.value.can_manage_modules
                ? [model, []]
                : [{ ...model, saving: message.kind, error: "" }, []]
        case "Cancel":
            return [
                {
                    ...model,
                    ...(message.kind === "sidebar"
                        ? {
                              sidebar_order: normalize_sidebar_order(
                                  model.snapshot.value.sidebar_order
                              ),
                              hidden_modules:
                                  model.snapshot.value.hidden_modules,
                              dirty_sidebar: false,
                          }
                        : {
                              enabled_modules:
                                  model.snapshot.value.enabled_modules,
                              dirty_modules: false,
                          }),
                    drag_and_drop: init().drag_and_drop,
                    error: "",
                },
                [],
            ]
        case "Reset":
            return [
                {
                    ...model,
                    sidebar_order: normalize_sidebar_order([]),
                    hidden_modules: [],
                    dirty_sidebar: true,
                    drag_and_drop: init().drag_and_drop,
                },
                [],
            ]
        case "GotDragAndDropMessage": {
            const {
                model: drag_and_drop,
                commands = [],
                outMessage: out_message_value,
            } = Ui.DragAndDrop.update(model.drag_and_drop, message.message)
            const out_message = Option.fromUndefinedOr(out_message_value)

            let order = model.sidebar_order
            if (
                Option.isSome(out_message) &&
                out_message.value._tag === "Reordered"
            ) {
                const { itemId, toIndex } = out_message.value
                const item = order.find((id) => id === itemId)
                if (item !== undefined) {
                    const remaining = order.filter((id) => id !== item)
                    order = normalize_sidebar_order([
                        ...remaining.slice(0, toIndex),
                        item,
                        ...remaining.slice(toIndex),
                    ])
                }
            }
            return [
                {
                    ...model,
                    sidebar_order: order,
                    dirty_sidebar:
                        model.dirty_sidebar || order !== model.sidebar_order,
                    drag_and_drop,
                },
                commands.map(
                    Command.mapEffect(
                        Effect.map((message) =>
                            GotDragAndDropMessage({ message })
                        )
                    )
                ),
            ]
        }
    }
}
const drag_subscriptions = Subscription.lift(Ui.DragAndDrop.subscriptions)<
    Model,
    Message
>({
    toChildModel: (model) => model.drag_and_drop,
    toParentMessage: (message) => GotDragAndDropMessage({ message }),
    when: (model) => model.saving === "idle" && Option.isSome(model.snapshot),
})
export const subscriptions = {
    sidebarSettingsPointer: drag_subscriptions.documentPointer,
    sidebarSettingsEscape: drag_subscriptions.documentEscape,
    sidebarSettingsKeyboard: drag_subscriptions.documentKeyboard,
    sidebarSettingsAutoScroll: drag_subscriptions.autoScroll,
}
const button_class =
    "rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
export const view = <ParentMessage>(
    model: Model,
    kind: "sidebar" | "modules",
    to_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const disabled = model.saving !== "idle" || Option.isNone(model.snapshot)
    const dragged_id = Ui.DragAndDrop.maybeDraggedItemId(model.drag_and_drop)
    const drop_target = Ui.DragAndDrop.maybeDropTarget(model.drag_and_drop)
    const ghost_style = Ui.DragAndDrop.ghostStyle(model.drag_and_drop)
    const can_manage =
        Option.isSome(model.snapshot) && model.snapshot.value.can_manage_modules
    const button = (label: string, message: Message, blocked = disabled) =>
        h.button(
            [
                h.Type("button"),
                h.Class(button_class),
                h.Disabled(blocked),
                h.OnClick(to_message(message)),
            ],
            [label]
        )
    return h.div(
        [h.Class("mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 sm:px-6")],
        [
            ...(Option.isSome(ghost_style) && Option.isSome(dragged_id)
                ? [
                      h.div(
                          [
                              h.Style(ghost_style.value),
                              h.AriaHidden(true),
                              h.Class(
                                  "z-50 flex items-center gap-2 rounded-[var(--radius-control)] border border-primary bg-card px-3 py-2 shadow-lg"
                              ),
                          ],
                          [
                              IconGripVertical({ class: "size-5" }),
                              S.is(SidebarDividerId)(dragged_id.value)
                                  ? "Divider"
                                  : sidebar_item_label(dragged_id.value),
                          ]
                      ),
                  ]
                : []),
            h.div(
                [h.Class("grid gap-2")],
                [
                    h.h1(
                        [h.Class("text-2xl font-semibold")],
                        [kind === "sidebar" ? "Sidebar" : "Modules"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            kind === "sidebar"
                                ? "Arrange your sidebar for this domain. Hidden items remain accessible by their links. Drag an item, or focus it and press Space, use arrow keys, then Space to drop."
                                : "Enable features for everyone in this domain. Disabling a module preserves its data.",
                        ]
                    ),
                ]
            ),
            ...(model.error
                ? [
                      h.p(
                          [h.Role("alert"), h.Class("text-destructive")],
                          [model.error]
                      ),
                  ]
                : []),
            ...(Option.isNone(model.snapshot)
                ? [
                      h.p(
                          [],
                          [
                              model.domain_id
                                  ? "Loading settings…"
                                  : "Select a domain to customize its navigation.",
                          ]
                      ),
                  ]
                : kind === "sidebar"
                  ? [
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            [
                                "Dashboard has a fixed position. Settings can be reordered and always stays visible.",
                            ]
                        ),
                        h.div(
                            [
                                h.Id("sidebar-settings"),
                                h.Class("grid gap-2"),
                                ...Ui.DragAndDrop.droppable(
                                    "sidebar-order",
                                    "Sidebar order"
                                ),
                            ],
                            model.sidebar_order.map((id, index) => {
                                const label = S.is(SidebarDividerId)(id)
                                    ? "Divider"
                                    : sidebar_item_label(id)
                                const module_id =
                                    S.decodeUnknownOption(ModuleId)(id)
                                const unavailable =
                                    Option.isSome(module_id) &&
                                    Option.isSome(model.snapshot) &&
                                    !model.snapshot.value.enabled_modules.includes(
                                        module_id.value
                                    )
                                return h.keyed("div")(
                                    id,
                                    [
                                        h.Class(
                                            `flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border bg-card p-3 ${Option.contains(dragged_id, id) ? "ring-2 ring-primary" : ""} ${Option.exists(drop_target, (target) => target.index === index) ? "border-t-2 border-t-primary" : ""}`
                                        ),
                                    ],
                                    [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Disabled(
                                                    disabled ||
                                                        is_nested_sidebar_item(
                                                            id
                                                        )
                                                ),
                                                h.Class(
                                                    "grid size-9 shrink-0 touch-none cursor-grab place-items-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
                                                ),
                                                h.AriaLabel(`Reorder ${label}`),
                                                ...(disabled ||
                                                is_nested_sidebar_item(id)
                                                    ? []
                                                    : Ui.DragAndDrop.draggable(
                                                          {
                                                              model: model.drag_and_drop,
                                                              itemId: id,
                                                              containerId:
                                                                  "sidebar-order",
                                                              index,
                                                              toParentMessage: (
                                                                  message
                                                              ) =>
                                                                  to_message(
                                                                      GotDragAndDropMessage(
                                                                          {
                                                                              message,
                                                                          }
                                                                      )
                                                                  ),
                                                          },
                                                          h
                                                      )),
                                            ],
                                            [
                                                IconGripVertical({
                                                    class: "size-5",
                                                }),
                                            ]
                                        ),
                                        h.div(
                                            [h.Class("min-w-0 flex-1")],
                                            [
                                                label,
                                                ...(is_nested_sidebar_item(id)
                                                    ? [
                                                          h.span(
                                                              [
                                                                  h.Class(
                                                                      "ml-2 text-xs text-muted-foreground"
                                                                  ),
                                                              ],
                                                              [
                                                                  "Nested navigation item",
                                                              ]
                                                          ),
                                                      ]
                                                    : []),
                                                ...(S.is(SidebarDividerId)(id)
                                                    ? [
                                                          h.hr([
                                                              h.Class(
                                                                  "mt-2 border-border"
                                                              ),
                                                          ]),
                                                      ]
                                                    : []),
                                                ...(unavailable
                                                    ? [
                                                          h.span(
                                                              [
                                                                  h.Class(
                                                                      "ml-2 text-xs text-muted-foreground"
                                                                  ),
                                                              ],
                                                              [
                                                                  "Disabled for domain",
                                                              ]
                                                          ),
                                                      ]
                                                    : []),
                                            ]
                                        ),
                                        !S.is(SidebarItemId)(id)
                                            ? button(
                                                  "Remove",
                                                  RemovedDivider({ id })
                                              )
                                            : id === "Settings"
                                              ? h.span(
                                                    [
                                                        h.Class(
                                                            "text-sm text-muted-foreground"
                                                        ),
                                                    ],
                                                    ["Always visible"]
                                                )
                                              : button(
                                                    model.hidden_modules.includes(
                                                        id
                                                    )
                                                        ? "Show"
                                                        : "Hide",
                                                    ToggleHidden({ id }),
                                                    disabled || unavailable
                                                ),
                                    ]
                                )
                            })
                        ),
                        h.div(
                            [h.Class("flex flex-wrap gap-2")],
                            [
                                button(
                                    model.saving === "sidebar"
                                        ? "Saving…"
                                        : "Save",
                                    Save({ kind }),
                                    disabled || !model.dirty_sidebar
                                ),
                                button("Cancel", Cancel({ kind })),
                                button(
                                    "Add divider",
                                    AddedDivider(),
                                    disabled ||
                                        model.sidebar_order.filter(
                                            S.is(SidebarDividerId)
                                        ).length >= max_sidebar_dividers
                                ),
                                button("Reset to default", Reset()),
                            ]
                        ),
                    ]
                  : [
                        ...(!can_manage
                            ? [
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "Only domain administrators can change module availability.",
                                      ]
                                  ),
                              ]
                            : []),
                        h.div(
                            [h.Class("grid gap-2")],
                            module_ids.map((id) =>
                                h.div(
                                    [
                                        h.Class(
                                            "flex items-center justify-between rounded-[var(--radius-control)] border border-border bg-card p-3"
                                        ),
                                    ],
                                    [
                                        h.span([], [module_label(id)]),
                                        button(
                                            model.enabled_modules.includes(id)
                                                ? "Disable"
                                                : "Enable",
                                            ToggleModule({ id }),
                                            disabled || !can_manage
                                        ),
                                    ]
                                )
                            )
                        ),
                        h.div(
                            [h.Class("flex gap-2")],
                            [
                                button(
                                    model.saving === "modules"
                                        ? "Saving…"
                                        : "Save",
                                    Save({ kind }),
                                    disabled ||
                                        !can_manage ||
                                        !model.dirty_modules
                                ),
                                button("Cancel", Cancel({ kind })),
                            ]
                        ),
                    ]),
        ]
    )
}
