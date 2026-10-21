import { Effect, Filter, Option, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN VALUES USED BY NARROWING EXAMPLES
// -----------------------------------------------------------------------------

export type DomainEvent =
    | Readonly<{
          _tag: "Created"
          id: number
      }>
    | Readonly<{
          _tag: "Deleted"
          id: number
      }>

export type DomainError =
    | Readonly<{
          _tag: "HttpError"
          reason:
              | Readonly<{
                    _tag: "NotFound"
                    path: string
                }>
              | Readonly<{
                    _tag: "Unauthorized"
                    user: string
                }>
      }>
    | Readonly<{
          _tag: "ValidationError"
          reason: Readonly<{
              _tag: "Invalid"
              field: string
          }>
      }>

export class Token {
    constructor(readonly value: string) {}
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Narrow"),
    S.Literal("Compose"),
    S.Literal("Adapt"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Narrow",
    "Compose",
    "Adapt",
]

export const BuildCase = S.Union([
    S.Literal("Predicate"),
    S.Literal("Transform"),
    S.Literal("Try"),
    S.Literal("Option"),
])
export type BuildCase = typeof BuildCase.Type

export const NarrowCase = S.Union([
    S.Literal("Primitives"),
    S.Literal("Equality"),
    S.Literal("Tagged"),
    S.Literal("Has"),
])
export type NarrowCase = typeof NarrowCase.Type

export const ComposeCase = S.Union([
    S.Literal("Zip"),
    S.Literal("Or"),
    S.Literal("Compose"),
    S.Literal("Passthrough"),
])
export type ComposeCase = typeof ComposeCase.Type

export const AdaptCase = S.Union([S.Literal("Convert"), S.Literal("Effectful")])
export type AdaptCase = typeof AdaptCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    narrowCase: NarrowCase,
    composeCase: ComposeCase,
    adaptCase: AdaptCase,
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
    Build: {
        eyebrow: "Result-producing checks",
        title: "A Filter can reject, narrow, or transform its input",
        description:
            "Filter<Input, Pass, Fail> returns Result<Pass, Fail>. Constructors cover direct Result logic, predicates and refinements, Option-producing checks, exception-catching transformations, and effectful filtering.",
        code: `const positive =
    Filter.fromPredicate(
        (n: number) => n > 0
    )

const doubled =
    Filter.make(
        (n: number) =>
            n > 0
                ? Result.succeed(n * 2)
                : Result.fail(n)
    )

const parse =
    Filter.try(
        (text: string): number => {
            const value = Number(text)
            if (Number.isNaN(value)) {
                throw new Error("NaN")
            }
            return value
        }
    )`,
        apis: [
            "Filter.Filter",
            "Filter.make",
            "Filter.fromPredicate",
            "Filter.fromPredicateOption",
            "Filter.try",
            "Filter.mapFail",
        ],
        notice: "Failure is ordinary data, not an Effect error. A filter may also change both output types: Pass can differ from Input, and mapFail can give rejected values a purpose-built failure representation.",
    },

    Narrow: {
        eyebrow: "built-in refinements",
        title: "Reusable filters narrow unknown values and tagged unions",
        description:
            "The module includes primitive filters plus constructor, membership, equality, tag, and nested-reason filters. Strict equality and structural equality are intentionally separate.",
        code: `Filter.string("hello")
// Success("hello")

Filter.number("42")
// Failure("42")

const expected = { id: 1 }

Filter.equalsStrict(expected)(
    { id: 1 }
)
// Failure — different reference

Filter.equals(expected)(
    { id: 1 }
)
// Success — structural equality`,
        apis: [
            "Filter.string",
            "Filter.number",
            "Filter.boolean",
            "Filter.bigint",
            "Filter.symbol",
            "Filter.date",
            "Filter.equalsStrict",
            "Filter.equals",
            "Filter.instanceOf",
            "Filter.has",
            "Filter.tagged",
            "Filter.reason",
        ],
        notice: "equalsStrict uses JavaScript ===, so NaN does not pass and objects require the same reference. equals delegates to Effect structural equality. tagged checks only _tag; it does not validate other fields.",
    },

    Compose: {
        eyebrow: "composable filter algebra",
        title: "Combine checks in parallel or feed one filter into the next",
        description:
            "zip-style combinators require both filters to pass. or falls back to the second filter only when the first rejects. compose is sequential and can transform between stages.",
        code: `const positive =
    Filter.fromPredicate(
        (n: number) => n > 0
    )

const even =
    Filter.fromPredicate(
        (n: number) => n % 2 === 0
    )

Filter.zip(
    positive,
    even
)(2)
// Success([2, 2])

Filter.or(
    positive,
    even
)(-2)
// Success(-2)`,
        apis: [
            "Filter.zip",
            "Filter.zipWith",
            "Filter.andLeft",
            "Filter.andRight",
            "Filter.or",
            "Filter.compose",
            "Filter.composePassthrough",
        ],
        notice: "compose preserves whichever failure payload a stage produced. composePassthrough deliberately replaces either stage's failure payload with the original input, which is useful when filtering collections while retaining the rejected source value.",
    },

    Adapt: {
        eyebrow: "conversion + effects",
        title: "Keep Filter semantics while adapting to Predicate, Option, Result, or Effect",
        description:
            "A synchronous Filter can be projected to simpler interfaces, while FilterEffect lets the filtering decision itself require asynchronous work, typed errors, or services.",
        code: `const positive =
    Filter.fromPredicate(
        (n: number) => n > 0
    )

Filter.toPredicate(positive)(2)
// true

Filter.toOption(positive)(-1)
// None

Filter.toResult(positive)(2)
// Success(2)

const remote =
    Filter.makeEffect(
        (id: string) =>
            Effect.succeed(
                id.length > 0
                    ? Result.succeed(id)
                    : Result.fail(id)
            )
    )`,
        apis: [
            "Filter.toPredicate",
            "Filter.toOption",
            "Filter.toResult",
            "Filter.FilterEffect",
            "Filter.makeEffect",
        ],
        notice: "toPredicate discards both payloads and keeps only pass/fail. toOption keeps only the pass value. toResult preserves both. FilterEffect moves the filtering computation into Effect without changing the inner Result meaning.",
    },
}

// -----------------------------------------------------------------------------
// SHARED HELPERS
// -----------------------------------------------------------------------------

const result_summary = <A, E>(
    result: Result.Result<A, E>,
    onSuccess: (value: A) => string,
    onFailure: (failure: E) => string
): string =>
    Result.isSuccess(result)
        ? `Success(${onSuccess(result.success)})`
        : `Failure(${onFailure(result.failure)})`

const identity_text = (value: string): string => JSON.stringify(value)

// -----------------------------------------------------------------------------
// BUILD SNAPSHOT
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    constructor: string
    input: string
    result: string
    passPayload: string
    failPayload: string
    transformed: boolean
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    if (model.buildCase === "Transform") {
        const doubled = Filter.make((value: number) =>
            value > 0 ? Result.succeed(value * 2) : Result.fail(value)
        )

        const mappedFailure = Filter.mapFail(
            doubled,
            (value: number) => `not-positive:${value}`
        )

        const input = -2
        const result = mappedFailure(input)

        return {
            constructor: "make + mapFail",
            input: String(input),
            result: result_summary(
                result,
                (value: number) => String(value),
                (failure: string) => JSON.stringify(failure)
            ),
            passPayload: "number × 2",
            failPayload: "string reason",
            transformed: true,
        }
    }

    if (model.buildCase === "Try") {
        const parse = Filter.try((text: string): number => {
            const value = Number(text)

            if (Number.isNaN(value)) {
                throw new Error("not a number")
            }

            return value
        })

        const input = "oops"
        const result = parse(input)

        return {
            constructor: "Filter.try",
            input: JSON.stringify(input),
            result: result_summary(
                result,
                (value: number) => String(value),
                (failure: string) => JSON.stringify(failure)
            ),
            passPayload: "parsed number",
            failPayload: "original string",
            transformed: true,
        }
    }

    if (model.buildCase === "Option") {
        const nonEmptyUpper = Filter.fromPredicateOption((text: string) =>
            text.length > 0
                ? Option.some(text.toUpperCase())
                : Option.none<string>()
        )

        const input = "effect"
        const result = nonEmptyUpper(input)

        return {
            constructor: "fromPredicateOption",
            input: JSON.stringify(input),
            result: result_summary(result, identity_text, identity_text),
            passPayload: "uppercase string",
            failPayload: "original input",
            transformed: true,
        }
    }

    const positive = Filter.fromPredicate((value: number) => value > 0)

    const input = 5
    const result = positive(input)

    return {
        constructor: "fromPredicate",
        input: String(input),
        result: result_summary(
            result,
            (value: number) => String(value),
            (failure: number) => String(failure)
        ),
        passPayload: "same number",
        failPayload: "same number",
        transformed: false,
    }
}

// -----------------------------------------------------------------------------
// NARROW SNAPSHOT
// -----------------------------------------------------------------------------

export type NarrowSnapshot = Readonly<{
    mode: NarrowCase
    leftLabel: string
    leftResult: string
    rightLabel: string
    rightResult: string
    detail: string
    narrowedTo: string
}>

export const narrow_snapshot = (model: Model): NarrowSnapshot => {
    if (model.narrowCase === "Equality") {
        const expected = {
            id: 1,
        }

        const distinct = {
            id: 1,
        }

        const strict = Filter.equalsStrict(expected)

        const structural = Filter.equals(expected)

        return {
            mode: model.narrowCase,
            leftLabel: "equalsStrict",
            leftResult: strict(distinct)._tag,
            rightLabel: "equals",
            rightResult: structural(distinct)._tag,
            detail: "same shape, different object reference",
            narrowedTo: "{ id: 1 }",
        }
    }

    if (model.narrowCase === "Tagged") {
        const created = Filter.tagged<DomainEvent>()("Created")

        const notFound = Filter.reason<DomainError>()("HttpError", "NotFound")

        const event: DomainEvent = {
            _tag: "Created",
            id: 42,
        }

        const error: DomainError = {
            _tag: "HttpError",
            reason: {
                _tag: "NotFound",
                path: "/users/42",
            },
        }

        return {
            mode: model.narrowCase,
            leftLabel: "tagged(Created)",
            leftResult: created(event)._tag,
            rightLabel: "reason(HttpError, NotFound)",
            rightResult: notFound(error)._tag,
            detail: "nested reason is returned on success",
            narrowedTo: "Created | NotFound reason",
        }
    }

    if (model.narrowCase === "Has") {
        const hasAdmin = Filter.has("admin")

        const roles = new Set(["reader", "admin"])

        const token = Filter.instanceOf(Token)

        return {
            mode: model.narrowCase,
            leftLabel: 'has("admin")',
            leftResult: hasAdmin(roles)._tag,
            rightLabel: "instanceOf(Token)",
            rightResult: token(new Token("abc"))._tag,
            detail: "membership + constructor narrowing",
            narrowedTo: "Set<string> | Token",
        }
    }

    return {
        mode: model.narrowCase,
        leftLabel: 'string("hello")',
        leftResult: Filter.string("hello")._tag,
        rightLabel: 'number("42")',
        rightResult: Filter.number("42")._tag,
        detail: `boolean(true)=${Filter.boolean(true)._tag} · bigint(1n)=${Filter.bigint(1n)._tag} · date(new Date())=${Filter.date(new Date(0))._tag}`,
        narrowedTo: "primitive runtime types",
    }
}

// -----------------------------------------------------------------------------
// COMPOSE SNAPSHOT
// -----------------------------------------------------------------------------

const positive = Filter.fromPredicate((value: number) => value > 0)

const even = Filter.fromPredicate((value: number) => value % 2 === 0)

const doubled = Filter.make((value: number) =>
    value > 0 ? Result.succeed(value * 10) : Result.fail(value)
)

const trim_non_empty = Filter.make((input: string) => {
    const value = input.trim()

    return value.length > 0
        ? Result.succeed(value)
        : Result.fail("empty-after-trim")
})

const upper_min_three = Filter.make((value: string) =>
    value.length >= 3
        ? Result.succeed(value.toUpperCase())
        : Result.fail(`short:${value}`)
)

export type ComposeSnapshot = Readonly<{
    mode: ComposeCase
    input: string
    result: string
    secondary: string
    outputShape: string
    evaluation: string
}>

export const compose_snapshot = (model: Model): ComposeSnapshot => {
    if (model.composeCase === "Or") {
        const positiveOrEven = Filter.or(positive, even)

        const result = positiveOrEven(-2)

        return {
            mode: model.composeCase,
            input: "-2",
            result: result_summary(
                result,
                (value: number) => String(value),
                (failure: number) => String(failure)
            ),
            secondary: "positive fails → even succeeds",
            outputShape: "number",
            evaluation: "second filter runs only after first failure",
        }
    }

    if (
        model.composeCase === "Compose" ||
        model.composeCase === "Passthrough"
    ) {
        const input = "  a "

        if (model.composeCase === "Passthrough") {
            const filter = Filter.composePassthrough(
                trim_non_empty,
                upper_min_three
            )

            const result = filter(input)

            return {
                mode: model.composeCase,
                input: JSON.stringify(input),
                result: result_summary(result, identity_text, identity_text),
                secondary: 'intermediate value is "a"',
                outputShape: "Pass=string · Fail=original input",
                evaluation: "right fails, original input is restored",
            }
        }

        const filter = Filter.compose(trim_non_empty, upper_min_three)

        const result = filter(input)

        return {
            mode: model.composeCase,
            input: JSON.stringify(input),
            result: result_summary(result, identity_text, identity_text),
            secondary: 'intermediate value is "a"',
            outputShape: "Pass=string · Fail=stage failure",
            evaluation: 'right fails with "short:a"',
        }
    }

    const zipped = Filter.zip(positive, even)

    const zippedWith = Filter.zipWith(
        positive,
        even,
        (left: number, right: number) => left + right
    )

    const keepLeft = Filter.andLeft(positive, even)

    const keepRight = Filter.andRight(positive, doubled)

    const zippedResult = zipped(2)

    const zippedWithResult = zippedWith(2)

    const keepLeftResult = keepLeft(2)

    const keepRightResult = keepRight(2)

    return {
        mode: model.composeCase,
        input: "2",
        result: result_summary(
            zippedResult,
            (tuple: [number, number]) => `[${tuple[0]}, ${tuple[1]}]`,
            (failure: number) => String(failure)
        ),
        secondary: `zipWith=${Result.isSuccess(zippedWithResult) ? zippedWithResult.success : "fail"} · andLeft=${Result.isSuccess(keepLeftResult) ? keepLeftResult.success : "fail"} · andRight=${Result.isSuccess(keepRightResult) ? keepRightResult.success : "fail"}`,
        outputShape: "[left, right]",
        evaluation: "both filters must pass",
    }
}

// -----------------------------------------------------------------------------
// ADAPT SNAPSHOT
// -----------------------------------------------------------------------------

export type AdaptSnapshot = Readonly<{
    mode: AdaptCase
    predicate: string
    option: string
    result: string
    effectResult: string
    effectErrorChannel: string
    services: string
}>

export const adapt_snapshot = (model: Model): AdaptSnapshot => {
    const filter = Filter.make((value: number) =>
        value > 0
            ? Result.succeed(value * 2)
            : Result.fail(`non-positive:${value}`)
    )

    const predicate = Filter.toPredicate(filter)

    const option = Filter.toOption(filter)

    const result = Filter.toResult(filter)

    const remote: Filter.FilterEffect<string, string, string> =
        Filter.makeEffect((id: string) =>
            Effect.succeed(
                id.startsWith("ok:")
                    ? Result.succeed(id.slice(3))
                    : Result.fail(`rejected:${id}`)
            )
        )

    const effectResult = Effect.runSync(
        remote(model.adaptCase === "Effectful" ? "ok:42" : "bad")
    )

    return {
        mode: model.adaptCase,
        predicate: String(predicate(2)),
        option: Option.match(option(2), {
            onNone: () => "None",
            onSome: (value: number) => `Some(${value})`,
        }),
        result: result_summary(
            result(-1),
            (value: number) => String(value),
            (failure: string) => JSON.stringify(failure)
        ),
        effectResult: result_summary(
            effectResult,
            identity_text,
            identity_text
        ),
        effectErrorChannel: "never",
        services: "never",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedFilterStage: {
        stage: Stage,
    },
    SelectedFilterBuildCase: {
        buildCase: BuildCase,
    },
    SelectedFilterNarrowCase: {
        narrowCase: NarrowCase,
    },
    SelectedFilterComposeCase: {
        composeCase: ComposeCase,
    },
    SelectedFilterAdaptCase: {
        adaptCase: AdaptCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Predicate",
    narrowCase: "Primitives",
    composeCase: "Zip",
    adaptCase: "Convert",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type NarrowCasePayload = Readonly<{
    narrowCase: NarrowCase
}>

type ComposeCasePayload = Readonly<{
    composeCase: ComposeCase
}>

type AdaptCasePayload = Readonly<{
    adaptCase: AdaptCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedFilterStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedFilterBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: evo(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedFilterNarrowCase: ({ narrowCase }: NarrowCasePayload) => ({
            model: evo(model, {
                narrowCase: () => narrowCase,
            }),
        }),

        SelectedFilterComposeCase: ({ composeCase }: ComposeCasePayload) => ({
            model: evo(model, {
                composeCase: () => composeCase,
            }),
        }),

        SelectedFilterAdaptCase: ({ adaptCase }: AdaptCasePayload) => ({
            model: evo(model, {
                adaptCase: () => adaptCase,
            }),
        }),
    })
