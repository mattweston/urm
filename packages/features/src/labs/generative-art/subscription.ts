import { Option } from "effect"
import { Slider } from "@foldkit/ui"
import { Subscription } from "foldkit"
import {
    GotFlowStrengthSliderMessage,
    GotNoiseScaleSliderMessage,
    TickedFrame,
    type GenerativeArtMessage,
} from "./message.ts"
import type { GenerativeArtModel } from "./model.ts"

const flowSliderSubscriptions = Subscription.lift({
    generativeArtFlowPointer: Slider.subscriptions.dragPointer,
    generativeArtFlowEscape: Slider.subscriptions.dragEscape,
})<GenerativeArtModel, GenerativeArtMessage>({
    read: (model) => Option.some(model.flowStrengthSlider),
    toParentMessage: (message) => GotFlowStrengthSliderMessage({ message }),
})

const noiseSliderSubscriptions = Subscription.lift({
    generativeArtNoisePointer: Slider.subscriptions.dragPointer,
    generativeArtNoiseEscape: Slider.subscriptions.dragEscape,
})<GenerativeArtModel, GenerativeArtMessage>({
    read: (model) => Option.some(model.noiseScaleSlider),
    toParentMessage: (message) => GotNoiseScaleSliderMessage({ message }),
})

const frameSubscriptions = Subscription.make<
    GenerativeArtModel,
    GenerativeArtMessage
>()(() => ({
    generativeArtFrame: Subscription.animationFrame({
        isActive: (model) => model.isRunning,
        toMessage: (deltaTimeMs) => TickedFrame({ deltaTimeMs }),
    }),
}))

export const subscriptions = Subscription.aggregate<
    GenerativeArtModel,
    GenerativeArtMessage
>()(frameSubscriptions, flowSliderSubscriptions, noiseSliderSubscriptions)
