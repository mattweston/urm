import { Effect } from "effect"

import { RoutePlanError } from "../errors.ts"
import type { PublishedPage } from "../snapshot.ts"
import { outputPathFor } from "./output-path.ts"

export type PlannedRoute = Readonly<{
    page: PublishedPage
    output_path: string
}>

export const planRoutes = (
    pages: ReadonlyArray<PublishedPage>
): Effect.Effect<ReadonlyArray<PlannedRoute>, RoutePlanError> =>
    Effect.gen(function* () {
        if (pages.length === 0) {
            return yield* Effect.fail(
                new RoutePlanError({
                    path: "",
                    reason: "A release must contain at least one route",
                })
            )
        }

        const seenPaths = new Set<string>()
        const seenOutputs = new Set<string>()
        const planned: Array<PlannedRoute> = []

        for (const page of pages) {
            if (seenPaths.has(page.path)) {
                return yield* Effect.fail(
                    new RoutePlanError({
                        path: page.path,
                        reason: "Duplicate route",
                    })
                )
            }

            const output_path = yield* outputPathFor(page.path)
            if (seenOutputs.has(output_path)) {
                return yield* Effect.fail(
                    new RoutePlanError({
                        path: page.path,
                        reason: `Output collision at "${output_path}"`,
                    })
                )
            }

            seenPaths.add(page.path)
            seenOutputs.add(output_path)
            planned.push({ page, output_path })
        }

        return planned.sort((left, right) =>
            left.page.path.localeCompare(right.page.path)
        )
    })
