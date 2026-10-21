import type { KeyedTokensInfo } from "@shikijs/magic-move/core"

export type { KeyedTokensInfo }

export const parseStepTokens = (
    raw: string | undefined
): ReadonlyArray<KeyedTokensInfo> => {
    if (raw === undefined) {
        return []
    }

    try {
        // Written by the component's own frontmatter in this same build, so the
        // shape is settled before the string exists. A malformed attribute can
        // only mean a broken build, and the catch below turns that into an
        // inert widget rather than a page that throws.
        const parsed: ReadonlyArray<KeyedTokensInfo> = JSON.parse(raw)

        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}
