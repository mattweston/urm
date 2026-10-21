/** # Learn messages
 *
 *  One `Got*Message` wrapper per stateful lesson, unioned into a single
 *  `Message` that `main.ts` routes through one `GotLearnMessage` branch.
 */
import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

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

export const GotArrayMessage = taggedStruct("GotArrayMessage", {
    message: ArrayLesson.Message,
})
export const GotCacheMessage = taggedStruct("GotCacheMessage", {
    message: CacheLesson.Message,
})
export const GotEffectMessage = taggedStruct("GotEffectMessage", {
    message: EffectLesson.Message,
})
export const GotFiberMessage = taggedStruct("GotFiberMessage", {
    message: FiberLesson.Message,
})
export const GotFunctionMessage = taggedStruct("GotFunctionMessage", {
    message: FunctionLesson.Message,
})
export const GotPersistedQueueMessage = taggedStruct(
    "GotPersistedQueueMessage",
    { message: PersistedQueueLesson.Message }
)
export const GotRecordMessage = taggedStruct("GotRecordMessage", {
    message: RecordLesson.Message,
})
export const GotResultMessage = taggedStruct("GotResultMessage", {
    message: ResultLesson.Message,
})
export const GotSchemaMessage = taggedStruct("GotSchemaMessage", {
    message: SchemaLesson.Message,
})
export const GotStringMessage = taggedStruct("GotStringMessage", {
    message: StringLesson.Message,
})
export const GotTupleMessage = taggedStruct("GotTupleMessage", {
    message: TupleLesson.Message,
})
export const GotGeneratorYieldMessage = taggedStruct(
    "GotGeneratorYieldMessage",
    {
        message: GeneratorYieldLesson.Message,
    }
)
export const GotApiEffectMessage = taggedStruct("GotApiEffectMessage", {
    message: ApiEffect.Message,
})
export const GotFoldkitMessage = taggedStruct("GotFoldkitMessage", {
    message: FoldkitLesson.Message,
})
export const GotManagedResourceLayerMessage = taggedStruct(
    "GotManagedResourceLayerMessage",
    { message: ManagedResourceLayer.Message }
)
export const GotNullishCoalescingInputMessage = taggedStruct(
    "GotNullishCoalescingInputMessage",
    { message: NullishCoalescingInput.Message }
)
export const GotNumberMessage = taggedStruct("GotNumberMessage", {
    message: NumberLesson.Message,
})
export const GotReduceMessage = taggedStruct("GotReduceMessage", {
    message: Reduce.Message,
})
export const GotEffectRunnerMessage = taggedStruct("GotEffectRunnerMessage", {
    message: EffectRunner.Message,
})

export const Message = S.Union([
    GotApiEffectMessage,
    GotArrayMessage,
    GotCacheMessage,
    GotEffectMessage,
    GotFiberMessage,
    GotFunctionMessage,
    GotPersistedQueueMessage,
    GotRecordMessage,
    GotResultMessage,
    GotSchemaMessage,
    GotStringMessage,
    GotTupleMessage,
    GotGeneratorYieldMessage,
    GotFoldkitMessage,
    GotManagedResourceLayerMessage,
    GotNullishCoalescingInputMessage,
    GotNumberMessage,
    GotReduceMessage,
    GotEffectRunnerMessage,
])

export type Message = typeof Message.Type
