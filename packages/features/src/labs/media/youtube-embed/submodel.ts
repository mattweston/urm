import { Subscription } from "foldkit"

import { init as initModel, type Model } from "./youtube-embed.model.ts"
import type { Message } from "./youtube-embed.message.ts"
import { subscriptions as playerSubscriptions } from "./youtube-embed.subscription.ts"

export { Message } from "./youtube-embed.message.ts"
export type { Message as MessageType } from "./youtube-embed.message.ts"
export { Model } from "./youtube-embed.model.ts"
export type { Model as ModelType } from "./youtube-embed.model.ts"
export { isYouTubeEmbedPath, youtubeEmbedHref } from "./route.ts"
export { update } from "./youtube-embed.update.ts"
export type { ViewOptions } from "./youtube-embed.view.ts"
export { view } from "./youtube-embed.view.ts"

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (parentModel: ParentModel) => Model
    readonly toParentMessage: (message: Message) => ParentMessage
    readonly when?: (model: ParentModel) => boolean
}) => {
    const lifted = Subscription.lift(playerSubscriptions)<
        ParentModel,
        ParentMessage
    >(config)

    return { labsMediaYouTubeEmbedPlayer: lifted.playerEvents }
}

// The video the lab demonstrates against. It lived in the map app's initial
// model before this feature was split out.
const DEMO_VIDEO = {
    id: "50PwLzsuyaI",
    title: "I just created my new website using nothing.",
}

// The lab exists to show the embed's wiring, so its debugger is on. A
// production caller gets it off by default.
//
// Only `duration` is supplied: it is the one field not derivable from the video
// id, and the player itself reports 57.001s for this video. Everything else in
// the structured data falls back to the id and title rather than being guessed.
export const init = (): Model =>
    initModel(DEMO_VIDEO, { debug: true, seo: { duration: "PT57S" } })

export const initVideo = (video: {
    readonly id: string
    readonly title: string
    readonly thumbnailUrl: string
}): Model =>
    initModel(
        { id: video.id, title: video.title },
        {
            debug: false,
            seo: { thumbnailUrl: video.thumbnailUrl },
        }
    )
