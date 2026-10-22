import { Match as M, Option, Schema as S } from "effect"
import { Slider } from "@foldkit/ui"
import { Command, Subscription, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import type { Html, HtmlBuilder } from "foldkit/html"
import { view as slider_view } from "@urm/features/labs/slider/view.ts"

export const Model = S.Struct({
    rating: Slider.Model,
    rating_value: S.Number,
    volume: Slider.Model,
    volume_value: S.Number,
})
export type Model = typeof Model.Type
export const GotRatingMessage = taggedStruct("GotRatingMessage", {
    message: Slider.Message,
})
export const GotVolumeMessage = taggedStruct("GotVolumeMessage", {
    message: Slider.Message,
})
export const Message = S.Union([GotRatingMessage, GotVolumeMessage])
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const init = (): UpdateReturn => ({
    model: {
        rating: Slider.init({ id: "labs-ui-rating", min: 0, max: 10, step: 1 }),
        rating_value: 5,
        volume: Slider.init({
            id: "labs-ui-volume",
            min: 0,
            max: 1,
            step: 0.01,
        }),
        volume_value: 0.5,
    },
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotRatingMessage: ({ message }) => {
                const { model: rating, commands, outMessage } = Slider.update(
                    model.rating,
                    message
                )
                return {
                    model: {
                        ...model,
                        rating,
                        rating_value: outMessage?.value ?? model.rating_value,
                    },
                    commands: Command.mapMessages(commands ?? [], (message) =>
                        GotRatingMessage({ message })
                    ),
                }
            },
            GotVolumeMessage: ({ message }) => {
                const { model: volume, commands, outMessage } = Slider.update(
                    model.volume,
                    message
                )
                return {
                    model: {
                        ...model,
                        volume,
                        volume_value: outMessage?.value ?? model.volume_value,
                    },
                    commands: Command.mapMessages(commands ?? [], (message) =>
                        GotVolumeMessage({ message })
                    ),
                }
            },
        })
    )

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    slider_view(
        model.rating,
        model.rating_value,
        model.volume,
        model.volume_value,
        (message) => to_parent_message(GotRatingMessage({ message })),
        (message) => to_parent_message(GotVolumeMessage({ message })),
        h
    )

export const subscriptions = Subscription.aggregate<Model, Message>()(
    Subscription.lift({
        labsUiRatingPointer: Slider.subscriptions.dragPointer,
        labsUiRatingEscape: Slider.subscriptions.dragEscape,
    })<Model, Message>({
        read: (model) => Option.some(model.rating),
        toParentMessage: (message) => GotRatingMessage({ message }),
    }),
    Subscription.lift({
        labsUiVolumePointer: Slider.subscriptions.dragPointer,
        labsUiVolumeEscape: Slider.subscriptions.dragEscape,
    })<Model, Message>({
        read: (model) => Option.some(model.volume),
        toParentMessage: (message) => GotVolumeMessage({ message }),
    })
)
