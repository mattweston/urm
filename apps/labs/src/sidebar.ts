/** # Learn sidebar navigation
 *
 *  The `Learn` subtree of the app sidebar, built entirely from the lesson
 *  catalogue. There is no hand-written list: a lesson appears where its own
 *  href says it lives.
 *
 *  Nothing in this file is tied to the app's Message type, so the shell embeds
 *  it without threading one through.
 */
import type { PortalSidebarNavItem } from "@urm/ui/foldkit/sidebar-shell.view.ts"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"

import { lessons, subjects } from "./lessons.ts"

/** The sidebar mirrors the filesystem: `learn/<subject>/<lesson>` renders as a
 *  `<subject>` group containing `<lesson>`, and a lesson that is its own subject
 *  (`learn/number`) renders as a leaf. Both come from the lesson's own href, so
 *  moving a lesson between subjects moves it in the sidebar too and the two
 *  cannot drift apart.
 */
const SUBJECT_ICON = AppIcon.IconFileCode

/** The path segments under `/labs/learn/`, e.g. `["scope", "acquire-release"]`. */
const segments_of = (href: string): ReadonlyArray<string> =>
    href
        .replace(/^\/labs\/learn\/?/, "")
        .replace(/\/+$/, "")
        .split("/")

const title_case = (subject: string): string =>
    subject
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")

export const nav_items = <ParentMessage>(): ReadonlyArray<
    PortalSidebarNavItem<ParentMessage>
> => {
    const items: Array<PortalSidebarNavItem<ParentMessage>> = []
    const subject_index = new Map<string, number>()

    for (const lesson of lessons) {
        const leaf = {
            label: lesson.label,
            routeTag: lesson.tag,
            href: lesson.href,
            icon: lesson.icon,
        }
        const segments = segments_of(lesson.href)

        if (segments.length < 2) {
            items.push(leaf)
            continue
        }

        const subject = segments[0] ?? ""
        const existing = subject_index.get(subject)
        if (existing === undefined) {
            subject_index.set(subject, items.length)
            const entry = subjects.find((one) => one.slug === subject)
            items.push({
                label: entry?.label ?? title_case(subject),
                routeTag: entry?.tag ?? `Learn${title_case(subject)}`,
                // The subject has a page of its own listing what is under it.
                href: entry?.href ?? `/labs/learn/${subject}/`,
                icon: SUBJECT_ICON,
                children: [leaf],
            })
            continue
        }

        const group = items[existing]
        if (group !== undefined) {
            items[existing] = {
                ...group,
                children: [...(group.children ?? []), leaf],
            }
        }
    }

    return items
}
