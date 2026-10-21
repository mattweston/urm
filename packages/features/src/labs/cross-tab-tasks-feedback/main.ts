import {
    Array,
    Clock,
    Effect,
    Match as M,
    Option,
    Queue,
    Random,
    Schema as S,
    Stream,
} from "effect"
import { Command, Subscription } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

const databaseName = "foldkit-cross-tab-tasks"
const objectStore = "items"
const broadcastChannelName = "foldkit-cross-tab-tasks-changes"
const serverUpdateDelayMs = 600
const serverFailureDenominator = 5

export const Item = S.Struct({
    id: S.String,
    text: S.String,
    completed: S.Boolean,
    createdAt: S.Number,
})
export type Item = typeof Item.Type

const Items = S.Array(Item)
const Filter = S.Literals(["All", "Active", "Completed"])
type Filter = typeof Filter.Type

const Idle = taggedStruct("Idle")
const Submitting = taggedStruct("Submitting")
const Updating = taggedStruct("Updating")
const Updated = taggedStruct("Updated")
const Failed = taggedStruct("Failed", { error: S.String })
const SubmissionStatus = S.Union([Idle, Submitting, Updating, Updated, Failed])

export const Model = S.Struct({
    items: Items,
    newItemText: S.String,
    filter: Filter,
    submissionStatus: SubmissionStatus,
    maybeItemsBeforeServerUpdate: S.Option(Items),
})
export type Model = typeof Model.Type

export const UpdatedNewItemText = taggedStruct("UpdatedNewItemText", {
    text: S.String,
})
export const SubmittedNewItem = taggedStruct("SubmittedNewItem")
const GeneratedItem = taggedStruct("GeneratedItem", { item: Item })
export const SelectedFilter = taggedStruct("SelectedFilter", { filter: Filter })
export const ClickedToggleItem = taggedStruct("ClickedToggleItem", {
    id: S.String,
})
export const ClickedDeleteItem = taggedStruct("ClickedDeleteItem", {
    id: S.String,
})
export const ClickedClearCompleted = taggedStruct("ClickedClearCompleted")
export const NotifiedStoreChanged = taggedStruct("NotifiedStoreChanged")
export const ReceivedItems = taggedStruct("ReceivedItems", { items: Items })
export const FailedStoreOperation = taggedStruct("FailedStoreOperation", {
    error: S.String,
})
const CommittedToStore = taggedStruct("CommittedToStore")

export const Message = S.Union([
    UpdatedNewItemText,
    SubmittedNewItem,
    GeneratedItem,
    SelectedFilter,
    ClickedToggleItem,
    ClickedDeleteItem,
    ClickedClearCompleted,
    NotifiedStoreChanged,
    ReceivedItems,
    FailedStoreOperation,
    CommittedToStore,
])
export type Message = typeof Message.Type

const describeError = (error: unknown): string =>
    error instanceof Error ? error.message : "IndexedDB operation failed"

const openDatabase = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        const request = window.indexedDB.open(databaseName, 1)
        request.addEventListener("upgradeneeded", () =>
            request.result.createObjectStore(objectStore, { keyPath: "id" })
        )
        request.addEventListener("success", () => resolve(request.result))
        request.addEventListener("error", () => reject(request.error))
    })

const withStore = <A>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<A>
): Promise<A> =>
    openDatabase().then(
        (database) =>
            new Promise((resolve, reject) => {
                const transaction = database.transaction(objectStore, mode)
                const request = operation(transaction.objectStore(objectStore))
                request.addEventListener("success", () =>
                    resolve(request.result)
                )
                request.addEventListener("error", () => reject(request.error))
                transaction.addEventListener("complete", () => database.close())
                transaction.addEventListener("error", () =>
                    reject(transaction.error)
                )
            })
    )

const readItems = () => withStore("readonly", (store) => store.getAll())
const writeItem = (item: Item) =>
    withStore("readwrite", (store) => store.put(item))
const removeItem = (id: string) =>
    withStore("readwrite", (store) => store.delete(id))
const readItem = (id: string): Promise<Item | undefined> =>
    withStore("readonly", (store) => store.get(id))

const announceChange = () => {
    const channel = new BroadcastChannel(broadcastChannelName)
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no targetOrigin argument.
    channel.postMessage("changed")
    channel.close()
}

const simulateServerUpdate = Effect.gen(function* () {
    yield* Effect.sleep(serverUpdateDelayMs)
    const failureRoll = yield* Random.nextIntBetween(
        0,
        serverFailureDenominator
    )

    if (failureRoll === 0) {
        return yield* Effect.fail("The simulated server rejected the update")
    }
})

const persistAfterServerUpdate = (operation: () => Promise<void>) =>
    simulateServerUpdate.pipe(
        Effect.andThen(() =>
            Effect.tryPromise({ try: operation, catch: describeError })
        ),
        Effect.tap(() => Effect.sync(announceChange)),
        Effect.as(CommittedToStore()),
        Effect.catch((error) => Effect.succeed(FailedStoreOperation({ error })))
    )

export const LoadItems = Command.define("LoadItems", {
    messages: [ReceivedItems, FailedStoreOperation],
    execute: Effect.tryPromise({ try: readItems, catch: describeError }).pipe(
        Effect.map((items) => ReceivedItems({ items })),
        Effect.catch((error) => Effect.succeed(FailedStoreOperation({ error })))
    ),
})

const GenerateItem = Command.define("GenerateItem", {
    args: { text: S.String },
    messages: [GeneratedItem],
    execute: ({ text }) =>
        Effect.gen(function* () {
            const id = yield* Random.nextIntBetween(
                0,
                Number.MAX_SAFE_INTEGER
            ).pipe(Effect.map((value) => value.toString(36)))
            const createdAt = yield* Clock.currentTimeMillis
            return GeneratedItem({
                item: Item.make({ id, text, completed: false, createdAt }),
            })
        }),
})

const AddItem = Command.define("AddItem", {
    args: { item: Item },
    messages: [FailedStoreOperation, CommittedToStore],
    execute: ({ item }) =>
        persistAfterServerUpdate(async () => {
            await writeItem(item)
        }),
})

const ToggleItem = Command.define("ToggleItem", {
    args: { id: S.String },
    messages: [FailedStoreOperation, CommittedToStore],
    execute: ({ id }) =>
        persistAfterServerUpdate(async () => {
            const item = await readItem(id)
            if (item !== undefined) {
                await writeItem({ ...item, completed: !item.completed })
            }
        }),
})

const DeleteItem = Command.define("DeleteItem", {
    args: { id: S.String },
    messages: [FailedStoreOperation, CommittedToStore],
    execute: ({ id }) =>
        persistAfterServerUpdate(async () => {
            await removeItem(id)
        }),
})

const ClearCompleted = Command.define("ClearCompleted", {
    messages: [FailedStoreOperation, CommittedToStore],
    execute: persistAfterServerUpdate(async () => {
        const items = await readItems()
        await Promise.all(
            items
                .filter((item) => item.completed)
                .map((item) => removeItem(item.id))
        )
    }),
})

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    {
        items: [],
        newItemText: "",
        filter: "All",
        submissionStatus: Idle(),
        maybeItemsBeforeServerUpdate: Option.none(),
    },
    [LoadItems()],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedNewItemText: ({ text }) => [
                modifyFields(model, {
                    newItemText: () => text,
                    submissionStatus: () => Idle(),
                }),
                [],
            ],
            SubmittedNewItem: () => {
                const text = model.newItemText.trim()
                if (text === "") {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        newItemText: () => "",
                        submissionStatus: () => Submitting(),
                    }),
                    [GenerateItem({ text })],
                ]
            },
            GeneratedItem: ({ item }) => [
                modifyFields(model, {
                    items: () => [...model.items, item],
                    maybeItemsBeforeServerUpdate: () =>
                        Option.some(model.items),
                }),
                [AddItem({ item })],
            ],
            SelectedFilter: ({ filter }) => [
                modifyFields(model, { filter: () => filter }),
                [],
            ],
            ClickedToggleItem: ({ id }) => [
                modifyFields(model, {
                    items: () =>
                        Array.map(model.items, (item) =>
                            item.id === id
                                ? { ...item, completed: !item.completed }
                                : item
                        ),
                    submissionStatus: () => Updating(),
                    maybeItemsBeforeServerUpdate: () =>
                        Option.some(model.items),
                }),
                [ToggleItem({ id })],
            ],
            ClickedDeleteItem: ({ id }) => [
                modifyFields(model, {
                    items: () =>
                        Array.filter(model.items, (item) => item.id !== id),
                    submissionStatus: () => Updating(),
                    maybeItemsBeforeServerUpdate: () =>
                        Option.some(model.items),
                }),
                [DeleteItem({ id })],
            ],
            ClickedClearCompleted: () => [
                modifyFields(model, {
                    items: () =>
                        Array.filter(model.items, (item) => !item.completed),
                    submissionStatus: () => Updating(),
                    maybeItemsBeforeServerUpdate: () =>
                        Option.some(model.items),
                }),
                [ClearCompleted()],
            ],
            NotifiedStoreChanged: () => [model, [LoadItems()]],
            ReceivedItems: ({ items }) => [
                modifyFields(model, {
                    items: () => items,
                }),
                [],
            ],
            FailedStoreOperation: ({ error }) => [
                modifyFields(model, {
                    items: () =>
                        Option.getOrElse(
                            model.maybeItemsBeforeServerUpdate,
                            () => model.items
                        ),
                    submissionStatus: () => Failed({ error }),
                    maybeItemsBeforeServerUpdate: () => Option.none(),
                }),
                [],
            ],
            CommittedToStore: () => [
                modifyFields(model, {
                    submissionStatus: () => Updated(),
                    maybeItemsBeforeServerUpdate: () => Option.none(),
                }),
                [LoadItems()],
            ],
        })
    )

const storeChanges = Stream.callback<Message>((queue) =>
    Effect.acquireRelease(
        Effect.sync(() => {
            const channel = new BroadcastChannel(broadcastChannelName)
            const notify = () =>
                Queue.offerUnsafe(queue, NotifiedStoreChanged())
            channel.addEventListener("message", notify)
            return { channel, notify }
        }),
        ({ channel, notify }) =>
            Effect.sync(() => {
                channel.removeEventListener("message", notify)
                channel.close()
            })
    ).pipe(Effect.flatMap(() => Effect.never))
)

export const subscriptions = Subscription.make<Model, Message>()(() => ({
    feedbackStoreChanges: Subscription.persistent(storeChanges),
}))

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const visibleItems = Array.filter(
        model.items,
        (item) =>
            model.filter === "All" ||
            (model.filter === "Active" ? !item.completed : item.completed)
    )
    const completedCount = Array.length(
        Array.filter(model.items, (item) => item.completed)
    )
    const submissionStatusView = M.value(model.submissionStatus).pipe(
        M.tagsExhaustive({
            Idle: () => h.empty,
            Submitting: () =>
                h.p(
                    [
                        h.Role("status"),
                        h.Class(
                            "flex items-center gap-2 text-sm text-amber-600"
                        ),
                    ],
                    ["⏳", "Submitting task…"]
                ),
            Updating: () =>
                h.p(
                    [
                        h.Role("status"),
                        h.Class(
                            "flex items-center gap-2 text-sm text-amber-600"
                        ),
                    ],
                    ["⏳", "Updating tasks…"]
                ),
            Updated: () =>
                h.p(
                    [
                        h.Role("status"),
                        h.Class(
                            "flex items-center gap-2 text-sm text-emerald-700"
                        ),
                    ],
                    ["✓", "Tasks updated"]
                ),
            Failed: ({ error }) =>
                h.p(
                    [
                        h.Role("alert"),
                        h.Class(
                            "flex items-center gap-2 text-sm text-destructive"
                        ),
                    ],
                    ["!", `Couldn’t update tasks: ${error}`]
                ),
        })
    )

    return h.div(
        [
            h.Class(
                "mx-auto max-w-xl space-y-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground"
            ),
        ],
        [
            h.div(
                [],
                [
                    h.h1(
                        [h.Class("text-2xl font-bold")],
                        ["Cross-tab tasks feedback"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Optimistic changes are persisted only after the simulated server accepts them. Open this page in a second tab to see committed changes appear in both.",
                        ]
                    ),
                ]
            ),
            h.form(
                [
                    h.Class("flex gap-2"),
                    h.OnSubmit(toParentMessage(SubmittedNewItem())),
                ],
                [
                    h.input([
                        h.AriaLabel("New task"),
                        h.Value(model.newItemText),
                        h.OnInput((text) =>
                            toParentMessage(UpdatedNewItemText({ text }))
                        ),
                        h.Class(
                            "min-w-0 flex-1 rounded border-(length:--field-border-width) border-input bg-background px-3 py-2"
                        ),
                    ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Class(
                                "rounded bg-primary px-4 py-2 text-primary-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Add"]
                    ),
                ]
            ),
            submissionStatusView,
            h.div(
                [h.Class("flex gap-2")],
                (["All", "Active", "Completed"] as const).map((filter) =>
                    h.button(
                        [
                            h.OnClick(
                                toParentMessage(SelectedFilter({ filter }))
                            ),
                            h.Class(
                                model.filter === filter
                                    ? "rounded bg-primary px-3 py-1 text-primary-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    : "rounded bg-muted px-3 py-1"
                            ),
                        ],
                        [filter]
                    )
                )
            ),
            h.ul(
                [h.Class("space-y-2")],
                visibleItems.map((item) =>
                    h.keyed("li")(
                        item.id,
                        [
                            h.Class(
                                "flex items-center gap-3 rounded border-(length:--surface-border-width) border-border p-3"
                            ),
                        ],
                        [
                            h.input([
                                h.Type("checkbox"),
                                h.AriaLabel(item.text),
                                h.Checked(item.completed),
                                h.OnClick(
                                    toParentMessage(
                                        ClickedToggleItem({ id: item.id })
                                    )
                                ),
                            ]),
                            h.span(
                                [
                                    h.Class(
                                        item.completed
                                            ? "flex-1 line-through text-muted-foreground"
                                            : "flex-1"
                                    ),
                                ],
                                [item.text]
                            ),
                            h.button(
                                [
                                    h.AriaLabel(`Delete ${item.text}`),
                                    h.OnClick(
                                        toParentMessage(
                                            ClickedDeleteItem({ id: item.id })
                                        )
                                    ),
                                    h.Class("text-destructive"),
                                ],
                                ["Delete"]
                            ),
                        ]
                    )
                )
            ),
            h.div(
                [
                    h.Class(
                        "flex items-center justify-between text-sm text-muted-foreground"
                    ),
                ],
                [
                    h.span(
                        [],
                        [
                            `${model.items.length - completedCount} active, ${completedCount} completed`,
                        ]
                    ),
                    completedCount === 0
                        ? h.empty
                        : h.button(
                              [
                                  h.OnClick(
                                      toParentMessage(ClickedClearCompleted())
                                  ),
                                  h.Class("text-destructive"),
                              ],
                              [`Clear ${completedCount} completed`]
                          ),
                ]
            ),
        ]
    )
}
