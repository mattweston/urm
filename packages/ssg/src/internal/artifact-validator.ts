import { Effect } from "effect"

import { ArtifactValidationError } from "../errors.ts"

const FORBIDDEN_STATIC_MARKERS = [
    "data-foldkit-app",
    "data-foldkit-build",
    "data-foldkit-flags",
]

export const validateStaticArtifact = (
    path: string,
    html: string,
    behaviors: ReadonlyArray<string> = []
): Effect.Effect<void, ArtifactValidationError> => {
    const marker = FORBIDDEN_STATIC_MARKERS.find((candidate) =>
        html.includes(candidate)
    )

    if (marker !== undefined) {
        return Effect.fail(
            new ArtifactValidationError({
                path,
                reason: `Static output contains forbidden runtime marker "${marker}"`,
            })
        )
    }

    const scripts = html.match(/<script\b[^>]*><\/script>/g) ?? []
    const expected_scripts = behaviors.map(
        (behavior) => `<script type="module" src="/${behavior}"></script>`
    )
    if (
        scripts.length !== expected_scripts.length ||
        scripts.some((script) => !expected_scripts.includes(script))
    ) {
        return Effect.fail(
            new ArtifactValidationError({
                path,
                reason: "Static output contains an undeclared browser script",
            })
        )
    }

    return Effect.void
}
