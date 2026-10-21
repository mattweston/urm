import { islandsFor } from "@foldkit/markdown"
import type { KeyedTokensInfo } from "@shikijs/magic-move/core"
import type { HtmlBuilder } from "foldkit/html"

import * as Tabs from "../../labs/tabs/index.ts"
import * as Interactive from "./interactive.ts"
import { documentationInteractiveIslandViews } from "./interactive-islands.ts"
import { documentationIslandDefinitions } from "./island-definitions.ts"
import { documentationStaticIslandViews } from "./static-islands.ts"

export const documentationIslands = <ParentMessage>(
    tabs: Tabs.ModelType,
    toTabsMessage: (message: Tabs.MessageType) => ParentMessage,
    interactive: Interactive.Model,
    to_interactive_message: (message: Interactive.Message) => ParentMessage,
    magic_move_steps: ReadonlyArray<KeyedTokensInfo>,
    builder: HtmlBuilder<ParentMessage>
) =>
    islandsFor(documentationIslandDefinitions, {
        ...documentationStaticIslandViews,
        ...documentationInteractiveIslandViews(
            interactive,
            to_interactive_message,
            magic_move_steps,
            builder
        ),
        TabsDemo: () =>
            Tabs.view(
                tabs.horizontalTabs,
                tabs.horizontalValue,
                tabs.verticalTabs,
                tabs.verticalValue,
                (message) =>
                    toTabsMessage(Tabs.GotHorizontalTabsMessage({ message })),
                (message) =>
                    toTabsMessage(Tabs.GotVerticalTabsMessage({ message })),
                builder
            ),
    })
