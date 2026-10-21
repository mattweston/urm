/** # Menu view */
import { Match as M } from "effect"
import * as Ui from "@foldkit/ui"
import { childAttributes } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Icon from "../_shared/icon.ts"
import { GotAnimatedMessage, GotBasicMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const triggerClassName =
    "inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background text-foreground hover:bg-accent select-none [box-shadow:var(--shadow-control)]"

const basicItemsClassName =
    "absolute mt-1 w-48 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] overflow-hidden z-10 outline-none"

const animatedItemsClassName =
    "absolute mt-1 w-48 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] overflow-hidden z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"

const itemClassName =
    "px-3 py-2 text-base text-muted-foreground cursor-pointer data-[active]:bg-accent data-[active]:text-accent-foreground data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const backdropClassName = "fixed inset-0 z-0"

const wrapperClassName = "relative inline-block"

const headingClassName =
    "px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"

const ICON_SIZE = "w-4 h-4"

type MenuItem = "Edit" | "Duplicate" | "Archive" | "Move" | "Delete"

const MENU_ITEMS: ReadonlyArray<MenuItem> = [
    "Edit",
    "Duplicate",
    "Archive",
    "Move",
    "Delete",
]

const menuItemIcon = (item: MenuItem): Html =>
    M.value(item).pipe(
        M.when("Edit", () => Icon.pencil(ICON_SIZE)),
        M.when("Duplicate", () => Icon.documentDuplicate(ICON_SIZE)),
        M.when("Archive", () => Icon.archiveBox(ICON_SIZE)),
        M.when("Move", () => Icon.arrowRight(ICON_SIZE)),
        M.when("Delete", () => Icon.trash(ICON_SIZE)),
        M.exhaustive
    )

const isItemDisabled = (item: MenuItem): boolean => item === "Archive"

const itemGroupKey = (item: MenuItem): string =>
    M.value(item).pipe(
        M.when("Delete", () => "Danger"),
        M.orElse(() => "Actions")
    )

const groupToHeading = <ParentMessage>(
    groupKey: string,
    h: HtmlBuilder<ParentMessage>
): Ui.Menu.GroupHeading | undefined => {
    return M.value(groupKey).pipe(
        M.when("Danger", () => ({
            content: h.span([], ["Danger Zone"]),
            className: headingClassName,
        })),
        M.orElse(() => undefined)
    )
}

const MENU_ANCHOR = {
    placement: "bottom-start" as const,
    gap: 4,
    padding: 8,
}

const menuViewConfig = <ParentMessage>(
    itemsClassNameValue: string,
    h: HtmlBuilder<ParentMessage>
) => {
    return {
        anchor: MENU_ANCHOR,
        items: MENU_ITEMS,
        itemToConfig: (item: MenuItem) => ({
            className: itemClassName,
            content: h.div(
                [h.Class("flex items-center gap-2.5")],
                [menuItemIcon(item), h.span([], [item])]
            ),
        }),
        isItemDisabled,
        buttonContent: h.div(
            [h.Class("flex items-center gap-4")],
            [h.span([], ["Actions"]), Icon.chevronDown("w-4 h-4")]
        ),
        buttonAttributes: childAttributes([h.Class(triggerClassName)]),
        itemsAttributes: childAttributes([h.Class(itemsClassNameValue)]),
        backdropAttributes: childAttributes([h.Class(backdropClassName)]),
        attributes: childAttributes([h.Class(wrapperClassName)]),
        itemGroupKey,
        groupToHeading: (groupKey: string) =>
            groupToHeading<ParentMessage>(groupKey, h),
    }
}

const Menu = Ui.Menu.create<MenuItem>()

/**
 * Open either menu and navigate its actions with the pointer or keyboard. The
 * animated variant changes presentation without changing the menu state model
 * or its typed messages.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { basic: menuBasic, animated: menuAnimated } = model
    const basicToMessage = (message: Ui.Menu.Message): ParentMessage =>
        toParentMessage(GotBasicMessage({ message }))
    const animatedToMessage = (message: Ui.Menu.Message): ParentMessage =>
        toParentMessage(GotAnimatedMessage({ message }))
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Menu"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: menuBasic.id,
                        model: menuBasic,
                        view: Menu.view,
                        viewInputs: menuViewConfig<ParentMessage>(
                            basicItemsClassName,
                            h
                        ),
                        toParentMessage: basicToMessage,
                    }),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Animated"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: menuAnimated.id,
                        model: menuAnimated,
                        view: Menu.view,
                        viewInputs: menuViewConfig<ParentMessage>(
                            animatedItemsClassName,
                            h
                        ),
                        toParentMessage: animatedToMessage,
                    }),
                ]
            ),
        ]
    )
}
