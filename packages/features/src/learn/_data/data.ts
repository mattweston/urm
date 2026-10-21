import { Data, Effect, Equal, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Domain data used by the teaching demo
// -----------------------------------------------------------------------------

export class Person extends Data.Class<{
    readonly name: string
    readonly role: string
}> {}

export class TaggedPerson extends Data.TaggedClass("Person")<{
    readonly name: string
    readonly role: string
}> {}

export type RequestState = Data.TaggedEnum<{
    Idle: {}
    Loading: { readonly requestId: string }
    Success: { readonly value: string }
    Failure: { readonly reason: string }
}>

export const RequestState = Data.taggedEnum<RequestState>()

export class NetworkError extends Data.Error<{
    readonly code: number
    readonly message: string
}> {}

export class NotFound extends Data.TaggedError("NotFound")<{
    readonly resource: string
}> {}

export class Forbidden extends Data.TaggedError("Forbidden")<{
    readonly reason: string
}> {}

export type DemoResult<E, A> = Data.TaggedEnum<{
    Failure: { readonly error: E }
    Success: { readonly value: A }
}>

export interface DemoResultDef extends Data.TaggedEnum.WithGenerics<2> {
    readonly taggedEnum: DemoResult<this["A"], this["B"]>
}

export const DemoResult = Data.taggedEnum<DemoResultDef>()

// These aliases are intentionally exported so the demo can point at the actual
// Data.TaggedEnum utility types rather than hand-waving about their result.
export type ConcreteDemoResult = Data.TaggedEnum.Kind<
    DemoResultDef,
    string,
    number
>
export type DemoSuccessArgs = Data.TaggedEnum.Args<
    ConcreteDemoResult,
    "Success"
>
export type DemoFailureValue = Data.TaggedEnum.Value<
    ConcreteDemoResult,
    "Failure"
>

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Class"),
    S.Literal("Enum"),
    S.Literal("Errors"),
    S.Literal("Generics"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Class",
    "Enum",
    "Errors",
    "Generics",
]

export const EnumVariant = S.Union([
    S.Literal("Idle"),
    S.Literal("Loading"),
    S.Literal("Success"),
    S.Literal("Failure"),
])
export type EnumVariant = typeof EnumVariant.Type

export const ErrorVariant = S.Union([
    S.Literal("Network"),
    S.Literal("NotFound"),
    S.Literal("Forbidden"),
])
export type ErrorVariant = typeof ErrorVariant.Type

export const GenericVariant = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
])
export type GenericVariant = typeof GenericVariant.Type

export const Model = S.Struct({
    stage: Stage,
    enumVariant: EnumVariant,
    errorVariant: ErrorVariant,
    genericVariant: GenericVariant,
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
    Class: {
        eyebrow: "readonly value types",
        title: "Class gives small domain values structural identity",
        description:
            "Data.Class creates readonly, pipeable value classes. TaggedClass adds a discriminator without asking callers to pass _tag in the constructor.",
        code: `class Person extends Data.Class<{
    readonly name: string
    readonly role: string
}> {}

class TaggedPerson extends Data.TaggedClass("Person")<{
    readonly name: string
    readonly role: string
}> {}

Equal.equals(
    new Person({ name: "Ada", role: "admin" }),
    new Person({ name: "Ada", role: "admin" })
) // true`,
        apis: ["Data.Class", "Data.TaggedClass", "Equal.equals", "Pipeable"],
        notice: "Readonly here is a TypeScript/value-model contract, not an Object.freeze call. TaggedClass owns the _tag, so constructor arguments contain only domain fields.",
    },
    Enum: {
        eyebrow: "closed unions",
        title: "One definition yields constructors, guards, and exhaustive matching",
        description:
            "Data.TaggedEnum describes the union type; Data.taggedEnum builds a constructor for every tag plus $is and $match helpers.",
        code: `type RequestState = Data.TaggedEnum<{
    Idle: {}
    Loading: { readonly requestId: string }
    Success: { readonly value: string }
    Failure: { readonly reason: string }
}>

const State = Data.taggedEnum<RequestState>()
const value = State.Success({ value: "profile" })

State.$is("Success")(value) // true
State.$match(value, {
    Idle: () => "idle",
    Loading: ({ requestId }) => "loading " + requestId,
    Success: ({ value }) => "ready " + value,
    Failure: ({ reason }) => "failed " + reason,
})`,
        apis: ["Data.TaggedEnum", "Data.taggedEnum", "$is", "$match"],
        notice: "taggedEnum constructors return plain objects. $is(tag) checks only the _tag field; validate untrusted input with Schema before relying on the guard.",
    },
    Errors: {
        eyebrow: "yieldable failures",
        title: "Error values can participate directly in Effect control flow",
        description:
            "Data.Error creates yieldable typed errors. TaggedError adds _tag so catchTag and catchTags can recover selected domain failures.",
        code: `class NotFound extends Data.TaggedError("NotFound")<{
    readonly resource: string
}> {}

const program = Effect.gen(function* () {
    return yield* new NotFound({
        resource: "/users/42"
    })
})

const recovered = program.pipe(
    Effect.catchTag("NotFound", (error) =>
        Effect.succeed("missing: " + error.resource)
    )
)`,
        apis: [
            "Data.Error",
            "Data.TaggedError",
            "Effect.gen",
            "Effect.catchTag",
            "Effect.catchTags",
        ],
        notice: "Both Error variants are yieldable. Use TaggedError when recovery or narrowing should discriminate by _tag; plain Data.Error deliberately has no tag.",
    },
    Generics: {
        eyebrow: "type-level unions",
        title: "TaggedEnum utility types keep generic unions precise",
        description:
            "WithGenerics describes reusable type parameters; Kind applies concrete types, while Args and Value extract one constructor payload or full variant.",
        code: `type DemoResult<E, A> = Data.TaggedEnum<{
    Failure: { readonly error: E }
    Success: { readonly value: A }
}>

interface DemoResultDef
    extends Data.TaggedEnum.WithGenerics<2> {
    readonly taggedEnum:
        DemoResult<this["A"], this["B"]>
}

const ResultData = Data.taggedEnum<DemoResultDef>()
const ok = ResultData.Success({ value: 42 })

type Concrete = Data.TaggedEnum.Kind<
    DemoResultDef,
    string,
    number
>
type SuccessArgs = Data.TaggedEnum.Args<Concrete, "Success">`,
        apis: [
            "TaggedEnum.WithGenerics",
            "TaggedEnum.Kind",
            "TaggedEnum.Args",
            "TaggedEnum.Value",
            "TaggedEnum.Constructor",
        ],
        notice: "The generic machinery is type-level only; runtime values stay the same small tagged objects produced by Data.taggedEnum.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ClassSnapshot = Readonly<{
    personA: string
    personB: string
    differentPerson: string
    equalSameFields: boolean
    equalDifferentFields: boolean
    pipeResult: string
    taggedValue: string
    taggedTag: string
}>

export const class_snapshot = (): ClassSnapshot => {
    const personA = new Person({ name: "Ada", role: "admin" })
    const personB = new Person({ name: "Ada", role: "admin" })
    const different = new Person({ name: "Grace", role: "operator" })
    const tagged = new TaggedPerson({ name: "Ada", role: "admin" })

    return {
        personA: JSON.stringify(personA),
        personB: JSON.stringify(personB),
        differentPerson: JSON.stringify(different),
        equalSameFields: Equal.equals(personA, personB),
        equalDifferentFields: Equal.equals(personA, different),
        pipeResult: personA.pipe(
            (person) => `${person.name.toUpperCase()} / ${person.role}`
        ),
        taggedValue: JSON.stringify(tagged),
        taggedTag: tagged._tag,
    }
}

const make_request_state = (variant: EnumVariant): RequestState => {
    if (variant === "Idle") {
        return RequestState.Idle()
    }

    if (variant === "Loading") {
        return RequestState.Loading({ requestId: "req-42" })
    }

    if (variant === "Failure") {
        return RequestState.Failure({ reason: "network offline" })
    }

    return RequestState.Success({ value: "profile loaded" })
}

export type EnumSnapshot = Readonly<{
    tag: string
    value: string
    constructorKind: string
    selectedGuard: boolean
    successGuard: boolean
    matchResult: string
}>

export const enum_snapshot = (model: Model): EnumSnapshot => {
    const value = make_request_state(model.enumVariant)

    const matchResult = RequestState.$match(value, {
        Idle: () => "idle — no request in flight",
        Loading: ({ requestId }) => `loading ${requestId}`,
        Success: ({ value }) => `ready: ${value}`,
        Failure: ({ reason }) => `failed: ${reason}`,
    })

    return {
        tag: value._tag,
        value: JSON.stringify(value),
        constructorKind:
            Object.getPrototypeOf(value) === Object.prototype
                ? "plain object"
                : "class",
        selectedGuard: RequestState.$is(model.enumVariant)(value),
        successGuard: RequestState.$is("Success")(value),
        matchResult,
    }
}

export type ErrorSnapshot = Readonly<{
    kind: ErrorVariant
    className: string
    tag: string
    exitTag: string
    catchTagAvailable: boolean
    recovered: string
    message: string
}>

export const error_snapshot = (model: Model): ErrorSnapshot => {
    if (model.errorVariant === "Network") {
        const error = new NetworkError({
            code: 503,
            message: "upstream unavailable",
        })
        const program = Effect.gen(function* () {
            return yield* error
        })
        const exit = Effect.runSync(Effect.exit(program))

        return {
            kind: "Network",
            className: "NetworkError",
            tag: "—",
            exitTag: exit._tag,
            catchTagAvailable: false,
            recovered: "use ordinary error recovery; there is no _tag",
            message: error.message,
        }
    }

    if (model.errorVariant === "Forbidden") {
        const error = new Forbidden({ reason: "role is read-only" })
        const program = Effect.gen(function* () {
            return yield* error
        })
        const exit = Effect.runSync(Effect.exit(program))
        const recovered = Effect.runSync(
            program.pipe(
                Effect.catchTag("Forbidden", (cause) =>
                    Effect.succeed(`blocked: ${cause.reason}`)
                )
            )
        )

        return {
            kind: "Forbidden",
            className: "Forbidden",
            tag: error._tag,
            exitTag: exit._tag,
            catchTagAvailable: true,
            recovered,
            message: error.message,
        }
    }

    const error = new NotFound({ resource: "/users/42" })
    const program = Effect.gen(function* () {
        return yield* error
    })
    const exit = Effect.runSync(Effect.exit(program))
    const recovered = Effect.runSync(
        program.pipe(
            Effect.catchTag("NotFound", (cause) =>
                Effect.succeed(`missing: ${cause.resource}`)
            )
        )
    )

    return {
        kind: "NotFound",
        className: "NotFound",
        tag: error._tag,
        exitTag: exit._tag,
        catchTagAvailable: true,
        recovered,
        message: error.message,
    }
}

export type GenericSnapshot = Readonly<{
    tag: string
    value: string
    guard: boolean
    matchResult: string
    appliedKind: string
    argsType: string
    valueType: string
}>

export const generic_snapshot = (model: Model): GenericSnapshot => {
    const value: ConcreteDemoResult =
        model.genericVariant === "Failure"
            ? DemoResult.Failure<string, number>({ error: "bad input" })
            : DemoResult.Success<string, number>({ value: 42 })

    const matchResult = DemoResult.$match(value, {
        Failure: ({ error }) => `error channel → ${error}`,
        Success: ({ value }) => `success channel → ${value}`,
    })

    return {
        tag: value._tag,
        value: JSON.stringify(value),
        guard: DemoResult.$is(model.genericVariant)(value),
        matchResult,
        appliedKind: "Data.TaggedEnum.Kind<DemoResultDef, string, number>",
        argsType:
            model.genericVariant === "Success"
                ? "{ readonly value: number }"
                : "{ readonly error: string }",
        valueType:
            model.genericVariant === "Success"
                ? '{ readonly _tag: "Success"; readonly value: number }'
                : '{ readonly _tag: "Failure"; readonly error: string }',
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedDataStage: { stage: Stage },
    SelectedDataEnumVariant: { variant: EnumVariant },
    SelectedDataErrorVariant: { variant: ErrorVariant },
    SelectedDataGenericVariant: { variant: GenericVariant },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Class",
    enumVariant: "Success",
    errorVariant: "NotFound",
    genericVariant: "Success",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedDataStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),
        SelectedDataEnumVariant: ({ variant }) => ({
            model: evo(model, {
                enumVariant: () => variant,
            }),
        }),
        SelectedDataErrorVariant: ({ variant }) => ({
            model: evo(model, {
                errorVariant: () => variant,
            }),
        }),
        SelectedDataGenericVariant: ({ variant }) => ({
            model: evo(model, {
                genericVariant: () => variant,
            }),
        }),
    })
