import { Array } from "effect"
import type { RichTextEditorModel } from "./rich-text-editor.schema.ts"
import { richTextSlashCommandDefinitions } from "./rich-text-editor.registry.ts"

export type RichTextSlashCommand =
    (typeof richTextSlashCommandDefinitions)[number]

export const filteredRichTextSlashCommands = (
    query: string
): ReadonlyArray<RichTextSlashCommand> => {
    const normalized = query.trim().toLowerCase()
    if (normalized === "") return richTextSlashCommandDefinitions

    return Array.map(richTextSlashCommandDefinitions, (command) => {
        const label = command.label.toLowerCase()
        const value = command.value.toLowerCase()
        const score = label.startsWith(normalized)
            ? 0
            : value.startsWith(normalized)
              ? 1
              : label.includes(normalized)
                ? 2
                : value.includes(normalized)
                  ? 3
                  : undefined
        return { command, score }
    })
        .filter(
            (
                match
            ): match is { command: RichTextSlashCommand; score: number } =>
                match.score !== undefined
        )
        .sort((left, right) => left.score - right.score)
        .map((match) => match.command)
}

export const normalizeRichTextSlashMenuIndex = (
    query: string,
    activeIndex: number
): number => {
    const commands = filteredRichTextSlashCommands(query)
    if (commands.length === 0) return 0
    if (activeIndex === -1) return -1
    if (activeIndex < 0) return commands.length - 1
    return ((activeIndex % commands.length) + commands.length) % commands.length
}

export const activeSlashCommandValue = (
    model: RichTextEditorModel
): string | undefined => {
    const commands = filteredRichTextSlashCommands(model.slashMenu.query)
    return commands[
        normalizeRichTextSlashMenuIndex(
            model.slashMenu.query,
            model.slashMenu.activeIndex
        )
    ]?.value
}
