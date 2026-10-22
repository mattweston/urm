import { Pipeable, Schema as S, pipe } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// PIPEABLE EXAMPLES
// -----------------------------------------------------------------------------

export class NumberBox extends Pipeable.Class {
    declare pipe: Pipeable.Pipeable["pipe"]

    constructor(readonly value: number) {
        super()
    }

    increment(): NumberBox {
        return new NumberBox(this.value + 1)
    }
}

export class Counter {
    constructor(readonly value: number) {}

    increment(): Counter {
        return new Counter(this.value + 1)
    }

    add(amount: number): Counter {
        return new Counter(this.value + amount)
    }
}

export const PipeableCounter = Pipeable.Mixin(Counter)

export const prototype_box: Pipeable.Pipeable &
    Readonly<{
        value: number
    }> = Object.assign(Object.create(Pipeable.Prototype) as Pipeable.Pipeable, {
    value: 7,
})

export const manual_pipe = {
    value: 5,

    pipe(
        first: (value: number) => number,
        second: (value: number) => number
    ): number {
        return Pipeable.pipeArguments(this.value, arguments) as number
    },
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Contract"),
    S.Literal("Arguments"),
    S.Literal("Class"),
    S.Literal("Mixin"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Contract",
    "Arguments",
    "Class",
    "Mixin",
]

export const ContractCase = S.Union([
    S.Literal("Method"),
    S.Literal("Standalone"),
    S.Literal("Types"),
])
export type ContractCase = typeof ContractCase.Type

export const ArgumentsCase = S.Union([
    S.Literal("Zero"),
    S.Literal("Chain"),
    S.Literal("Fallback"),
])
export type ArgumentsCase = typeof ArgumentsCase.Type

export const ClassCase = S.Union([
    S.Literal("Prototype"),
    S.Literal("BaseClass"),
    S.Literal("Subclass"),
])
export type ClassCase = typeof ClassCase.Type

export const MixinCase = S.Union([
    S.Literal("Existing"),
    S.Literal("Members"),
    S.Literal("Pipeline"),
])
export type MixinCase = typeof MixinCase.Type

export const Model = S.Struct({
    stage: Stage,
    contractCase: ContractCase,
    argumentsCase: ArgumentsCase,
    classCase: ClassCase,
    mixinCase: MixinCase,
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
    Contract: {
        eyebrow: "method-style left-to-right composition",
        title: "Pipeable gives a value a typed .pipe(...) method without defining domain operations itself",
        description:
            "A Pipeable value passes itself into the first unary function, then feeds each result into the next function. Calling pipe with no functions returns the original value. The overloads preserve the changing type through long pipelines.",
        code: `const box =
    new NumberBox(
        5
    )

const result =
    box.pipe(
        (
            value: NumberBox
        ) =>
            value.value,
        (
            value: number
        ) =>
            value + 2,
        (
            value: number
        ) =>
            value * 3,
        (
            value: number
        ) =>
            \`value=\${value}\`
    )
// "value=21"

box.pipe() === box
// true`,
        apis: ["Pipeable.Pipeable"],
        notice: "Pipeable only defines composition syntax. It does not make operations lazy or effectful by itself; the functions in the pipeline decide what each transformation means.",
    },

    Arguments: {
        eyebrow: "shared runtime implementation",
        title: "pipeArguments implements the variadic method from an initial value plus JavaScript arguments",
        description:
            "pipeArguments is the low-level helper behind the reusable implementations. It returns the input unchanged for zero functions, has direct fast paths through nine functions, and uses a loop for longer pipelines.",
        code: `const manualPipe = {
    value: 5,

    pipe(
        first:
            (
                value: number
            ) => number,
        second:
            (
                value: number
            ) => number
    ): number {
        return Pipeable
            .pipeArguments(
                this.value,
                arguments
            ) as number
    }
}

manualPipe.pipe(
    (
        value: number
    ) =>
        value + 2,
    (
        value: number
    ) =>
        value * 3
)
// 21`,
        apis: ["Pipeable.pipeArguments"],
        notice: "pipeArguments returns unknown because a raw IArguments object cannot encode the overload chain. The Pipeable interface provides the precise compile-time typing; pipeArguments supplies the runtime mechanics.",
    },

    Class: {
        eyebrow: "prototype reuse or inheritance",
        title: "Reuse the standard implementation through Prototype or extend the provided Pipeable base Class",
        description:
            "Prototype is a reusable object whose pipe method delegates to pipeArguments. Class installs that Prototype as its base prototype so subclasses inherit the fully typed Pipeable interface while defining their own domain fields and methods.",
        code: `class NumberBox
    extends Pipeable.Class
{
    constructor(
        readonly value: number
    ) {
        super()
    }

    increment(): NumberBox {
        return new NumberBox(
            this.value + 1
        )
    }
}

new NumberBox(
    5
)
    .pipe(
        (
            box: NumberBox
        ) =>
            box.increment(),
        (
            box: NumberBox
        ) =>
            box.value
    )
// 6`,
        apis: [
            "Pipeable.Prototype",
            "Pipeable.Class",
            "Pipeable.PipeableConstructor",
        ],
        notice: "Prototype is useful for object/prototype construction; Class is the ergonomic inheritance path. Both share the same pipeArguments implementation.",
    },

    Mixin: {
        eyebrow: "add pipe to an existing class",
        title: "Mixin preserves an existing constructor and members while adding the standard .pipe method",
        description:
            "Pipeable.Mixin creates a subclass of the supplied class. Existing instance methods remain available, constructor arguments are preserved, and the new instance also implements Pipeable.",
        code: `class Counter {
    constructor(
        readonly value: number
    ) {}

    add(
        amount: number
    ): Counter {
        return new Counter(
            this.value + amount
        )
    }
}

const PipeableCounter =
    Pipeable.Mixin(
        Counter
    )

const result =
    new PipeableCounter(
        5
    )
        .pipe(
            (
                counter: Counter
            ) =>
                counter.add(
                    4
                ),
            (
                counter: Counter
            ) =>
                counter.value,
            (
                value: number
            ) =>
                value * 10
        )
// 90`,
        apis: ["Pipeable.Mixin", "Pipeable.PipeableConstructor"],
        notice: "Mixin does not mutate the original class prototype. It returns a derived constructor that keeps the original constructor shape and instance members while adding pipe.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ContractSnapshot = Readonly<{
    mode: ContractCase
    zeroFunctions: boolean
    methodResult: string
    standaloneResult: string
    equivalent: boolean
    typeFlow: string
}>

export const contract_snapshot = (model: Model): ContractSnapshot => {
    const box = new NumberBox(5)

    const methodResult = box.pipe(
        (value: NumberBox): number => value.value,
        (value: number): number => value + 2,
        (value: number): number => value * 3,
        (value: number): string => `value=${value}`
    )

    const standaloneResult = pipe(
        box,
        (value: NumberBox): number => value.value,
        (value: number): number => value + 2,
        (value: number): number => value * 3,
        (value: number): string => `value=${value}`
    )

    return {
        mode: model.contractCase,
        zeroFunctions: box.pipe() === box,
        methodResult,
        standaloneResult,
        equivalent: methodResult === standaloneResult,
        typeFlow: "NumberBox → number → number → number → string",
    }
}

export type ArgumentsSnapshot = Readonly<{
    mode: ArgumentsCase
    input: number
    first: string
    second: string
    result: number
    zeroRule: string
    optimized: string
    fallback: string
}>

export const arguments_snapshot = (model: Model): ArgumentsSnapshot => ({
    mode: model.argumentsCase,
    input: manual_pipe.value,
    first: "+ 2",
    second: "× 3",
    result: manual_pipe.pipe(
        (value: number): number => value + 2,
        (value: number): number => value * 3
    ),
    zeroRule: "0 functions → original self",
    optimized: "1–9 functions → direct nested fast paths",
    fallback: "10+ functions → left-to-right loop",
})

export type ClassSnapshot = Readonly<{
    mode: ClassCase
    prototypeResult: number
    classStart: number
    classIncrement: number
    pipeResult: string
    inherited: string
}>

export const class_snapshot = (model: Model): ClassSnapshot => {
    const box = new NumberBox(5)

    return {
        mode: model.classCase,
        prototypeResult: prototype_box.pipe(
            (value: typeof prototype_box): number => value.value,
            (value: number): number => value + 1
        ),
        classStart: box.value,
        classIncrement: box.increment().value,
        pipeResult: box.pipe(
            (value: NumberBox): NumberBox => value.increment(),
            (value: NumberBox): number => value.value,
            (value: number): string => `count=${value}`
        ),
        inherited: "NumberBox extends Pipeable.Class",
    }
}

export type MixinSnapshot = Readonly<{
    mode: MixinCase
    constructor: string
    start: number
    domainMethod: number
    pipeline: number
    hasPipe: boolean
    originalClass: string
}>

export const mixin_snapshot = (model: Model): MixinSnapshot => {
    const counter = new PipeableCounter(5)

    return {
        mode: model.mixinCase,
        constructor: "new PipeableCounter(5)",
        start: counter.value,
        domainMethod: counter.add(4).value,
        pipeline: counter.pipe(
            (value: Counter): Counter => value.add(4),
            (value: Counter): number => value.value,
            (value: number): number => value * 10
        ),
        hasPipe: typeof counter.pipe === "function",
        originalClass:
            "Counter remains usable without modifying Counter.prototype",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPipeableStage: {
        stage: Stage,
    },
    SelectedPipeableContractCase: {
        contractCase: ContractCase,
    },
    SelectedPipeableArgumentsCase: {
        argumentsCase: ArgumentsCase,
    },
    SelectedPipeableClassCase: {
        classCase: ClassCase,
    },
    SelectedPipeableMixinCase: {
        mixinCase: MixinCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Contract",
    contractCase: "Method",
    argumentsCase: "Chain",
    classCase: "BaseClass",
    mixinCase: "Pipeline",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ContractCasePayload = Readonly<{
    contractCase: ContractCase
}>

type ArgumentsCasePayload = Readonly<{
    argumentsCase: ArgumentsCase
}>

type ClassCasePayload = Readonly<{
    classCase: ClassCase
}>

type MixinCasePayload = Readonly<{
    mixinCase: MixinCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPipeableStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedPipeableContractCase: ({
            contractCase,
        }: ContractCasePayload) => ({
            model: modifyFields(model, {
                contractCase: () => contractCase,
            }),
        }),

        SelectedPipeableArgumentsCase: ({
            argumentsCase,
        }: ArgumentsCasePayload) => ({
            model: modifyFields(model, {
                argumentsCase: () => argumentsCase,
            }),
        }),

        SelectedPipeableClassCase: ({ classCase }: ClassCasePayload) => ({
            model: modifyFields(model, {
                classCase: () => classCase,
            }),
        }),

        SelectedPipeableMixinCase: ({ mixinCase }: MixinCasePayload) => ({
            model: modifyFields(model, {
                mixinCase: () => mixinCase,
            }),
        }),
    })
