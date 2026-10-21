import {
    syncTokenKeys,
    toKeyedTokens,
    type KeyedTokensInfo,
} from "@shikijs/magic-move/core"

export type PrecomputedMachine = Readonly<{
    commit: (index: number) => KeyedTokensInfo
}>

export const createPrecomputedMachine = (
    step_tokens: ReadonlyArray<KeyedTokensInfo>
): PrecomputedMachine => {
    let current = toKeyedTokens("", [])

    return {
        commit: (index: number): KeyedTokensInfo => {
            const step = step_tokens[index]

            if (step === undefined) {
                return current
            }

            const { to } = syncTokenKeys(current, structuredClone(step), {
                lineNumbers: false,
            })

            current = to
            return current
        },
    }
}
