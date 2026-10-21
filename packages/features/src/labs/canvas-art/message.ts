import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const TickedCanvasArtFrame = taggedStruct("TickedCanvasArtFrame", {
    deltaTime: S.Number,
})
export const ClickedCanvasArt = taggedStruct("ClickedCanvasArt", {
    x: S.Number,
    y: S.Number,
})
export const CompletedGenerateCanvasArtBall = taggedStruct(
    "CompletedGenerateCanvasArtBall",
    {
        x: S.Number,
        y: S.Number,
        vx: S.Number,
        vy: S.Number,
        radius: S.Number,
        color: S.String,
    }
)
export const ClickedClearCanvasArt = taggedStruct("ClickedClearCanvasArt")
export const ClickedToggleCanvasArtPlay = taggedStruct(
    "ClickedToggleCanvasArtPlay"
)

export const CanvasArtMessage = S.Union([
    TickedCanvasArtFrame,
    ClickedCanvasArt,
    CompletedGenerateCanvasArtBall,
    ClickedClearCanvasArt,
    ClickedToggleCanvasArtPlay,
])
export type CanvasArtMessage = typeof CanvasArtMessage.Type
