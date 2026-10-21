import { Cause, Context, Effect, Exit, Request, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL REQUEST PROGRAMS
// -----------------------------------------------------------------------------

export type User = Readonly<{
    id: string
    name: string
}>

export type LookupError = "NotFound" | "Offline"

export interface GetUser extends Request.Request<User, LookupError> {
    readonly _tag: "GetUser"
    readonly id: string
}

export const GetUser = Request.tagged<GetUser>("GetUser")

export interface UserByEmail extends Request.Request<User, LookupError> {
    readonly email: string
}

export const UserByEmail = Request.of<UserByEmail>()

export class GetUserClass extends Request.Class<
    { readonly id: string },
    User,
    LookupError
> {
    constructor(readonly id: string) {
        super({ id })
    }
}

export class TaggedGetUserClass extends Request.TaggedClass(
    "TaggedGetUserClass"
)<{ readonly id: string }, User, LookupError> {
    /*
 This parameter property must have an 'override' modifier because it overrides a member in base class 'Request<Readonly<{ id: string; name: string; }>, LookupError, never> & Readonly<{ readonly id: string; }> & { readonly _tag: "TaggedGetUserClass"; }'.
  */
    constructor(readonly id: string) {
        super({ id })
    }
}

export const sample_get_user = GetUser({ id: "user-42" })
export const sample_by_email = UserByEmail({ email: "ada@example.com" })
export const sample_class = new GetUserClass("user-42")
export const sample_tagged_class = new TaggedGetUserClass("user-42")

export const request_guard_probe = {
    request: Request.isRequest(sample_get_user),
    plainObject: Request.isRequest({ _tag: "GetUser", id: "user-42" }),
} as const

export const request_prototype_probe =
    Object.getPrototypeOf(sample_get_user) === Request.RequestPrototype

// These aliases exist to make the Request utility types visible in this demo.
export type GetUserSuccess = Request.Success<GetUser>
export type GetUserError = Request.Error<GetUser>
export type GetUserServices = Request.Services<GetUser>
export type GetUserResult = Request.Result<GetUser>
export type AnyRequest = Request.Any
export type GetUserConstructor = Request.Constructor<GetUser, "_tag">
export type GetUserVariance = Request.Variance<User, LookupError, never>

export type CapturedCompletion = Readonly<{
    entryTag: string
    completion: string
    uninterruptible: boolean
}>

const describe_exit = (
    exit: Exit.Exit<User, LookupError> | undefined
): string => {
    if (exit === undefined) {
        return "pending"
    }

    if (exit._tag === "Success") {
        return `Success(${exit.value.id}:${exit.value.name})`
    }

    return "Failure(cause)"
}

const capture_entry = (): Readonly<{
    entry: Request.Entry<GetUser>
    read: () => Exit.Exit<User, LookupError> | undefined
}> => {
    let captured: Exit.Exit<User, LookupError> | undefined

    const entry = Request.makeEntry({
        request: sample_get_user,
        context: Context.empty(),
        uninterruptible: false,
        completeUnsafe: (exit: Exit.Exit<User, LookupError>): void => {
            captured = exit
        },
    })

    return {
        entry,
        read: () => captured,
    }
}

export const entry_probe = (): CapturedCompletion => {
    const capture = capture_entry()

    return {
        entryTag: capture.entry.request._tag,
        completion: describe_exit(capture.read()),
        uninterruptible: capture.entry.uninterruptible,
    }
}

export const succeed_probe = (): CapturedCompletion => {
    const capture = capture_entry()

    Effect.runSync(
        Request.succeed(capture.entry, {
            id: "user-42",
            name: "Ada",
        })
    )

    return {
        entryTag: capture.entry.request._tag,
        completion: describe_exit(capture.read()),
        uninterruptible: capture.entry.uninterruptible,
    }
}

export const fail_probe = (): CapturedCompletion => {
    const capture = capture_entry()

    Effect.runSync(Request.fail(capture.entry, "NotFound"))

    return {
        entryTag: capture.entry.request._tag,
        completion: describe_exit(capture.read()),
        uninterruptible: capture.entry.uninterruptible,
    }
}

export const cause_probe = (): CapturedCompletion => {
    const capture = capture_entry()

    Effect.runSync(
        Request.failCause(capture.entry, Cause.fail<LookupError>("Offline"))
    )

    return {
        entryTag: capture.entry.request._tag,
        completion: describe_exit(capture.read()),
        uninterruptible: capture.entry.uninterruptible,
    }
}

export const complete_probe = (): CapturedCompletion => {
    const capture = capture_entry()

    Effect.runSync(
        Request.complete(
            capture.entry,
            Exit.succeed({ id: "user-42", name: "Ada" })
        )
    )

    return {
        entryTag: capture.entry.request._tag,
        completion: describe_exit(capture.read()),
        uninterruptible: capture.entry.uninterruptible,
    }
}

export const complete_effect_probe = (): Readonly<{
    completionEffect: "succeeded"
    requestResult: string
}> => {
    const capture = capture_entry()

    Effect.runSync(
        Request.completeEffect(
            capture.entry,
            Effect.fail<LookupError>("Offline")
        )
    )

    return {
        completionEffect: "succeeded",
        requestResult: describe_exit(capture.read()),
    }
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Define"),
    S.Literal("Inspect"),
    S.Literal("Entry"),
    S.Literal("Complete"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Define",
    "Inspect",
    "Entry",
    "Complete",
]

export const DefineCase = S.Union([
    S.Literal("Tagged"),
    S.Literal("Of"),
    S.Literal("Class"),
    S.Literal("TaggedClass"),
])
export type DefineCase = typeof DefineCase.Type

export const define_cases: ReadonlyArray<DefineCase> = [
    "Tagged",
    "Of",
    "Class",
    "TaggedClass",
]

export const InspectCase = S.Union([
    S.Literal("Guard"),
    S.Literal("Prototype"),
    S.Literal("Types"),
    S.Literal("Fields"),
])
export type InspectCase = typeof InspectCase.Type

export const inspect_cases: ReadonlyArray<InspectCase> = [
    "Guard",
    "Prototype",
    "Types",
    "Fields",
]

export const EntryCase = S.Union([
    S.Literal("Shape"),
    S.Literal("Context"),
    S.Literal("Flag"),
    S.Literal("Unsafe"),
])
export type EntryCase = typeof EntryCase.Type

export const entry_cases: ReadonlyArray<EntryCase> = [
    "Shape",
    "Context",
    "Flag",
    "Unsafe",
]

export const CompleteCase = S.Union([
    S.Literal("Succeed"),
    S.Literal("Fail"),
    S.Literal("Cause"),
    S.Literal("Exit"),
    S.Literal("Effect"),
])
export type CompleteCase = typeof CompleteCase.Type

export const complete_cases: ReadonlyArray<CompleteCase> = [
    "Succeed",
    "Fail",
    "Cause",
    "Exit",
    "Effect",
]

export const Model = S.Struct({
    stage: Stage,
    defineCase: DefineCase,
    inspectCase: InspectCase,
    entryCase: EntryCase,
    completeCase: CompleteCase,
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
    Define: {
        eyebrow: "a request is typed data that describes work",
        title: "Define request values without performing the backend operation",
        description:
            "Request constructors attach Effect's request marker while keeping your readonly data fields. tagged/of return constructor functions; Class/TaggedClass provide the same model for class-oriented code.",
        code: `interface GetUser
    extends Request.Request<
        User,
        LookupError
    > {
    readonly _tag: "GetUser"
    readonly id: string
}

const GetUser =
    Request.tagged<GetUser>(
        "GetUser"
    )

const request =
    GetUser({ id: "user-42" })`,
        apis: [
            "Request.Request",
            "Request.tagged",
            "Request.of",
            "Request.Class",
            "Request.TaggedClass",
        ],
        notice: "Constructing a Request does not execute I/O. It creates a typed description that Effect.request can hand to a RequestResolver later.",
    },

    Inspect: {
        eyebrow: "the request marker carries success · error · services types",
        title: "Narrow request values and extract their type-level contract",
        description:
            "isRequest checks the Effect request marker. RequestPrototype is the low-level prototype installed by the built-in constructors. Utility types recover a concrete request's success, error, service, and final Exit types.",
        code: `Request.isRequest(request)
// true

Request.isRequest({
    _tag: "GetUser",
    id: "user-42"
})
// false

type A =
    Request.Success<GetUser>
type E =
    Request.Error<GetUser>
type R =
    Request.Services<GetUser>`,
        apis: [
            "Request.isRequest",
            "Request.RequestPrototype",
            "Request.Success",
            "Request.Error",
            "Request.Services",
            "Request.Result",
        ],
        notice: "Request.Any, Variance, Constructor, Success, Error, Services, and Result are type-level helpers. They describe the request contract; they do not trigger loading at runtime.",
    },

    Entry: {
        eyebrow: "resolvers receive a pending request plus execution context",
        title: "Understand the low-level Entry handed to resolver infrastructure",
        description:
            "A Request.Entry carries the original request, the Context needed by its service requirements, an uninterruptible flag used by runtime machinery, and completeUnsafe for supplying the final Exit. makeEntry is primarily an infrastructure helper.",
        code: `const entry =
    Request.makeEntry({
        request,
        context: Context.empty(),
        uninterruptible: false,
        completeUnsafe: (exit) => {
            // runtime completion hook
        }
    })

entry.request
entry.context
entry.uninterruptible`,
        apis: ["Request.Entry", "Request.makeEntry"],
        notice: "Most application code should not manufacture entries manually. RequestResolver receives them from Effect's request runtime; makeEntry and completeUnsafe expose the lower-level contract for integrations and internals.",
    },

    Complete: {
        eyebrow: "resolver code completes each pending entry exactly once",
        title: "Complete with success, typed failure, Cause, Exit, or Effect",
        description:
            "Resolver-side helpers turn different completion forms into the request's final Exit. succeed/fail are the common typed paths; failCause preserves structured failure information; complete accepts a ready Exit; completeEffect runs an Effect and stores its success or typed failure.",
        code: `yield* Request.succeed(
    entry,
    user
)

yield* Request.fail(
    entry,
    "NotFound"
)

yield* Request.completeEffect(
    entry,
    loadUser
)`,
        apis: [
            "Request.succeed",
            "Request.fail",
            "Request.failCause",
            "Request.complete",
            "Request.completeEffect",
        ],
        notice: "completeEffect captures the supplied effect's typed success/failure into the request result. The returned completion effect itself has no request-error channel; resolver dependencies remain in its requirements type.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const define_snapshot = (model: Model): Snapshot => {
    switch (model.defineCase) {
        case "Tagged":
            return {
                input: 'GetUser({ id: "user-42" })',
                operation: 'Request.tagged<GetUser>("GetUser")',
                result: '{ _tag: "GetUser", id: "user-42" } + Request marker',
                invariant: "_tag is supplied by the constructor",
                implementation: "data object gets RequestPrototype",
                guidance:
                    "Use tagged for concise discriminated request unions and tag-based resolver branching.",
            }

        case "Of":
            return {
                input: 'UserByEmail({ email: "ada@example.com" })',
                operation: "Request.of<UserByEmail>()",
                result: '{ email: "ada@example.com" } + Request marker',
                invariant: "no _tag is added automatically",
                implementation: "caller supplies every declared data field",
                guidance:
                    "Use of when the request does not need a discriminant field supplied by the constructor.",
            }

        case "Class":
            return {
                input: 'new GetUserClass({ id: "user-42" })',
                operation: "extend Request.Class",
                result: "class instance with readonly request fields",
                invariant: "success/error types live in the generic superclass",
                implementation:
                    "constructor properties are assigned onto RequestPrototype",
                guidance:
                    "Use Class when domain code benefits from named class constructors or subclass behavior.",
            }

        case "TaggedClass":
            return {
                input: 'new TaggedGetUserClass({ id: "user-42" })',
                operation: 'Request.TaggedClass("TaggedGetUserClass")',
                result: '_tag = "TaggedGetUserClass"',
                invariant: "fixed tag + class fields + Request marker",
                implementation: "TaggedClass extends the Request.Class base",
                guidance:
                    "Use TaggedClass for class-oriented request unions with an automatic discriminant.",
            }
    }
}

export const inspect_snapshot = (model: Model): Snapshot => {
    switch (model.inspectCase) {
        case "Guard":
            return {
                input: "request | look-alike plain object",
                operation: "Request.isRequest(value)",
                result: `${String(request_guard_probe.request)} · ${String(request_guard_probe.plainObject)}`,
                invariant: "shape alone is not enough",
                implementation: "checks Effect's internal Request property",
                guidance:
                    "Use isRequest at unknown boundaries instead of checking only _tag or request-shaped fields.",
            }

        case "Prototype":
            return {
                input: "Object.getPrototypeOf(sample_get_user)",
                operation: "compare with Request.RequestPrototype",
                result: String(request_prototype_probe),
                invariant:
                    "built-in functional constructors install the shared prototype",
                implementation:
                    "RequestPrototype carries StructuralProto + variance marker",
                guidance:
                    "Treat RequestPrototype as low-level machinery; prefer the public constructors in application code.",
            }

        case "Types":
            return {
                input: "GetUser",
                operation: "Success · Error · Services · Result",
                result: "User · LookupError · never · Exit<User, LookupError>",
                invariant:
                    "one request type carries its whole execution contract",
                implementation: "conditional types read Request<A, E, R>",
                guidance:
                    "Use extractors in generic request/resolver utilities instead of duplicating A/E/R type parameters.",
            }

        case "Fields":
            return {
                input: 'GetUser({ id: "user-42" })',
                operation: "read _tag and id",
                result: `${sample_get_user._tag} · ${sample_get_user.id}`,
                invariant:
                    "request-specific fields remain ordinary readonly data",
                implementation:
                    "constructor spreads fields onto the request object",
                guidance:
                    "Keep requests descriptive and serializable in spirit; put backend behavior in resolvers, not request methods.",
            }
    }
}

export const entry_snapshot = (model: Model): Snapshot => {
    switch (model.entryCase) {
        case "Shape": {
            const probe = entry_probe()

            return {
                input: "Request.makeEntry({ request, ... })",
                operation: "read entry.request",
                result: `${probe.entryTag} · ${probe.completion}`,
                invariant:
                    "entry starts pending until completion callback receives an Exit",
                implementation:
                    "makeEntry returns the supplied component object",
                guidance:
                    "Think of Entry as the resolver's pending-work envelope around the original Request.",
            }
        }

        case "Context":
            return {
                input: "entry.context",
                operation: "carry Request.Services<R>",
                result: "Context for resolver-side request requirements",
                invariant:
                    "the request's R type determines the Entry context type",
                implementation: "Context.Context<Services<Request>>",
                guidance:
                    "Declare request service requirements only when the resolver needs access to those services for that request.",
            }

        case "Flag": {
            const probe = entry_probe()

            return {
                input: "entry.uninterruptible",
                operation: "inspect runtime flag",
                result: String(probe.uninterruptible),
                invariant: "flag belongs to batching/caching runtime machinery",
                implementation: "mutable boolean field on Entry",
                guidance:
                    "Resolver code can observe this field, but application request data should not depend on it.",
            }
        }

        case "Unsafe":
            return {
                input: "entry.completeUnsafe(exit)",
                operation: "supply final Exit directly",
                result: "pending entry becomes completed",
                invariant: "unsafe hook bypasses Effect wrapping",
                implementation:
                    "public helpers call completeUnsafe through Effect.sync",
                guidance:
                    "Prefer succeed/fail/complete/completeEffect unless you are implementing lower-level request infrastructure.",
            }
    }
}

export const complete_snapshot = (model: Model): Snapshot => {
    switch (model.completeCase) {
        case "Succeed": {
            const probe = succeed_probe()

            return {
                input: "Request.succeed(entry, user)",
                operation: "wrap value in successful Exit",
                result: probe.completion,
                invariant: "value type is Request.Success<R>",
                implementation: "complete(entry, Exit.succeed(value))",
                guidance:
                    "Use succeed for the normal happy path in custom RequestResolver implementations.",
            }
        }

        case "Fail": {
            const probe = fail_probe()

            return {
                input: 'Request.fail(entry, "NotFound")',
                operation: "wrap typed error in failure Exit",
                result: probe.completion,
                invariant: "error type is Request.Error<R>",
                implementation: "complete(entry, Exit.fail(error))",
                guidance:
                    "Use fail when the resolver has a domain/request-specific typed error value.",
            }
        }

        case "Cause": {
            const probe = cause_probe()

            return {
                input: 'Request.failCause(entry, Cause.fail("Offline"))',
                operation: "preserve structured Cause",
                result: probe.completion,
                invariant:
                    "Cause can carry richer failure structure than E alone",
                implementation: "complete(entry, Exit.failCause(cause))",
                guidance:
                    "Use failCause when structured cause information matters; use fail for ordinary typed failures.",
            }
        }

        case "Exit": {
            const probe = complete_probe()

            return {
                input: "Request.complete(entry, Exit.succeed(user))",
                operation: "store prebuilt final Exit",
                result: probe.completion,
                invariant: "Result<R> is the request's Exit<Success, Error>",
                implementation:
                    "Effect.sync(() => entry.completeUnsafe(result))",
                guidance:
                    "Use complete when resolver logic already has the final Exit and should not deconstruct it first.",
            }
        }

        case "Effect": {
            const probe = complete_effect_probe()

            return {
                input: 'Request.completeEffect(entry, Effect.fail("Offline"))',
                operation: "run Effect and capture its typed result",
                result: `${probe.completionEffect} · ${probe.requestResult}`,
                invariant:
                    "request error is stored, not re-failed by the completion Effect",
                implementation: "matchEffect → complete success/failure",
                guidance:
                    "Use completeEffect when resolver work is already an Effect; remember its request error becomes data in the entry result.",
            }
        }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRequestStage: {
        stage: Stage,
    },
    SelectedRequestDefineCase: {
        defineCase: DefineCase,
    },
    SelectedRequestInspectCase: {
        inspectCase: InspectCase,
    },
    SelectedRequestEntryCase: {
        entryCase: EntryCase,
    },
    SelectedRequestCompleteCase: {
        completeCase: CompleteCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Define",
    defineCase: "Tagged",
    inspectCase: "Guard",
    entryCase: "Shape",
    completeCase: "Succeed",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type DefineCasePayload = Readonly<{
    defineCase: DefineCase
}>

type InspectCasePayload = Readonly<{
    inspectCase: InspectCase
}>

type EntryCasePayload = Readonly<{
    entryCase: EntryCase
}>

type CompleteCasePayload = Readonly<{
    completeCase: CompleteCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRequestStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedRequestDefineCase: ({ defineCase }: DefineCasePayload) => ({
            model: evo(model, {
                defineCase: () => defineCase,
            }),
        }),

        SelectedRequestInspectCase: ({ inspectCase }: InspectCasePayload) => ({
            model: evo(model, {
                inspectCase: () => inspectCase,
            }),
        }),

        SelectedRequestEntryCase: ({ entryCase }: EntryCasePayload) => ({
            model: evo(model, {
                entryCase: () => entryCase,
            }),
        }),

        SelectedRequestCompleteCase: ({
            completeCase,
        }: CompleteCasePayload) => ({
            model: evo(model, {
                completeCase: () => completeCase,
            }),
        }),
    })
