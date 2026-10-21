import clsx from "clsx"
import {
    Array,
    Clock,
    Crypto,
    Effect,
    Layer,
    Match as M,
    Option,
    Queue,
    Schema as S,
    Stream,
    String,
} from "effect"
import { AsyncData, Command, Runtime, Subscription } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import {
    BrowserCrypto,
    IndexedDb,
    IndexedDbDatabase,
    IndexedDbTable,
    IndexedDbVersion,
} from "@effect/platform-browser"
import { Button, Checkbox, Input } from "@foldkit/ui"

// CONSTANT

const DATABASE_NAME = "foldkit-cross-tab-tasks"
const OBJECT_STORE = "items"
const BROADCAST_CHANNEL_NAME = "foldkit-cross-tab-tasks-changes"
const STORE_CHANGED = "StoreChanged"

// MODEL

export const Item = S.Struct({
    id: S.String,
    text: S.String,
    completed: S.Boolean,
    createdAt: S.Number,
})
export type Item = typeof Item.Type

const Items = S.Array(Item)
type Items = typeof Items.Type

const ItemsData = AsyncData.Schema(Items, S.String)

const Filter = S.Literals(["All", "Active", "Completed"])
type Filter = typeof Filter.Type

export const Model = S.Struct({
    items: ItemsData.schema,
    newItemText: S.String,
    filter: Filter,
})
export type Model = typeof Model.Type

// STORE

class ItemsTable extends IndexedDbTable.make({
    name: OBJECT_STORE,
    schema: Item,
    keyPath: "id",
}) {}

class StoreV1 extends IndexedDbVersion.make(ItemsTable) {}

class Store extends IndexedDbDatabase.make(
    StoreV1,
    Effect.fn(function* (query) {
        yield* query.createObjectStore(OBJECT_STORE)
    })
) {}

export type StoreService = IndexedDbDatabase.IndexedDbDatabase

/** The Layer that opens the IndexedDB database once and shares it with every
 *  Command and Subscription for the application's lifetime. Passed to
 *  `makeApplication` as `resources`. `Layer.orDie` turns a failure to open the
 *  database into a defect: if the store cannot be constructed, no Command that
 *  reads or writes it is safe to run. */
export const resources: Layer.Layer<StoreService> = Store.layer(
    DATABASE_NAME
).pipe(Layer.provide(IndexedDb.layerWindow), Layer.orDie)

// MESSAGE

export const UpdatedNewItemText = taggedStruct("UpdatedNewItemText", {
    text: S.String,
})
export const SubmittedNewItem = taggedStruct("SubmittedNewItem")
export const SelectedFilter = taggedStruct("SelectedFilter", { filter: Filter })
export const ClickedToggleItem = taggedStruct("ClickedToggleItem", {
    id: S.String,
})
export const ClickedDeleteItem = taggedStruct("ClickedDeleteItem", {
    id: S.String,
})
export const ClickedClearCompleted = taggedStruct("ClickedClearCompleted")
export const ClickedRetry = taggedStruct("ClickedRetry")
export const NotifiedStoreChanged = taggedStruct("NotifiedStoreChanged")
export const CommittedToStore = taggedStruct("CommittedToStore")
export const ReceivedItems = taggedStruct("ReceivedItems", { items: Items })
export const FailedStoreOperation = taggedStruct("FailedStoreOperation", {
    error: S.String,
})

export const Message = S.Union([
    UpdatedNewItemText,
    SubmittedNewItem,
    SelectedFilter,
    ClickedToggleItem,
    ClickedDeleteItem,
    ClickedClearCompleted,
    ClickedRetry,
    NotifiedStoreChanged,
    CommittedToStore,
    ReceivedItems,
    FailedStoreOperation,
])
export type Message = typeof Message.Type

type Commands = ReadonlyArray<Command.Command<Message, never, StoreService>>

// INIT

export const init: Runtime.ApplicationInit<
    Model,
    Message,
    void,
    StoreService
> = () => ({
    model: {
        items: ItemsData.Loading(),
        newItemText: "",
        filter: "All",
    },
    commands: [LoadItems()],
})

// UPDATE

const toErrorState = (
    items: AsyncData.AsyncData<Items, string>,
    error: string
): AsyncData.AsyncData<Items, string> =>
    Option.match(AsyncData.getData(items), {
        onNone: () => ItemsData.Failure({ error }),
        onSome: (data) => ItemsData.Stale({ data, error }),
    })

export const update = (
    model: Model,
    message: Message
): readonly [Model, Commands] =>
    M.value(message).pipe(
        M.withReturnType<readonly [Model, Commands]>(),
        M.tagsExhaustive({
            UpdatedNewItemText: ({ text }) => [
                modifyFields(model, {
                    newItemText: () => text,
                }),
                [],
            ],

            SubmittedNewItem: () => {
                const trimmed = String.trim(model.newItemText)

                if (String.isEmpty(trimmed)) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        newItemText: () => "",
                    }),
                    [AddItem({ text: trimmed })],
                ]
            },

            SelectedFilter: ({ filter }) => [
                modifyFields(model, {
                    filter: () => filter,
                }),
                [],
            ],

            ClickedToggleItem: ({ id }) => [model, [ToggleItem({ id })]],

            ClickedDeleteItem: ({ id }) => [model, [DeleteItem({ id })]],

            ClickedClearCompleted: () => [model, [ClearCompleted()]],

            ClickedRetry: () => [
                modifyFields(model, {
                    items: () => ItemsData.Loading(),
                }),
                [LoadItems()],
            ],

            NotifiedStoreChanged: () => [model, [LoadItems()]],

            CommittedToStore: () => [model, []],

            ReceivedItems: ({ items }) => [
                modifyFields(model, {
                    items: () => ItemsData.Success({ data: items }),
                }),
                [],
            ],

            FailedStoreOperation: ({ error }) => [
                modifyFields(model, {
                    items: () => toErrorState(model.items, error),
                }),
                [],
            ],
        })
    )

// COMMAND

const describeError = (error: unknown): string =>
    error instanceof Error ? error.message : "Something went wrong"

const announceChange: Effect.Effect<void> = Effect.sync(() => {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no targetOrigin argument.
    channel.postMessage(STORE_CHANGED)
    channel.close()
})

export const LoadItems = Command.define("LoadItems", {
    messages: [ReceivedItems, FailedStoreOperation],
    execute: Effect.gen(function* () {
        const db = yield* Store
        const items = yield* db.from(OBJECT_STORE).select()
        return ReceivedItems({ items })
    }).pipe(
        Effect.catch((error) =>
            Effect.succeed(
                FailedStoreOperation({ error: describeError(error) })
            )
        )
    ),
})

export const AddItem = Command.define("AddItem", {
    args: { text: S.String },
    messages: [CommittedToStore, FailedStoreOperation],
    execute: ({ text }) =>
        Effect.gen(function* () {
            const crypto = yield* Crypto.Crypto
            const id = yield* Effect.orDie(crypto.randomUUIDv4)
            const createdAt = yield* Clock.currentTimeMillis
            const db = yield* Store
            yield* db
                .from(OBJECT_STORE)
                .insert({ id, text, completed: false, createdAt })
            yield* announceChange
            return CommittedToStore()
        }).pipe(
            Effect.provide(BrowserCrypto.layer),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedStoreOperation({ error: describeError(error) })
                )
            )
        ),
})

export const ToggleItem = Command.define("ToggleItem", {
    args: { id: S.String },
    messages: [CommittedToStore, FailedStoreOperation],
    execute: ({ id }) =>
        Effect.gen(function* () {
            const db = yield* Store
            const matches = yield* db.from(OBJECT_STORE).select().equals(id)
            const maybeItem = Array.head(matches)
            if (Option.isSome(maybeItem)) {
                yield* db.from(OBJECT_STORE).upsert({
                    ...maybeItem.value,
                    completed: !maybeItem.value.completed,
                })
            }
            yield* announceChange
            return CommittedToStore()
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    FailedStoreOperation({ error: describeError(error) })
                )
            )
        ),
})

export const DeleteItem = Command.define("DeleteItem", {
    args: { id: S.String },
    messages: [CommittedToStore, FailedStoreOperation],
    execute: ({ id }) =>
        Effect.gen(function* () {
            const db = yield* Store
            yield* db.from(OBJECT_STORE).delete().equals(id)
            yield* announceChange
            return CommittedToStore()
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    FailedStoreOperation({ error: describeError(error) })
                )
            )
        ),
})

export const ClearCompleted = Command.define("ClearCompleted", {
    messages: [CommittedToStore, FailedStoreOperation],
    execute: Effect.gen(function* () {
        const db = yield* Store
        const items = yield* db.from(OBJECT_STORE).select()
        yield* Effect.forEach(
            Array.filter(items, (item) => item.completed),
            (item) => db.from(OBJECT_STORE).delete().equals(item.id),
            { discard: true }
        )
        yield* announceChange
        return CommittedToStore()
    }).pipe(
        Effect.catch((error) =>
            Effect.succeed(
                FailedStoreOperation({ error: describeError(error) })
            )
        )
    ),
})

// SUBSCRIPTION

// NOTE: A BroadcastChannel never receives a message it itself sent, but every
// other same-origin channel does, including sibling instances in the same tab.
// Writes post on a throwaway channel (announceChange), so this long-lived
// listener hears every commit, from this tab and every other tab alike. That
// makes it the single reactive feed: local and remote writes both arrive here
// and trigger the same reload.
const streamStoreChanges = Stream.callback<Message>((queue) =>
    Effect.acquireRelease(
        Effect.sync(() => {
            const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
            const handleMessage = () => {
                Queue.offerUnsafe(queue, NotifiedStoreChanged())
            }
            channel.addEventListener("message", handleMessage)
            return { channel, handleMessage }
        }),
        ({ channel, handleMessage }) =>
            Effect.sync(() => {
                channel.removeEventListener("message", handleMessage)
                channel.close()
            })
    ).pipe(Effect.flatMap(() => Effect.never))
)

export const subscriptions = Subscription.make<Model, Message>()((_entry) => ({
    storeChanges: Subscription.persistent(streamStoreChanges),
}))

// VIEW

const filterItems = (items: Items, filter: Filter): Items =>
    M.value(filter).pipe(
        M.when("All", () => items),
        M.when("Active", () => Array.filter(items, (item) => !item.completed)),
        M.when("Completed", () =>
            Array.filter(items, (item) => item.completed)
        ),
        M.exhaustive
    )

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("min-h-screen bg-background py-8")],
        [
            h.div(
                [
                    h.Class(
                        "max-w-md mx-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    headerView(h),
                    newItemFormView(model.newItemText, toParentMessage, h),
                    AsyncData.matchData(model.items, {
                        onEmpty: () => loadingView(h),
                        onFailure: (error) =>
                            errorView(error, toParentMessage, h),
                        onData: (data) =>
                            loadedView(model, data, toParentMessage, h),
                    }),
                ]
            ),
        ]
    )
}

const headerView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("mb-6 text-center")],
        [
            h.h1(
                [h.Class("text-3xl font-bold tracking-tight text-foreground")],
                ["Cross-Tab Tasks"]
            ),
            h.p(
                [h.Class("mt-2 text-sm text-muted-foreground")],
                [
                    "Stored in IndexedDB. Open this page in a second tab and watch changes appear in both.",
                ]
            ),
        ]
    )

const newItemFormView = <ParentMessage>(
    newItemText: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.form(
        [h.Class("mb-6"), h.OnSubmit(toParentMessage(SubmittedNewItem()))],
        [
            h.div(
                [h.Class("flex gap-3")],
                [
                    Input.view(
                        {
                            id: "new-item",
                            value: newItemText,
                            placeholder: "Add a task...",
                            onInput: (text) =>
                                toParentMessage(UpdatedNewItemText({ text })),
                            toView: (attributes) =>
                                h.input([
                                    ...attributes.input,
                                    h.AriaLabel("New task"),
                                    h.Class(
                                        "flex-1 px-4 py-2 rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    ),
                                ]),
                        },
                        h
                    ),
                    Button.view(
                        {
                            type: "submit",
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(
                                            "rounded-[var(--radius-control)] px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                        ),
                                    ],
                                    ["Add"]
                                ),
                        },
                        h
                    ),
                ]
            ),
        ]
    )

const loadingView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [
            h.Class("py-8 text-center text-sm text-muted-foreground"),
            h.Role("status"),
        ],
        ["Loading..."]
    )

const errorView = <ParentMessage>(
    error: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("py-6")],
        [
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/40 bg-destructive/10 p-4 mb-4"
                    ),
                    h.Role("alert"),
                ],
                [
                    h.p(
                        [h.Class("mb-1 font-semibold text-destructive")],
                        ["Could not read the store"]
                    ),
                    h.p([h.Class("text-sm text-muted-foreground")], [error]),
                ]
            ),
            Button.view(
                {
                    onClick: toParentMessage(ClickedRetry()),
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    "w-full rounded-[var(--radius-control)] bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                ),
                            ],
                            ["Try again"]
                        ),
                },
                h
            ),
        ]
    )

const loadedView = <ParentMessage>(
    model: Model,
    items: Items,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const visibleItems = filterItems(items, model.filter)
    const activeCount = Array.length(
        Array.filter(items, (item) => !item.completed)
    )
    const completedCount = Array.length(items) - activeCount

    return h.div(
        [],
        [
            Option.match(AsyncData.getError(model.items), {
                onNone: () => h.empty,
                onSome: (error) => staleBannerView(error, h),
            }),

            Array.match(visibleItems, {
                onEmpty: () => emptyView(model.filter, h),
                onNonEmpty: (nonEmptyItems) =>
                    h.ul(
                        [h.Class("space-y-2 mb-6")],
                        Array.map(nonEmptyItems, (item) =>
                            itemView(item, toParentMessage, h)
                        )
                    ),
            }),

            footerView(model, activeCount, completedCount, toParentMessage, h),
        ]
    )
}

const staleBannerView = <ParentMessage>(
    error: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-warning/40 bg-warning/10 p-3 mb-4 text-sm text-warning-content"
            ),
            h.Role("alert"),
        ],
        [`Showing the last known tasks. Latest change failed: ${error}`]
    )

const checkboxBoxClassName = (isChecked: boolean): string =>
    clsx(
        "flex h-4 w-4 items-center justify-center rounded border-(length:--surface-border-width) transition cursor-pointer",
        isChecked ? "border-primary bg-primary" : "border-input"
    )

const itemView = <ParentMessage>(
    item: Item,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(
        item.id,
        [
            h.Class(
                "group flex items-center gap-3 rounded-lg p-3 hover:bg-accent"
            ),
        ],
        [
            Checkbox.view(
                {
                    id: `item-${item.id}`,
                    isChecked: item.completed,
                    onToggle: () =>
                        toParentMessage(ClickedToggleItem({ id: item.id })),
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex items-center")],
                            [
                                h.div(
                                    [
                                        ...attributes.checkbox,
                                        h.Class(
                                            checkboxBoxClassName(item.completed)
                                        ),
                                    ],
                                    item.completed
                                        ? [
                                              h.span(
                                                  [
                                                      h.Class(
                                                          "text-primary-foreground text-xs"
                                                      ),
                                                  ],
                                                  ["✓"]
                                              ),
                                          ]
                                        : []
                                ),
                                h.span(
                                    [
                                        ...attributes.label,
                                        h.AriaLabel(item.text),
                                    ],
                                    []
                                ),
                            ]
                        ),
                },
                h
            ),
            h.span(
                [
                    h.Class(
                        clsx(
                            "flex-1",
                            item.completed
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                        )
                    ),
                ],
                [item.text]
            ),
            Button.view(
                {
                    onClick: toParentMessage(
                        ClickedDeleteItem({ id: item.id })
                    ),
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.AriaLabel(`Delete ${item.text}`),
                                h.Class(
                                    "rounded px-2 py-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10"
                                ),
                            ],
                            ["×"]
                        ),
                },
                h
            ),
        ]
    )

const emptyView = <ParentMessage>(
    filter: Filter,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("py-8 text-center text-muted-foreground")],
        [
            M.value(filter).pipe(
                M.when("All", () => "No tasks yet. Add one above!"),
                M.when("Active", () => "No active tasks"),
                M.when("Completed", () => "No completed tasks"),
                M.exhaustive
            ),
        ]
    )

const footerView = <ParentMessage>(
    model: Model,
    activeCount: number,
    completedCount: number,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-4")],
        [
            h.div(
                [
                    h.Class("text-center text-sm text-muted-foreground"),
                    h.Role("status"),
                ],
                [`${activeCount} active, ${completedCount} completed`]
            ),

            h.div(
                [h.Class("flex justify-center gap-2")],
                [
                    filterButtonView(model, toParentMessage, h)("All", "All"),
                    filterButtonView(
                        model,
                        toParentMessage,
                        h
                    )("Active", "Active"),
                    filterButtonView(
                        model,
                        toParentMessage,
                        h
                    )("Completed", "Completed"),
                ]
            ),

            completedCount > 0
                ? h.div(
                      [h.Class("flex justify-center")],
                      [
                          Button.view(
                              {
                                  onClick: toParentMessage(
                                      ClickedClearCompleted()
                                  ),
                                  toView: (attributes) =>
                                      h.button(
                                          [
                                              ...attributes.button,
                                              h.Class(
                                                  "rounded bg-destructive/10 px-3 py-1 text-sm text-destructive hover:bg-destructive/20"
                                              ),
                                          ],
                                          [`Clear ${completedCount} completed`]
                                      ),
                              },
                              h
                          ),
                      ]
                  )
                : h.empty,
        ]
    )

const filterButtonView =
    <ParentMessage>(
        model: Model,
        toParentMessage: (message: Message) => ParentMessage,
        h: HtmlBuilder<ParentMessage>
    ) =>
    (filter: Filter, label: string): Html =>
        Button.view(
            {
                onClick: toParentMessage(SelectedFilter({ filter })),
                toView: (attributes) =>
                    h.button(
                        [
                            ...attributes.button,
                            h.Class(
                                clsx(
                                    "rounded px-3 py-1",
                                    model.filter === filter
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                                )
                            ),
                        ],
                        [label]
                    ),
            },
            h
        )
