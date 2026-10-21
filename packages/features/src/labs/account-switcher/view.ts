/** # Account Switcher view */
import * as Ui from "@foldkit/ui"
import { Option } from "effect"
import { accountSwitcherView } from "@urm/ui/foldkit/account-switcher.view.ts"
import type { Html, HtmlBuilder } from "foldkit/html"

/**
 * The account switcher combines a selected-account trigger with an accessible
 * anchored listbox.
 */
export const view = <ParentMessage>(
    accountSwitcher: Ui.Listbox.Model,
    maybeSelectedEmail: Option.Option<string>,
    isCollapsed: boolean,
    toParentMessage: (message: Ui.Listbox.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Account Switcher"]
            ),
            h.p(
                [
                    h.Class(
                        "mb-6 max-w-2xl text-sm leading-6 text-muted-foreground"
                    ),
                ],
                [
                    "Static demo only. In production this would read the current tenant from auth context and navigate to the selected tenant domain.",
                ]
            ),
            h.div(
                [h.Class("max-w-sm")],
                [
                    accountSwitcherView<ParentMessage>(
                        {
                            model: accountSwitcher,
                            maybeSelectedEmail: maybeSelectedEmail,
                            isCollapsed: isCollapsed,
                            toParentMessage,
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}
