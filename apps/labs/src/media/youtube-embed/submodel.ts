import { Option, Schema } from "effect"
import { Submodel } from "foldkit"
import type { Command } from "foldkit"
import * as YouTubeEmbed from "@urm/features/labs/media/youtube-embed"
import type { DesktopRoute } from "../../routing/route.ts"

export const embed_href = () => "/media/youtube-embed"
export const is_embed_path = YouTubeEmbed.isYouTubeEmbedPath

export const Model = Schema.Struct({
    active: Schema.Boolean,
    player: YouTubeEmbed.Model,
})
export type Model = typeof Model.Type
export const Message = YouTubeEmbed.Message
export type Message = YouTubeEmbed.Message

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_embed_path(route.labs_path),
    player: YouTubeEmbed.init(),
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const active = route._tag === "Labs" && is_embed_path(route.labs_path)
    return active === model.active ? model : init(route)
}

export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (!model.active) return [model, []]
    const [player, commands] = YouTubeEmbed.update(model.player, message)
    return [{ ...model, player }, commands]
}

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly read: (model: ParentModel) => Option.Option<Model>
    readonly toParentMessage: (message: Message) => ParentMessage
    readonly when?: (model: ParentModel) => boolean
}) =>
    YouTubeEmbed.subscriptions<ParentModel, ParentMessage>({
        read: (model) => Option.map(config.read(model), ({ player }) => player),
        toParentMessage: config.toParentMessage,
        ...(config.when === undefined ? {} : { when: config.when }),
    })

export const view = Submodel.defineView<Model, Message>((model, h) =>
    YouTubeEmbed.view(model.player, (message) => message, h)
)
