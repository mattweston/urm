import { Array, Match as M, Number, pipe } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import type { Message } from "./message.ts"
import { type SlowWarning, type Model as SlowWarningsModel } from "./model.ts"
import { burnCpu } from "./burn-cpu.ts"

const UPDATE_WORK_MS = 10
const PATCH_ROW_COUNT = 4000
const MAX_WARNING_COUNT = 8

const prependWarning =
    (warning: SlowWarning) =>
    (warnings: ReadonlyArray<SlowWarning>): ReadonlyArray<SlowWarning> =>
        pipe(warnings, Array.prepend(warning), Array.take(MAX_WARNING_COUNT))

type UpdateReturn = readonly [
    SlowWarningsModel,
    ReadonlyArray<Command.Command<Message>>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (
    model: SlowWarningsModel,
    message: Message
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedRunUpdateWork: () => {
                burnCpu(UPDATE_WORK_MS)

                return [
                    evo(model, {
                        activeWorkload: () => "Update",
                    }),
                    [],
                ]
            },
            ClickedRunViewWork: () => [
                evo(model, {
                    activeWorkload: () => "View",
                }),
                [],
            ],
            ClickedRunPatchWork: () => [
                evo(model, {
                    activeWorkload: () => "Patch",
                    patchRows: () => PATCH_ROW_COUNT,
                    patchRun: Number.increment,
                }),
                [],
            ],
            ClickedRunSubscriptionDependenciesWork: () => [
                evo(model, {
                    activeWorkload: () => "SubscriptionDependencies",
                }),
                [],
            ],
            ClickedClearWarnings: () => [
                evo(model, {
                    activeWorkload: () => "Idle",
                    warnings: () => [],
                }),
                [],
            ],
            RecordedSlowWarning: ({ report }) => {
                const warning: SlowWarning = {
                    id: model.nextWarningId,
                    ...report,
                }

                return [
                    evo(model, {
                        activeWorkload: () => "Idle",
                        nextWarningId: Number.increment,
                        warnings: prependWarning(warning),
                    }),
                    [],
                ]
            },
        })
    )
