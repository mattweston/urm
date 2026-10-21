import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import * as Cartlane from "../cartlane/index.ts"
import * as Draftboard from "../draftboard/index.ts"
import * as Relay from "../relay/index.ts"
import * as Streambox from "../streambox/index.ts"
import * as Threadline from "../threadline/index.ts"
import {
    GotCartlaneMessage,
    GotDraftboardMessage,
    GotRelayMessage,
    GotStreamboxMessage,
    GotThreadlineMessage,
    type Message,
} from "./ported-demos.message.ts"
import type { Model } from "./ported-demos.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
export const init = (): UpdateReturn => {
    const [cartlane, commands] = Cartlane.init()
    const [draftboard] = Draftboard.init()
    const [relay] = Relay.init()
    const [streambox] = Streambox.init()
    const [threadline] = Threadline.init()
    return [
        {
            route: "Cartlane",
            cartlane,
            draftboard,
            relay,
            streambox,
            threadline,
        },
        Command.mapMessages(commands, (message) =>
            GotCartlaneMessage({ message })
        ),
    ]
}
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedDemoRoute: ({ route, path }) => {
                if (route === "Cartlane") {
                    const [cartlane, commands] = Cartlane.update(
                        model.cartlane,
                        Cartlane.ChangedRoute({
                            route: Cartlane.routeForPath(path),
                        })
                    )
                    return [
                        modifyFields(model, {
                            route: () => route,
                            cartlane: () => cartlane,
                        }),
                        Command.mapMessages(commands, (child) =>
                            GotCartlaneMessage({ message: child })
                        ),
                    ]
                }
                if (route === "Draftboard") {
                    const [draftboard, commands] = Draftboard.update(
                        model.draftboard,
                        Draftboard.ChangedBoard({
                            id: path.includes("/empty") ? "empty" : "launch",
                        })
                    )
                    return [
                        modifyFields(model, {
                            route: () => route,
                            draftboard: () => draftboard,
                        }),
                        Command.mapMessages(commands, (child) =>
                            GotDraftboardMessage({ message: child })
                        ),
                    ]
                }
                if (route === "Relay") {
                    const channel = path.includes("/design")
                        ? "design"
                        : path.includes("/random")
                          ? "random"
                          : "general"
                    const [relay, commands] = Relay.update(
                        model.relay,
                        Relay.ChangedChannel({ channel })
                    )
                    return [
                        modifyFields(model, { route: () => route, relay: () => relay }),
                        Command.mapMessages(commands, (child) =>
                            GotRelayMessage({ message: child })
                        ),
                    ]
                }
                if (route === "Streambox") {
                    const id = path.includes("quiet-current")
                        ? "quiet-current"
                        : path.includes("signal-garden")
                          ? "signal-garden"
                          : "neon-tides"
                    const panel = path.includes("comments")
                        ? "Comments"
                        : path.includes("transcript")
                          ? "Transcript"
                          : "Overview"
                    const [selected, first_commands] = Streambox.update(
                        model.streambox,
                        Streambox.ChangedVideo({ id })
                    )
                    const [streambox, second_commands] = Streambox.update(
                        selected,
                        Streambox.SelectedPanel({ panel })
                    )
                    return [
                        modifyFields(model, {
                            route: () => route,
                            streambox: () => streambox,
                        }),
                        Command.mapMessages(
                            [...first_commands, ...second_commands],
                            (child) => GotStreamboxMessage({ message: child })
                        ),
                    ]
                }
                const route_value = path.includes("/saved")
                    ? Threadline.Route.cases.Saved.make({})
                    : path.includes("/profile/")
                      ? Threadline.Route.cases.Profile.make({
                            handle:
                                path.split("/profile/")[1]?.split("/")[0] ??
                                "avery",
                        })
                      : Threadline.Route.cases.Home.make({})
                const [threadline, commands] = Threadline.update(
                    model.threadline,
                    Threadline.ChangedRoute({ route: route_value })
                )
                return [
                    modifyFields(model, {
                        route: () => route,
                        threadline: () => threadline,
                    }),
                    Command.mapMessages(commands, (child) =>
                        GotThreadlineMessage({ message: child })
                    ),
                ]
            },
            GotCartlaneMessage: ({ message }) => {
                const [cartlane, commands] = Cartlane.update(
                    model.cartlane,
                    message
                )
                return [
                    modifyFields(model, { cartlane: () => cartlane }),
                    Command.mapMessages(commands, (child) =>
                        GotCartlaneMessage({ message: child })
                    ),
                ]
            },
            GotDraftboardMessage: ({ message }) => {
                const [draftboard, commands] = Draftboard.update(
                    model.draftboard,
                    message
                )
                return [
                    modifyFields(model, { draftboard: () => draftboard }),
                    Command.mapMessages(commands, (child) =>
                        GotDraftboardMessage({ message: child })
                    ),
                ]
            },
            GotRelayMessage: ({ message }) => {
                const [relay, commands] = Relay.update(model.relay, message)
                return [
                    modifyFields(model, { relay: () => relay }),
                    Command.mapMessages(commands, (child) =>
                        GotRelayMessage({ message: child })
                    ),
                ]
            },
            GotStreamboxMessage: ({ message }) => {
                const [streambox, commands] = Streambox.update(
                    model.streambox,
                    message
                )
                return [
                    modifyFields(model, { streambox: () => streambox }),
                    Command.mapMessages(commands, (child) =>
                        GotStreamboxMessage({ message: child })
                    ),
                ]
            },
            GotThreadlineMessage: ({ message }) => {
                const [threadline, commands] = Threadline.update(
                    model.threadline,
                    message
                )
                return [
                    modifyFields(model, { threadline: () => threadline }),
                    Command.mapMessages(commands, (child) =>
                        GotThreadlineMessage({ message: child })
                    ),
                ]
            },
        })
    )
