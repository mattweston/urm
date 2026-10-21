import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { Slider } from "@foldkit/ui"

const generatedParticleFields = {
    x: S.Number,
    y: S.Number,
    baseHue: S.Number,
    hueDriftPerSecond: S.Number,
    lifespanMs: S.Number,
    speed: S.Number,
    initialAngle: S.Option(S.Number),
    initialSpeedScale: S.Number,
}

export const TickedFrame = taggedStruct("TickedFrame", {
    deltaTimeMs: S.Number,
})
export const CompletedGenerateAmbientParticle = taggedStruct(
    "CompletedGenerateAmbientParticle",
    generatedParticleFields
)
export const CompletedGenerateBurstParticle = taggedStruct(
    "CompletedGenerateBurstParticle",
    generatedParticleFields
)
export const PressedCanvas = taggedStruct("PressedCanvas", {
    x: S.Number,
    y: S.Number,
})
export const MovedPointer = taggedStruct("MovedPointer", {
    x: S.Number,
    y: S.Number,
})
export const ClickedTogglePlay = taggedStruct("ClickedTogglePlay")
export const ClickedReset = taggedStruct("ClickedReset")
export const GotFlowStrengthSliderMessage = taggedStruct(
    "GotFlowStrengthSliderMessage",
    {
        message: Slider.Message,
    }
)
export const GotNoiseScaleSliderMessage = taggedStruct(
    "GotNoiseScaleSliderMessage",
    {
        message: Slider.Message,
    }
)

export const GenerativeArtMessage = S.Union([
    TickedFrame,
    CompletedGenerateAmbientParticle,
    CompletedGenerateBurstParticle,
    PressedCanvas,
    MovedPointer,
    ClickedTogglePlay,
    ClickedReset,
    GotFlowStrengthSliderMessage,
    GotNoiseScaleSliderMessage,
])
export type GenerativeArtMessage = typeof GenerativeArtMessage.Type
