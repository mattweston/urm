import { Data, Schema as S } from "effect"

export type SnippetLanguage = "typescript" | "javascript"

export interface CodeSnippet {
    readonly language: SnippetLanguage
    readonly source: string
    readonly highlights_by_target: Readonly<
        Record<string, ReadonlyArray<ResolvedOffsetRange>>
    >
}

export interface CodeSnippetConfig {
    readonly language: SnippetLanguage
    readonly source: string
}

export interface ResolvedOffsetRange {
    readonly start_offset: number
    readonly end_offset: number
}

// A selector names a slice of the snippet without hard-coding offsets, so
// editing the source does not silently move a highlight onto the wrong token.
export type HighlightSelector = Data.TaggedEnum<{
    readonly Text: {
        readonly text: string
        readonly occurrence?: number
    }
    readonly LineRange: {
        readonly start_line: number
        readonly end_line: number
    }
    readonly OffsetRange: {
        readonly start_offset: number
        readonly end_offset: number
    }
}>
export const HighlightSelector = Data.taggedEnum<HighlightSelector>()

export const snippet_result_target_key = "result"

export const to_step_snippet_target_key = (step_id: string): string =>
    `step:${step_id}`

export class CodeSnippetHighlightResolutionError extends S.TaggedError<CodeSnippetHighlightResolutionError>()(
    "CodeSnippetHighlightResolutionError",
    {
        example_label: S.String,
        target_key: S.String,
        selector: S.String,
        reason: S.Literals(["NoMatch", "AmbiguousMatch", "InvalidRange"]),
        matches: S.optional(S.Number),
    }
) {}

export class EmptyHighlightSelectorsError extends S.TaggedError<EmptyHighlightSelectorsError>()(
    "EmptyHighlightSelectorsError",
    {
        example_label: S.String,
        target_key: S.String,
    }
) {}

export class InvalidCodeSnippetLanguageError extends S.TaggedError<InvalidCodeSnippetLanguageError>()(
    "InvalidCodeSnippetLanguageError",
    {
        example_label: S.String,
        language: S.String,
    }
) {}

export const normalize_snippet_source = (source: string): string => {
    let normalized = source

    if (normalized.startsWith("\n")) {
        normalized = normalized.slice(1)
    }

    if (normalized.endsWith("\n")) {
        normalized = normalized.slice(0, -1)
    }

    return normalized
}

export const validate_snippet_language = (
    language: string,
    options: { readonly example_label: string }
): SnippetLanguage => {
    if (language === "typescript" || language === "javascript") {
        return language
    }

    throw new InvalidCodeSnippetLanguageError({
        example_label: options.example_label,
        language,
    })
}

export const normalize_selector_input = (
    selectors: HighlightSelector | ReadonlyArray<HighlightSelector>,
    options: {
        readonly example_label: string
        readonly target_key: string
    }
): ReadonlyArray<HighlightSelector> => {
    const normalized = Array.isArray(selectors)
        ? Array.from(selectors)
        : [selectors]

    if (normalized.length === 0) {
        throw new EmptyHighlightSelectorsError({
            example_label: options.example_label,
            target_key: options.target_key,
        })
    }

    return normalized
}

export const resolve_example_code_snippet = (input: {
    readonly code: CodeSnippetConfig
    readonly selectors_by_target: Readonly<
        Record<string, ReadonlyArray<HighlightSelector>>
    >
    readonly example_label: string
}): CodeSnippet => {
    const source = normalize_snippet_source(input.code.source)

    return {
        language: validate_snippet_language(input.code.language, {
            example_label: input.example_label,
        }),
        source,
        highlights_by_target: resolve_all_selectors({
            source,
            selectors_by_target: input.selectors_by_target,
            example_label: input.example_label,
        }),
    }
}

export const resolve_all_selectors = (input: {
    readonly source: string
    readonly selectors_by_target: Readonly<
        Record<string, ReadonlyArray<HighlightSelector>>
    >
    readonly example_label: string
}): Readonly<Record<string, ReadonlyArray<ResolvedOffsetRange>>> => {
    const highlights_by_target: Record<
        string,
        ReadonlyArray<ResolvedOffsetRange>
    > = {}

    for (const target_key of Object.keys(input.selectors_by_target)) {
        const selectors = input.selectors_by_target[target_key]

        if (!selectors) {
            continue
        }

        if (selectors.length === 0) {
            throw new EmptyHighlightSelectorsError({
                example_label: input.example_label,
                target_key,
            })
        }

        highlights_by_target[target_key] = merge_ranges(
            selectors.map((selector) =>
                resolve_selector({
                    source: input.source,
                    selector,
                    example_label: input.example_label,
                    target_key,
                })
            )
        )
    }

    return highlights_by_target
}

const resolve_selector = (input: {
    readonly source: string
    readonly selector: HighlightSelector
    readonly example_label: string
    readonly target_key: string
}): ResolvedOffsetRange => {
    switch (input.selector._tag) {
        case "Text": {
            const matches = find_text_matches(input.source, input.selector.text)

            if (matches.length === 0) {
                throw new CodeSnippetHighlightResolutionError({
                    example_label: input.example_label,
                    target_key: input.target_key,
                    selector: stringify_selector(input.selector),
                    reason: "NoMatch",
                    matches: 0,
                })
            }

            if (matches.length > 1 && !input.selector.occurrence) {
                throw new CodeSnippetHighlightResolutionError({
                    example_label: input.example_label,
                    target_key: input.target_key,
                    selector: stringify_selector(input.selector),
                    reason: "AmbiguousMatch",
                    matches: matches.length,
                })
            }

            const occurrence = input.selector.occurrence ?? 1

            if (
                !Number.isInteger(occurrence) ||
                occurrence < 1 ||
                occurrence > matches.length
            ) {
                throw new CodeSnippetHighlightResolutionError({
                    example_label: input.example_label,
                    target_key: input.target_key,
                    selector: stringify_selector(input.selector),
                    reason: "InvalidRange",
                    matches: matches.length,
                })
            }

            const start_offset = matches[occurrence - 1] ?? 0

            return ensure_valid_range(
                {
                    start_offset,
                    end_offset: start_offset + input.selector.text.length,
                },
                {
                    source_length: input.source.length,
                    example_label: input.example_label,
                    target_key: input.target_key,
                    selector: stringify_selector(input.selector),
                }
            )
        }
        case "LineRange": {
            const line_starts = get_line_start_offsets(input.source)
            const line_count = line_starts.length
            const { start_line, end_line } = input.selector

            if (
                !Number.isInteger(start_line) ||
                !Number.isInteger(end_line) ||
                start_line < 1 ||
                end_line < start_line ||
                end_line > line_count
            ) {
                throw new CodeSnippetHighlightResolutionError({
                    example_label: input.example_label,
                    target_key: input.target_key,
                    selector: stringify_selector(input.selector),
                    reason: "InvalidRange",
                })
            }

            return ensure_valid_range(
                {
                    start_offset: line_starts[start_line - 1] ?? 0,
                    end_offset:
                        end_line === line_count
                            ? input.source.length
                            : (line_starts[end_line] ?? input.source.length),
                },
                {
                    source_length: input.source.length,
                    example_label: input.example_label,
                    target_key: input.target_key,
                    selector: stringify_selector(input.selector),
                }
            )
        }
        case "OffsetRange": {
            return ensure_valid_range(
                {
                    start_offset: input.selector.start_offset,
                    end_offset: input.selector.end_offset,
                },
                {
                    source_length: input.source.length,
                    example_label: input.example_label,
                    target_key: input.target_key,
                    selector: stringify_selector(input.selector),
                }
            )
        }
    }
}

const find_text_matches = (
    source: string,
    target: string
): ReadonlyArray<number> => {
    if (target.length === 0) {
        return []
    }

    const matches: Array<number> = []
    let search_offset = 0

    while (search_offset <= source.length) {
        const match_index = source.indexOf(target, search_offset)

        if (match_index === -1) {
            break
        }

        matches.push(match_index)
        search_offset = match_index + 1
    }

    return matches
}

const get_line_start_offsets = (source: string): ReadonlyArray<number> => {
    const line_starts: Array<number> = [0]

    for (let index = 0; index < source.length; index++) {
        if (source[index] === "\n") {
            line_starts.push(index + 1)
        }
    }

    return line_starts
}

const ensure_valid_range = (
    range: ResolvedOffsetRange,
    options: {
        readonly source_length: number
        readonly example_label: string
        readonly target_key: string
        readonly selector: string
    }
): ResolvedOffsetRange => {
    if (
        !Number.isInteger(range.start_offset) ||
        !Number.isInteger(range.end_offset) ||
        range.start_offset < 0 ||
        range.start_offset >= range.end_offset ||
        range.end_offset > options.source_length
    ) {
        throw new CodeSnippetHighlightResolutionError({
            example_label: options.example_label,
            target_key: options.target_key,
            selector: options.selector,
            reason: "InvalidRange",
        })
    }

    return range
}

const merge_ranges = (
    ranges: ReadonlyArray<ResolvedOffsetRange>
): ReadonlyArray<ResolvedOffsetRange> => {
    if (ranges.length < 2) {
        return ranges
    }

    const sorted = Array.from(ranges).sort((first, second) =>
        first.start_offset === second.start_offset
            ? first.end_offset - second.end_offset
            : first.start_offset - second.start_offset
    )
    const first_range = sorted[0]

    if (first_range === undefined) {
        return ranges
    }

    const merged: Array<ResolvedOffsetRange> = [first_range]

    for (let index = 1; index < sorted.length; index++) {
        const next_range = sorted[index]
        const previous_range = merged[merged.length - 1]

        if (next_range === undefined || previous_range === undefined) {
            continue
        }

        if (next_range.start_offset <= previous_range.end_offset) {
            merged[merged.length - 1] = {
                start_offset: previous_range.start_offset,
                end_offset: Math.max(
                    previous_range.end_offset,
                    next_range.end_offset
                ),
            }
            continue
        }

        merged.push(next_range)
    }

    return merged
}

const stringify_selector = (selector: HighlightSelector): string => {
    switch (selector._tag) {
        case "Text": {
            const occurrence_text = selector.occurrence
                ? `, occurrence=${selector.occurrence.toString()}`
                : ""
            return `Text(${JSON.stringify(selector.text)}${occurrence_text})`
        }
        case "LineRange":
            return `LineRange(${selector.start_line.toString()}-${selector.end_line.toString()})`
        case "OffsetRange":
            return `OffsetRange(${selector.start_offset.toString()}-${selector.end_offset.toString()})`
    }
}
