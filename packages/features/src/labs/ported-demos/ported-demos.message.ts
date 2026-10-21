import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import * as Cartlane from "../cartlane/index.ts"
import * as Draftboard from "../draftboard/index.ts"
import * as Relay from "../relay/index.ts"
import * as Streambox from "../streambox/index.ts"
import * as Threadline from "../threadline/index.ts"
import { DemoRoute } from "./ported-demos.model.ts"

export const ChangedDemoRoute = taggedStruct("ChangedDemoRoute", {
    route: DemoRoute,
    path: S.String,
})
export const GotCartlaneMessage = taggedStruct("GotCartlaneMessage", {
    message: Cartlane.Message,
})
export const GotDraftboardMessage = taggedStruct("GotDraftboardMessage", {
    message: Draftboard.Message,
})
export const GotRelayMessage = taggedStruct("GotRelayMessage", {
    message: Relay.Message,
})
export const GotStreamboxMessage = taggedStruct("GotStreamboxMessage", {
    message: Streambox.Message,
})
export const GotThreadlineMessage = taggedStruct("GotThreadlineMessage", {
    message: Threadline.Message,
})
export const Message = S.Union([
    ChangedDemoRoute,
    GotCartlaneMessage,
    GotDraftboardMessage,
    GotRelayMessage,
    GotStreamboxMessage,
    GotThreadlineMessage,
])
export type Message = typeof Message.Type
