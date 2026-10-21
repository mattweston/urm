/** # Learn model
 *
 *  The aggregate state of every routed Learn lesson, held as one field on the
 *  app Model so `main.ts` carries a single `learn` entry rather than one per
 *  lesson. Stateless lessons (a view and a route, no Model of their own) do not
 *  appear here at all.
 */
import { Schema as S } from "effect"

import * as ApiEffect from "@urm/features/learn/api-effect"
import * as ArrayLesson from "@urm/features/learn/array"
import * as CacheLesson from "@urm/features/learn/cache"
import * as EffectLesson from "@urm/features/learn/effect"
import * as FiberLesson from "@urm/features/learn/fiber"
import * as FunctionLesson from "@urm/features/learn/function"
import * as PersistedQueueLesson from "@urm/features/learn/persisted-queue"
import * as RecordLesson from "@urm/features/learn/record"
import * as ResultLesson from "@urm/features/learn/result"
import * as SchemaLesson from "@urm/features/learn/schema"
import * as StringLesson from "@urm/features/learn/string"
import * as TupleLesson from "@urm/features/learn/tuple"
import * as GeneratorYieldLesson from "@urm/features/learn/generator-yield"

import * as FoldkitLesson from "@urm/features/learn/walkthrough"
import * as ManagedResourceLayer from "@urm/features/learn/managed-resource-layer"
import * as NullishCoalescingInput from "@urm/features/learn/nullish-coalescing-input"
import * as NumberLesson from "@urm/features/learn/number"
import * as Reduce from "@urm/features/learn/reduce"
import * as EffectRunner from "@urm/features/learn/runner"

export const Model = S.Struct({
    api_effect: ApiEffect.Model,
    array: ArrayLesson.Model,
    cache: CacheLesson.Model,
    effect: EffectLesson.Model,
    fiber: FiberLesson.Model,
    function_lesson: FunctionLesson.Model,
    persisted_queue: PersistedQueueLesson.Model,
    record: RecordLesson.Model,
    result: ResultLesson.Model,
    schema: SchemaLesson.Model,
    string: StringLesson.Model,
    tuple: TupleLesson.Model,
    generator_yield: GeneratorYieldLesson.Model,
    foldkit: FoldkitLesson.Model,
    managed_resource_layer: ManagedResourceLayer.Model,
    nullish_coalescing_input: NullishCoalescingInput.Model,
    number: NumberLesson.Model,
    reduce: Reduce.Model,
    effect_runner: EffectRunner.Model,
})

export type Model = typeof Model.Type
