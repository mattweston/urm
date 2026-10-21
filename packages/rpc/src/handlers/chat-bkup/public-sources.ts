import { readdir, readFile } from "node:fs/promises"
import { dirname, extname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { Effect } from "effect"

import { DatabaseError } from "@urm/domain/errors"

export type PublicChatSource = Readonly<{
    id: string
    title: string
    body: string
    sourceReference: string
}>

const publicChatSourceDirectoryPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "sources"
)
const publicChatSourceReferencePrefix =
    "packages/rpc/src/handlers/chat-bkup/sources"

const publicChatStopWords = new Set([
    "about",
    "can",
    "for",
    "help",
    "how",
    "is",
    "me",
    "the",
    "what",
    "with",
    "you",
])

const normalize = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()

const sourceTitle = (content: string, filePath: string): string => {
    const maybeFrontmatterTitle =
        /^---\n[\s\S]*?title:\s*["']?([^\n"']+)["']?[\s\S]*?\n---/.exec(
            content
        )?.[1]

    return maybeFrontmatterTitle ?? filePath.replace(/\.mdx?$/, "")
}

const sourceBody = (content: string): string =>
    content.replace(/^---\n[\s\S]*?\n---\n?/, "").trim()

const readPublicSource = (
    filePath: string
): Effect.Effect<PublicChatSource, DatabaseError> =>
    Effect.tryPromise({
        try: () => readFile(filePath, "utf8"),
        catch: () =>
            new DatabaseError({
                message: "Failed to load public help content.",
            }),
    }).pipe(
        Effect.map((content) => {
            const relativePath = relative(
                publicChatSourceDirectoryPath,
                filePath
            )
                .split(sep)
                .join("/")
            const id = relativePath.replace(/\.mdx?$/, "")

            return {
                id,
                title: sourceTitle(content, relativePath),
                body: sourceBody(content),
                sourceReference: `${publicChatSourceReferencePrefix}/${relativePath}`,
            }
        })
    )

export const loadPublicChatSources = Effect.tryPromise({
    try: () => readdir(publicChatSourceDirectoryPath, { withFileTypes: true }),
    catch: () =>
        new DatabaseError({ message: "Failed to read public help content." }),
}).pipe(
    Effect.flatMap((entries) =>
        Effect.all(
            entries
                .filter(
                    (entry) =>
                        entry.isFile() &&
                        [".md", ".mdx"].includes(extname(entry.name))
                )
                .map((entry) =>
                    readPublicSource(
                        join(publicChatSourceDirectoryPath, entry.name)
                    )
                )
        )
    )
)

export const selectPublicChatSource = (
    sources: ReadonlyArray<PublicChatSource>,
    question: string
): PublicChatSource | undefined => {
    const tokens = normalize(question)
        .split(" ")
        .filter((token) => token.length > 2 && !publicChatStopWords.has(token))

    return sources.reduce<PublicChatSource | undefined>(
        (currentBest, source) => {
            if (currentBest === undefined) {
                return source
            }

            const sourceScore = tokens.reduce(
                (score, token) =>
                    score +
                    (normalize(source.title).split(" ").includes(token)
                        ? 20
                        : 0) +
                    (normalize(source.body).split(" ").includes(token) ? 3 : 0),
                0
            )
            const currentBestScore = tokens.reduce(
                (score, token) =>
                    score +
                    (normalize(currentBest.title).split(" ").includes(token)
                        ? 20
                        : 0) +
                    (normalize(currentBest.body).split(" ").includes(token)
                        ? 3
                        : 0),
                0
            )

            return sourceScore > currentBestScore ? source : currentBest
        },
        undefined
    )
}
