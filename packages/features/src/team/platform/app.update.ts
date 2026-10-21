import { Match as M } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import {
    // ClickedTeamHome,
    // SelectedRoleChanged,
    GotSidebarTooltipMessage,
    type Message,
} from "./app.message.ts"
import type { Model } from "./app.model.ts"
import {
    getSidebarTooltipsState,
    resetSidebarTooltipsState,
    setSidebarTooltipsState,
} from "./sidebar.tooltips.state.ts"
import {
    SIDEBAR_TOOLTIP_HOME_KEY,
    SIDEBAR_TOOLTIP_TOGGLE_KEY,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const mapSidebarTooltipCommands = (
    key: string,
    commands: ReadonlyArray<Command.Command<Ui.Tooltip.Message>>
) =>
    Command.mapMessages(commands, (message) =>
        GotSidebarTooltipMessage({ tooltipId: key, message })
    )

const delegateSidebarTooltip = (
    model: Model,
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

export const init = (): UpdateReturn => {
    resetSidebarTooltipsState()
    return [
        {
            members: [
                {
                    id: "sofia-davis",
                    name: "Sofia Davis",
                    email: "m@example.com",
                    role: "Owner",
                },
                {
                    id: "jackson-lee",
                    name: "Jackson Lee",
                    email: "p@example.com",
                    role: "Viewer",
                },
                {
                    id: "amelia-rivera",
                    name: "Amelia Rivera",
                    email: "a@example.com",
                    role: "Developer",
                },
            ],
            isSidebarCollapsed: false,
            isSidebarMobileOpen: false,
            sidebarTooltipsRevision: 0,
        },
        [],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SelectedRoleChanged: ({ memberId, role }) => [
                {
                    ...model,
                    members: model.members.map((member) =>
                        member.id === memberId ? { ...member, role } : member
                    ),
                },
                [],
            ],
            ClickedTeamHome: () => [model, []],
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
        })
    )
