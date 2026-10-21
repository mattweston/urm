/** # Learn navigation
 *
 *  Route tags, titles and breadcrumbs for `/learn/...`, derived from
 *  {@link lessons} so a catalogue entry is all a flat lesson needs.
 *
 *  Foldkit and Visual Effect are grouped lessons: they own a family of
 *  sub-routes whose label comes from the sidebar's own nav items, so both take
 *  that label from the caller rather than the catalogue.
 */
import { Array, Option } from "effect"

import * as FoldkitLesson from "@urm/features/learn/walkthrough"

import { lessons, subject_for_path, subjects } from "./lessons.ts"

const matching_lesson = (learn_path: string) =>
    Array.findFirst(lessons, (lesson) => lesson.is_path(learn_path))

/** The sidebar `routeTag` for a `/learn/...` path, or `Learn` for the index. */
export const route_tag = (learn_path: string): string => {
    const subject = subject_for_path(learn_path)
    if (subject !== undefined) return subject.tag
    return Option.match(matching_lesson(learn_path), {
        onSome: (lesson) => lesson.tag,
        onNone: () => "Learn",
    })
}

/** `nested_label` names the active sub-route of a grouped lesson. */
export const route_title = (
    learn_path: string,
    nested_label: string | undefined
): string => {
    if (FoldkitLesson.isFoldkitPath(learn_path))
        return `${nested_label ?? "Foldkit"} · Foldkit · Learn · URM`
    const subject = subject_for_path(learn_path)
    if (subject !== undefined) return `${subject.label} · Learn · URM`
    return Option.match(matching_lesson(learn_path), {
        onSome: (lesson) => `${lesson.label} · Learn · URM`,
        onNone: () => "Learn · URM",
    })
}

export const breadcrumb = (
    learn_path: string,
    nested_label: string | undefined
): string => {
    if (FoldkitLesson.isFoldkitPath(learn_path))
        return `Learn / Foldkit / ${nested_label ?? "Model & Message"}`
    const subject = subject_for_path(learn_path)
    if (subject !== undefined) return `Learn / ${subject.label}`
    return Option.match(matching_lesson(learn_path), {
        onSome: (lesson) => {
            const segments = lesson.href
                .replace(/^\/learn\/?/, "")
                .replace(/\/+$/, "")
                .split("/")
            const parent = subjects.find(
                (one) => one.slug === segments[0] && segments.length > 1
            )
            return parent === undefined
                ? `Learn / ${lesson.label}`
                : `Learn / ${parent.label} / ${lesson.label}`
        },
        onNone: () => "Learn",
    })
}
