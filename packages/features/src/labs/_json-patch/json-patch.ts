import { JsonPatch, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Diff"),
    S.Literal("Apply"),
    S.Literal("Arrays"),
    S.Literal("Pointers"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Diff",
    "Apply",
    "Arrays",
    "Pointers",
]

export const DiffCase = S.Union([
    S.Literal("Nested"),
    S.Literal("Identical"),
    S.Literal("Root"),
])
export type DiffCase = typeof DiffCase.Type

export const ApplyCase = S.Union([
    S.Literal("Manual"),
    S.Literal("Generated"),
    S.Literal("Empty"),
])
export type ApplyCase = typeof ApplyCase.Type

export const ArrayCase = S.Union([
    S.Literal("ReplaceRemove"),
    S.Literal("Grow"),
    S.Literal("Append"),
])
export type ArrayCase = typeof ArrayCase.Type

export const PointerCase = S.Union([
    S.Literal("Escaping"),
    S.Literal("Sequential"),
    S.Literal("Errors"),
])
export type PointerCase = typeof PointerCase.Type

export const Model = S.Struct({
    stage: Stage,
    diffCase: DiffCase,
    applyCase: ApplyCase,
    arrayCase: ArrayCase,
    pointerCase: PointerCase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Diff: {
        eyebrow: "deterministic structural diff",
        title: "get computes an ordered add / remove / replace document",
        description:
            "JsonPatch.get recursively compares JSON values. Identical values produce no operations, object keys are processed in sorted order, primitive or incompatible structural changes become replace operations, and the empty path targets the root.",
        code: `const before = {
    users: [
        {
            id: 1,
            name: "Alice"
        }
    ],
    count: 1
}

const after = {
    users: [
        {
            id: 1,
            name: "Bob"
        },
        {
            id: 2,
            name: "Charlie"
        }
    ],
    count: 2
}

const patch =
    JsonPatch.get(
        before,
        after
    )`,
        apis: [
            "JsonPatch.get",
            "JsonPatch.JsonPatch",
            "JsonPatch.JsonPatchOperation",
        ],
        notice: "The generated patch is deterministic but not promised to be minimal. Arrays are compared positionally; there is no move or copy detection.",
    },

    Apply: {
        eyebrow: "immutable replay",
        title: "apply executes operations sequentially without mutating the input",
        description:
            "Patch operations are replayed from first to last, so later operations see earlier edits. Changed arrays and objects are copied along the affected path. Empty patches return the original reference; root replacement returns the supplied value directly.",
        code: `const patch:
    JsonPatch.JsonPatch = [
        {
            op: "add",
            path: "/items/-",
            value: 4
        },
        {
            op: "replace",
            path: "/total",
            value: 10
        }
    ]

const before = {
    items: [1, 2, 3],
    total: 6
}

const after =
    JsonPatch.apply(
        patch,
        before
    )`,
        apis: [
            "JsonPatch.apply",
            "JsonPatch.JsonPatch",
            "JsonPatch.JsonPatchOperation",
        ],
        notice: "apply is immutable at the document boundary. It copies only the containers needed to rebuild the changed path; unchanged references outside that path may remain shared.",
    },

    Arrays: {
        eyebrow: "index-based array semantics",
        title: "Array diffs compare positions, remove from the end, and append with '-'",
        description:
            "Generated array patches recurse through the shared prefix, emit removals from highest index to lowest to avoid shifting, then emit additions in ascending order. Manual add operations may use '-' to append.",
        code: `JsonPatch.get(
    ["a", "b", "c", "d"],
    ["A", "b"]
)
// replace /0
// remove /3
// remove /2

JsonPatch.apply(
    [
        {
            op: "add",
            path: "/items/-",
            value: "c"
        }
    ],
    {
        items: ["a", "b"]
    }
)
// { items: ["a", "b", "c"] }`,
        apis: ["JsonPatch.get", "JsonPatch.apply"],
        notice: "For arrays, '-' is accepted only by add. Numeric tokens must be canonical non-negative indexes, and add may insert at index equal to the current array length.",
    },

    Pointers: {
        eyebrow: "RFC 6901 paths + sequential state",
        title: "Object keys are escaped into JSON Pointer tokens before patching",
        description:
            "Generated paths escape '~' as '~0' and '/' as '~1'. The empty string refers to the root. Manual operations are sequential, so an add can create a location that a later replace immediately observes.",
        code: `const before = {
    "a/b": 1,
    "c~d": 2
}

const after = {
    "a/b": 10,
    "c~d": 20
}

JsonPatch.get(
    before,
    after
)
// /a~1b
// /c~0d

JsonPatch.apply(
    [
        {
            op: "replace",
            path: "",
            value: {
                ok: true
            }
        }
    ],
    before
)`,
        apis: [
            "JsonPatch.get",
            "JsonPatch.apply",
            "JsonPatch.JsonPatchOperation",
        ],
        notice: "Invalid JSON Pointer syntax, missing parents, missing remove / replace properties, unsupported root remove, and out-of-bounds array indexes throw ordinary Errors.",
    },
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const json_text = (value: S.Json): string => JSON.stringify(value)

const patch_text = (patch: JsonPatch.JsonPatch): string =>
    patch
        .map((operation: JsonPatch.JsonPatchOperation, index: number) => {
            const value =
                operation.op === "remove"
                    ? ""
                    : ` = ${json_text(operation.value)}`

            return `${index + 1}. ${operation.op} ${operation.path === "" ? "<root>" : operation.path}${value}`
        })
        .join("\n")

const try_apply = (patch: JsonPatch.JsonPatch, value: S.Json): string => {
    try {
        return json_text(JsonPatch.apply(patch, value))
    } catch (error: unknown) {
        return error instanceof Error ? error.message : String(error)
    }
}

// -----------------------------------------------------------------------------
// DIFF SNAPSHOT
// -----------------------------------------------------------------------------

export type DiffSnapshot = Readonly<{
    mode: DiffCase
    before: string
    after: string
    operationCount: number
    patch: string
    operationKinds: string
    roundTrip: string
}>

export const diff_snapshot = (model: Model): DiffSnapshot => {
    if (model.diffCase === "Identical") {
        const before: S.Json = {
            id: 1,
            name: "same",
            flags: [true, false],
        }

        const patch = JsonPatch.get(before, before)

        return {
            mode: model.diffCase,
            before: json_text(before),
            after: json_text(before),
            operationCount: patch.length,
            patch: "(empty patch)",
            operationKinds: "none",
            roundTrip: json_text(JsonPatch.apply(patch, before)),
        }
    }

    if (model.diffCase === "Root") {
        const before: S.Json = "draft"

        const after: S.Json = {
            status: "published",
        }

        const patch = JsonPatch.get(before, after)

        return {
            mode: model.diffCase,
            before: json_text(before),
            after: json_text(after),
            operationCount: patch.length,
            patch: patch_text(patch),
            operationKinds: patch
                .map((operation: JsonPatch.JsonPatchOperation) => operation.op)
                .join(", "),
            roundTrip: json_text(JsonPatch.apply(patch, before)),
        }
    }

    const before: S.Json = {
        users: [
            {
                id: 1,
                name: "Alice",
            },
        ],
        count: 1,
        meta: {
            active: true,
        },
    }

    const after: S.Json = {
        users: [
            {
                id: 1,
                name: "Bob",
            },
            {
                id: 2,
                name: "Charlie",
            },
        ],
        count: 2,
        meta: {
            active: true,
            source: "sync",
        },
    }

    const patch = JsonPatch.get(before, after)

    return {
        mode: model.diffCase,
        before: json_text(before),
        after: json_text(after),
        operationCount: patch.length,
        patch: patch_text(patch),
        operationKinds: patch
            .map((operation: JsonPatch.JsonPatchOperation) => operation.op)
            .join(", "),
        roundTrip: json_text(JsonPatch.apply(patch, before)),
    }
}

// -----------------------------------------------------------------------------
// APPLY SNAPSHOT
// -----------------------------------------------------------------------------

export type ApplySnapshot = Readonly<{
    mode: ApplyCase
    before: string
    patch: string
    result: string
    originalAfter: string
    inputUnchanged: boolean
    sameReference: boolean
    rootReplace: string
}>

export const apply_snapshot = (model: Model): ApplySnapshot => {
    const before = {
        items: [1, 2, 3],
        total: 6,
        oldField: "remove-me",
    } satisfies S.Json

    if (model.applyCase === "Empty") {
        const patch: JsonPatch.JsonPatch = []

        const result = JsonPatch.apply(patch, before)

        return {
            mode: model.applyCase,
            before: json_text(before),
            patch: "(empty patch)",
            result: json_text(result),
            originalAfter: json_text(before),
            inputUnchanged: true,
            sameReference: result === before,
            rootReplace: "not selected",
        }
    }

    const patch: JsonPatch.JsonPatch =
        model.applyCase === "Generated"
            ? JsonPatch.get(before, {
                  items: [1, 2, 3, 4],
                  total: 10,
              })
            : [
                  {
                      op: "add",
                      path: "/items/-",
                      value: 4,
                      description: "append the new item",
                  },
                  {
                      op: "replace",
                      path: "/total",
                      value: 10,
                  },
                  {
                      op: "remove",
                      path: "/oldField",
                  },
              ]

    const beforeText = json_text(before)

    const result = JsonPatch.apply(patch, before)

    const rootReplace = JsonPatch.apply(
        [
            {
                op: "replace",
                path: "",
                value: {
                    ready: true,
                },
            },
        ],
        before
    )

    return {
        mode: model.applyCase,
        before: beforeText,
        patch: patch_text(patch),
        result: json_text(result),
        originalAfter: json_text(before),
        inputUnchanged: json_text(before) === beforeText,
        sameReference: result === before,
        rootReplace: json_text(rootReplace),
    }
}

// -----------------------------------------------------------------------------
// ARRAY SNAPSHOT
// -----------------------------------------------------------------------------

export type ArraySnapshot = Readonly<{
    mode: ArrayCase
    before: string
    after: string
    patch: string
    operationCount: number
    applied: string
    ordering: string
    appendResult: string
}>

export const array_snapshot = (model: Model): ArraySnapshot => {
    if (model.arrayCase === "Grow") {
        const before: S.Json = [1]

        const after: S.Json = [1, 2, 3]

        const patch = JsonPatch.get(before, after)

        return {
            mode: model.arrayCase,
            before: json_text(before),
            after: json_text(after),
            patch: patch_text(patch),
            operationCount: patch.length,
            applied: json_text(JsonPatch.apply(patch, before)),
            ordering: "adds ascend: /1 then /2",
            appendResult: "not selected",
        }
    }

    if (model.arrayCase === "Append") {
        const before: S.Json = {
            items: ["a", "b"],
        }

        const patch: JsonPatch.JsonPatch = [
            {
                op: "add",
                path: "/items/-",
                value: "c",
            },
        ]

        const result = JsonPatch.apply(patch, before)

        return {
            mode: model.arrayCase,
            before: json_text(before),
            after: json_text(result),
            patch: patch_text(patch),
            operationCount: patch.length,
            applied: json_text(result),
            ordering: '"-" appends at current length',
            appendResult: json_text(result),
        }
    }

    const before: S.Json = ["a", "b", "c", "d"]

    const after: S.Json = ["A", "b"]

    const patch = JsonPatch.get(before, after)

    return {
        mode: model.arrayCase,
        before: json_text(before),
        after: json_text(after),
        patch: patch_text(patch),
        operationCount: patch.length,
        applied: json_text(JsonPatch.apply(patch, before)),
        ordering: "replace /0 · remove /3 · remove /2",
        appendResult: "not selected",
    }
}

// -----------------------------------------------------------------------------
// POINTER SNAPSHOT
// -----------------------------------------------------------------------------

export type PointerSnapshot = Readonly<{
    mode: PointerCase
    generatedPaths: string
    patch: string
    result: string
    rootPath: string
    sequential: string
    error: string
}>

export const pointer_snapshot = (model: Model): PointerSnapshot => {
    const before: S.Json = {
        "a/b": 1,
        "c~d": 2,
    }

    const after: S.Json = {
        "a/b": 10,
        "c~d": 20,
    }

    const escaped = JsonPatch.get(before, after)

    const sequentialPatch: JsonPatch.JsonPatch = [
        {
            op: "add",
            path: "/items/-",
            value: "b",
        },
        {
            op: "replace",
            path: "/items/1",
            value: "B",
        },
        {
            op: "add",
            path: "/ready",
            value: true,
        },
    ]

    const sequential = JsonPatch.apply(sequentialPatch, {
        items: ["a"],
    })

    const root = JsonPatch.apply(
        [
            {
                op: "replace",
                path: "",
                value: ["root"],
            },
        ],
        before
    )

    const invalid = try_apply(
        [
            {
                op: "replace",
                path: "/missing",
                value: 1,
            },
        ],
        {}
    )

    return {
        mode: model.pointerCase,
        generatedPaths: escaped
            .map((operation: JsonPatch.JsonPatchOperation) => operation.path)
            .join(" · "),
        patch:
            model.pointerCase === "Sequential"
                ? patch_text(sequentialPatch)
                : patch_text(escaped),
        result:
            model.pointerCase === "Sequential"
                ? json_text(sequential)
                : json_text(JsonPatch.apply(escaped, before)),
        rootPath: json_text(root),
        sequential: json_text(sequential),
        error: invalid,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedJsonPatchStage: {
        stage: Stage,
    },
    SelectedJsonPatchDiffCase: {
        diffCase: DiffCase,
    },
    SelectedJsonPatchApplyCase: {
        applyCase: ApplyCase,
    },
    SelectedJsonPatchArrayCase: {
        arrayCase: ArrayCase,
    },
    SelectedJsonPatchPointerCase: {
        pointerCase: PointerCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Diff",
    diffCase: "Nested",
    applyCase: "Manual",
    arrayCase: "ReplaceRemove",
    pointerCase: "Escaping",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type DiffCasePayload = Readonly<{
    diffCase: DiffCase
}>

type ApplyCasePayload = Readonly<{
    applyCase: ApplyCase
}>

type ArrayCasePayload = Readonly<{
    arrayCase: ArrayCase
}>

type PointerCasePayload = Readonly<{
    pointerCase: PointerCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedJsonPatchStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedJsonPatchDiffCase: ({ diffCase }: DiffCasePayload) => ({
            model: modifyFields(model, {
                diffCase: () => diffCase,
            }),
        }),

        SelectedJsonPatchApplyCase: ({ applyCase }: ApplyCasePayload) => ({
            model: modifyFields(model, {
                applyCase: () => applyCase,
            }),
        }),

        SelectedJsonPatchArrayCase: ({ arrayCase }: ArrayCasePayload) => ({
            model: modifyFields(model, {
                arrayCase: () => arrayCase,
            }),
        }),

        SelectedJsonPatchPointerCase: ({
            pointerCase,
        }: PointerCasePayload) => ({
            model: modifyFields(model, {
                pointerCase: () => pointerCase,
            }),
        }),
    })
