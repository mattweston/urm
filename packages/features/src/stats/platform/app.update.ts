import { Match as M } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { toString as urlToString } from "foldkit/url"
import type { AppModel } from "./app.model.ts"
import { GotSidebarTooltipMessage, type AppMessage } from "./app.message.ts"
import { loadExternal, navigateInternal } from "./route.command.ts"
import { isAppScope, urlToAppRoute } from "./route.ts"
import {
    getSidebarTooltipsState,
    resetSidebarTooltipsState,
    setSidebarTooltipsState,
} from "./sidebar.tooltips.state.ts"
import {
    SIDEBAR_TOOLTIP_HOME_KEY,
    SIDEBAR_TOOLTIP_TOGGLE_KEY,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"

type UpdateReturn = readonly [
    AppModel,
    ReadonlyArray<Command.Command<AppMessage>>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const mapSidebarTooltipCommands = (
    key: string,
    commands: ReadonlyArray<Command.Command<Ui.Tooltip.Message>>
) =>
    Command.mapMessages(commands, (message) =>
        GotSidebarTooltipMessage({ tooltipId: key, message })
    )

const delegateSidebarTooltip = (
    model: AppModel,
    key: string,
    message: Ui.Tooltip.Message
): UpdateReturn => {
    const sidebarTooltips = getSidebarTooltipsState()

    const maybeTooltip =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? sidebarTooltips.toggle
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? sidebarTooltips.home
              : sidebarTooltips.navItems[key]

    if (maybeTooltip === undefined) {
        return [model, []]
    }

    const { model: nextTooltip, commands = [] } = Ui.Tooltip.update(
        maybeTooltip,
        message
    )

    const nextSidebarTooltips =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? {
                  ...sidebarTooltips,
                  toggle: nextTooltip,
              }
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? {
                    ...sidebarTooltips,
                    home: nextTooltip,
                }
              : {
                    ...sidebarTooltips,
                    navItems: {
                        ...sidebarTooltips.navItems,
                        [key]: nextTooltip,
                    },
                }

    setSidebarTooltipsState(nextSidebarTooltips)

    return [
        {
            ...model,
            sidebarTooltipsRevision: model.sidebarTooltipsRevision + 1,
        },
        mapSidebarTooltipCommands(key, commands),
    ]
}

export const init = (pathname: string): UpdateReturn => {
    resetSidebarTooltipsState()
    return [
        {
            route: urlToAppRoute(pathname),
            isSidebarCollapsed: false,
            isSidebarMobileOpen: false,
            sidebarTooltipsRevision: 0,
        },
        [],
    ]
}

export const update = (model: AppModel, message: AppMessage): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        Internal: ({ url }) => {
                            if (isAppScope(url.pathname)) {
                                return [model, [navigateInternal(url)]]
                            }

                            return [model, [loadExternal(urlToString(url))]]
                        },
                        External: ({ href }) => [model, [loadExternal(href)]],
                    })
                ),
            ChangedUrl: ({ url }) => [
                {
                    ...model,
                    route: urlToAppRoute(url.pathname),
                },
                [],
            ],
            GotSidebarTooltipMessage: ({ tooltipId: key, message }) =>
                delegateSidebarTooltip(model, key, message),
            ToggledAppSidebarIsCollapsed: () => [
                { ...model, isSidebarCollapsed: !model.isSidebarCollapsed },
                [],
            ],
            ToggledAppSidebarMobileIsOpen: () => [
                { ...model, isSidebarMobileOpen: !model.isSidebarMobileOpen },
                [],
            ],
            CompletedNavigateInternal: () => [model, []],
            CompletedLoadExternal: () => [model, []],
        })
    )
