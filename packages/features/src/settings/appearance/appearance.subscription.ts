import { Effect, Option, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import { streamFromEventFilterMap } from "foldkit/dom"
import { DismissedMenus, type Message } from "./appearance.message.ts"
import type { Model } from "./appearance.model.ts"

export const MENU_ATTRIBUTE = "appearance-menu"

const MENU_SELECTOR = `[data-${MENU_ATTRIBUTE}]`

// `<details>` has no light dismiss of its own, so the outside click has to come
// from a document listener. pointerdown rather than click: the menu should be
// gone before the pointer is released, the way a native menu behaves.
const isOutsideMenus = (event: Event): boolean => {
    const target = event.target

    return (
        !(target instanceof Element) || target.closest(MENU_SELECTOR) === null
    )
}

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly read: (parentModel: ParentModel) => Option.Option<Model>
    readonly toParentMessage: (message: Message) => ParentMessage
}) =>
    Subscription.make<ParentModel, ParentMessage>()((entry) => ({
        appearanceMenuDismiss: entry(
            { isAnyMenuOpen: S.Boolean },
            {
                // No child, no open menu: absence closes the listener through
                // the same dependency the menus do.
                modelToDependencies: (parentModel) => ({
                    isAnyMenuOpen: Option.match(config.read(parentModel), {
                        onNone: () => false,
                        onSome: (model) =>
                            model.isThemeMenuOpen || model.isFontMenuOpen,
                    }),
                }),
                dependenciesToStream: ({ isAnyMenuOpen }) =>
                    Stream.when(
                        streamFromEventFilterMap({
                            target: document,
                            type: "pointerdown",
                            filterMapEvent: (event) =>
                                isOutsideMenus(event)
                                    ? Option.some(
                                          config.toParentMessage(
                                              DismissedMenus()
                                          )
                                      )
                                    : Option.none(),
                        }),
                        Effect.sync(() => isAnyMenuOpen)
                    ),
            }
        ),
    }))
