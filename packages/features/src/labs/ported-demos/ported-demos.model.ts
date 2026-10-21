import { Schema as S } from "effect"
import * as Cartlane from "../cartlane/index.ts"
import * as Draftboard from "../draftboard/index.ts"
import * as Relay from "../relay/index.ts"
import * as Streambox from "../streambox/index.ts"
import * as Threadline from "../threadline/index.ts"

export const DemoRoute = S.Literals([
    "Cartlane",
    "Draftboard",
    "Relay",
    "Streambox",
    "Threadline",
])
export type DemoRoute = typeof DemoRoute.Type
export const Model = S.Struct({
    route: DemoRoute,
    cartlane: Cartlane.Model,
    draftboard: Draftboard.Model,
    relay: Relay.Model,
    streambox: Streambox.Model,
    threadline: Threadline.Model,
})
export type Model = typeof Model.Type
