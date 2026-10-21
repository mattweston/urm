import { Optic, Option, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN
// -----------------------------------------------------------------------------

export type Profile = Readonly<{
    name: string
    score: number
    nickname?: string
}>

export type Shape =
    | Readonly<{
          _tag: "Circle"
          radius: number
      }>
    | Readonly<{
          _tag: "Rect"
          width: number
      }>

export type DemoState = Readonly<{
    profile: Profile
    values: ReadonlyArray<number>
    env: Readonly<Record<string, number>>
    maybe: Option.Option<number>
    outcome: Result.Result<number, string>
    shape: Shape
}>

export const sample_state: DemoState = {
    profile: {
        name: "Ada",
        score: 7,
        nickname: "ace",
    },
    values: [3, -1, 5, 0],
    env: {
        PORT: 3000,
        RETRIES: 2,
    },
    maybe: Option.some(10),
    outcome: Result.succeed(42),
    shape: {
        _tag: "Circle",
        radius: 5,
    },
}

// -----------------------------------------------------------------------------
// REAL OPTICS
// -----------------------------------------------------------------------------

export const profile_name = Optic.id<DemoState>().key("profile").key("name")

export const profile_nickname = Optic.id<DemoState>()
    .key("profile")
    .optionalKey("nickname")

export const env_port = Optic.id<DemoState>().key("env").at("PORT")

export const circle_radius = Optic.id<Shape>().tag("Circle").key("radius")

export const positive_values = Optic.id<DemoState>()
    .key("values")
    .forEach((value: Optic.Iso<number, number>) =>
        value.check(S.isGreaterThan(0))
    )

export const some_number = Optic.some<number>()

export const success_number = Optic.success<number, string>()

export const numeric_text = Optic.makeIso<number, string>(
    (value: number): string => String(value),
    (text: string): number => Number(text)
)

export const pair_first = Optic.makeLens<readonly [string, number], string>(
    (pair: readonly [string, number]): string => pair[0],
    (
        value: string,
        pair: readonly [string, number]
    ): readonly [string, number] => [value, pair[1]]
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Kinds"),
    S.Literal("Focus"),
    S.Literal("Failure"),
    S.Literal("Traverse"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Kinds",
    "Focus",
    "Failure",
    "Traverse",
]

export const KindsCase = S.Union([
    S.Literal("Models"),
    S.Literal("Compose"),
    S.Literal("Constructors"),
])
export type KindsCase = typeof KindsCase.Type

export const FocusCase = S.Union([
    S.Literal("Key"),
    S.Literal("OptionalKey"),
    S.Literal("Narrow"),
])
export type FocusCase = typeof FocusCase.Type

export const FailureCase = S.Union([
    S.Literal("Read"),
    S.Literal("Replace"),
    S.Literal("Builtins"),
])
export type FailureCase = typeof FailureCase.Type

export const TraverseCase = S.Union([
    S.Literal("Collect"),
    S.Literal("ModifyAll"),
    S.Literal("Entries"),
])
export type TraverseCase = typeof TraverseCase.Type

export const Model = S.Struct({
    stage: Stage,
    kindsCase: KindsCase,
    focusCase: FocusCase,
    failureCase: FailureCase,
    traverseCase: TraverseCase,
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
    Kinds: {
        eyebrow: "optic strength describes focus guarantees",
        title: "Choose Iso, Lens, Prism, Optional, or Traversal based on what can fail and how many values you focus",
        description:
            "Iso converts losslessly both ways. Lens always reads one focus but needs the source to replace it. Prism may fail to read but can construct the source from a focused value. Optional may fail on both read and replacement. Traversal focuses zero or more values.",
        code: `const iso =
    Optic.makeIso<
        number,
        string
    >(
        String,
        Number
    )

const lens =
    Optic.makeLens<
        readonly [
            string,
            number
        ],
        string
    >(
        (
            pair
        ) =>
            pair[0],
        (
            value,
            pair
        ) =>
            [
                value,
                pair[1]
            ]
    )

const optional =
    Optic.id<
        Record<
            string,
            number
        >
    >()
        .at("PORT")`,
        apis: [
            "Optic.Iso",
            "Optic.Lens",
            "Optic.Prism",
            "Optic.Optional",
            "Optic.Traversal",
            "Optic.makeIso",
            "Optic.makeLens",
            "Optic.makePrism",
            "Optic.makeOptional",
            "Optic.fromChecks",
        ],
        notice: "Composition keeps the strongest guarantees both sides support: Iso is neutral, Lens + Lens stays Lens, Prism + Prism stays Prism, and mixing Lens with Prism weakens to Optional.",
    },

    Focus: {
        eyebrow: "immutable structural focus",
        title: "Start from id, drill through fields, remove optional keys, narrow unions, or select existing record keys",
        description:
            "key creates a total field Lens for non-union objects. optionalKey lets undefined mean deletion. at requires the key to exist and therefore yields an Optional. check, refine, tag, and notUndefined add conditional focus; pick and omit focus struct subsets.",
        code: `const name =
    Optic.id<
        DemoState
    >()
        .key("profile")
        .key("name")

name.get(
    sampleState
)
// "Ada"

const nickname =
    Optic.id<
        DemoState
    >()
        .key("profile")
        .optionalKey(
            "nickname"
        )

nickname.replace(
    undefined,
    sampleState
)
// removes nickname

const radius =
    Optic.id<
        Shape
    >()
        .tag("Circle")
        .key("radius")`,
        apis: [
            "Optic.id",
            ".key",
            ".optionalKey",
            ".at",
            ".check",
            ".refine",
            ".tag",
            ".pick",
            ".omit",
            ".notUndefined",
        ],
        notice: "All replacements are immutable: Optic clones the objects / arrays along the focused path rather than mutating the source. key and optionalKey are rejected on union focuses; narrow the union first with tag or refine.",
    },

    Failure: {
        eyebrow: "explicit Result or graceful fallback",
        title: "Read and replace through Result when focus may fail, or use helpers that leave the source unchanged",
        description:
            "get is for total Lens reads. getResult works for Optional focus and preserves SchemaIssue details. replaceResult exposes replacement failure, while replace and modify return the original source when focus fails. set constructs through a Prism without an existing source.",
        code: `Optic.get(
    sampleState,
    profileName
)
// "Ada"

Optic.getResult(
    sampleState,
    envPort
)
// Success(3000)

Optic.getResult(
    {
        ...sampleState,
        env: {}
    },
    envPort
)
// Failure(MissingKey)

Optic.replace(
    {
        ...sampleState,
        env: {}
    },
    envPort,
    8080
)
// original source unchanged

Optic.set(
    12,
    Optic.some<
        number
    >()
)
// Option.some(12)`,
        apis: [
            "Optic.get",
            "Optic.getResult",
            "Optic.set",
            "Optic.replace",
            "Optic.replaceResult",
            "Optic.modify",
            "Optic.some",
            "Optic.none",
            "Optic.success",
            "Optic.failure",
        ],
        notice: "The v4 standalone get/set/replace/modify/getAll/modifyAll functions support both data-first and data-last forms. Failure-aware optics carry SchemaIssue.Issue inside Result rather than throwing.",
    },

    Traverse: {
        eyebrow: "zero or more focused values",
        title: "Traverse arrays or record entries, collect matching values, and modify every selected focus",
        description:
            "forEach turns an array-like focus into a Traversal and can apply a per-element optic to filter or drill deeper. getAll returns a fresh array of matches, while modifyAll maps over each matched element and preserves non-matching values.",
        code: `const positive =
    Optic.id<
        DemoState
    >()
        .key("values")
        .forEach(
            (
                item
            ) =>
                item.check(
                    Schema
                        .isGreaterThan(
                            0
                        )
                )
        )

Optic.getAll(
    sampleState,
    positive
)
// [3, 5]

Optic.modifyAll(
    sampleState,
    positive,
    (
        value
    ) =>
        value * 10
)
// values:
// [30, -1, 50, 0]

const positiveRecordValues =
    Optic.entries<
        number
    >()
        .forEach(
            (
                entry
            ) =>
                entry
                    .key(1)
                    .check(
                        Schema
                            .isGreaterThan(
                                0
                            )
                    )
        )`,
        apis: [
            "Optic.Traversal",
            ".forEach",
            ".modifyAll",
            "Optic.getAll",
            "Optic.modifyAll",
            "Optic.entries",
        ],
        notice: "Traversal replacement has arity: the replacement array must contain exactly one value for each focusable element. getAll turns traversal failure into an empty array; modifyAll returns the original source when traversal focus fails.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type KindsSnapshot = Readonly<{
    mode: KindsCase
    iso: string
    lens: string
    prism: string
    optional: string
    traversal: string
    composition: string
    isoRoundTrip: string
    lensExample: string
}>

export const kinds_snapshot = (model: Model): KindsSnapshot => ({
    mode: model.kindsCase,
    iso: "read always · build source without source · reversible",
    lens: "read always · replacement needs original source",
    prism: "read may fail · set builds source without original",
    optional: "read may fail · replacement may fail",
    traversal: "zero or more values · Optional<S, ReadonlyArray<A>>",
    composition:
        "Iso neutral · Lens+Lens=Lens · Prism+Prism=Prism · Lens+Prism=Optional",
    isoRoundTrip: `${numeric_text.get(42)} ↔ ${numeric_text.set("42")}`,
    lensExample: pair_first.replace("next", ["first", 7]).join(" · "),
})

export type FocusSnapshot = Readonly<{
    mode: FocusCase
    name: string
    renamed: string
    sourceUnchanged: boolean
    nicknameRemoved: string
    atHit: string
    circleHit: string
    rectangleFails: boolean
}>

export const focus_snapshot = (model: Model): FocusSnapshot => {
    const renamed = profile_name.replace("Grace", sample_state)

    const nicknameRemoved = profile_nickname.replace(undefined, sample_state)

    const rectangle: Shape = {
        _tag: "Rect",
        width: 10,
    }

    return {
        mode: model.focusCase,
        name: profile_name.get(sample_state),
        renamed: renamed.profile.name,
        sourceUnchanged: sample_state.profile.name === "Ada",
        nicknameRemoved:
            "nickname" in nicknameRemoved.profile ? "present" : "removed",
        atHit: Result.isSuccess(env_port.getResult(sample_state))
            ? "Success(3000)"
            : "Failure",
        circleHit: Result.isSuccess(circle_radius.getResult(sample_state.shape))
            ? "Success(5)"
            : "Failure",
        rectangleFails: Result.isFailure(circle_radius.getResult(rectangle)),
    }
}

export type FailureSnapshot = Readonly<{
    mode: FailureCase
    get: string
    getResultHit: string
    getResultMiss: string
    replaceHit: number
    replaceMissUnchanged: boolean
    prismSet: string
    someHit: string
    noneMiss: boolean
    successHit: string
    failureMiss: boolean
}>

export const failure_snapshot = (model: Model): FailureSnapshot => {
    const missing: DemoState = {
        ...sample_state,
        env: {},
    }

    const replaced = Optic.replace(sample_state, env_port, 8080)

    const failedReplace = Optic.replace(missing, env_port, 8080)

    const someValue = Option.some(10)

    return {
        mode: model.failureCase,
        get: Optic.get(sample_state, profile_name),
        getResultHit: Result.isSuccess(Optic.getResult(sample_state, env_port))
            ? "Success"
            : "Failure",
        getResultMiss: Result.isFailure(Optic.getResult(missing, env_port))
            ? "Failure(MissingKey)"
            : "Success",
        replaceHit: replaced.env.PORT,
        replaceMissUnchanged: failedReplace === missing,
        prismSet: Option.isSome(Optic.set(12, some_number))
            ? "Some(12)"
            : "None",
        someHit: Result.isSuccess(some_number.getResult(someValue))
            ? "Success(10)"
            : "Failure",
        noneMiss: Result.isFailure(Optic.none<number>().getResult(someValue)),
        successHit: Result.isSuccess(
            success_number.getResult(Result.succeed(5))
        )
            ? "Success(5)"
            : "Failure",
        failureMiss: Result.isFailure(
            Optic.failure<number, string>().getResult(Result.succeed(5))
        ),
    }
}

export type TraverseSnapshot = Readonly<{
    mode: TraverseCase
    source: string
    positives: string
    modified: string
    originalUnchanged: string
    recordPositiveValues: string
    failedGetAll: string
}>

export const traverse_snapshot = (model: Model): TraverseSnapshot => {
    const positives = Optic.getAll(sample_state, positive_values)

    const modified = Optic.modifyAll(
        sample_state,
        positive_values,
        (value: number): number => value * 10
    )

    const recordPositiveValues = Optic.entries<number>().forEach(
        (
            entry: Optic.Iso<
                readonly [string, number],
                readonly [string, number]
            >
        ) => entry.key(1).check(S.isGreaterThan(0))
    )

    const failedTraversal: Optic.Traversal<
        Readonly<{
            values?: ReadonlyArray<number>
        }>,
        number
    > = Optic.id<
        Readonly<{
            values?: ReadonlyArray<number>
        }>
    >()
        .at("values")
        .forEach((item: Optic.Iso<number, number>) => item)

    return {
        mode: model.traverseCase,
        source: sample_state.values.join(" · "),
        positives: positives.join(" · "),
        modified: modified.values.join(" · "),
        originalUnchanged: sample_state.values.join(" · "),
        recordPositiveValues: Optic.getAll(
            {
                a: 0,
                b: 3,
                c: -1,
                d: 5,
            },
            recordPositiveValues
        ).join(" · "),
        failedGetAll:
            Optic.getAll({}, failedTraversal).length === 0
                ? "[]"
                : "unexpected",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedOpticStage: {
        stage: Stage,
    },
    SelectedOpticKindsCase: {
        kindsCase: KindsCase,
    },
    SelectedOpticFocusCase: {
        focusCase: FocusCase,
    },
    SelectedOpticFailureCase: {
        failureCase: FailureCase,
    },
    SelectedOpticTraverseCase: {
        traverseCase: TraverseCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Kinds",
    kindsCase: "Models",
    focusCase: "Key",
    failureCase: "Read",
    traverseCase: "Collect",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type KindsCasePayload = Readonly<{
    kindsCase: KindsCase
}>

type FocusCasePayload = Readonly<{
    focusCase: FocusCase
}>

type FailureCasePayload = Readonly<{
    failureCase: FailureCase
}>

type TraverseCasePayload = Readonly<{
    traverseCase: TraverseCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedOpticStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedOpticKindsCase: ({ kindsCase }: KindsCasePayload) => ({
            model: evo(model, {
                kindsCase: () => kindsCase,
            }),
        }),

        SelectedOpticFocusCase: ({ focusCase }: FocusCasePayload) => ({
            model: evo(model, {
                focusCase: () => focusCase,
            }),
        }),

        SelectedOpticFailureCase: ({ failureCase }: FailureCasePayload) => ({
            model: evo(model, {
                failureCase: () => failureCase,
            }),
        }),

        SelectedOpticTraverseCase: ({ traverseCase }: TraverseCasePayload) => ({
            model: evo(model, {
                traverseCase: () => traverseCase,
            }),
        }),
    })
