import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedPlay = taggedStruct("ClickedPlay")

export const ClickedStop = taggedStruct("ClickedStop")

export const ClickedReset = taggedStruct("ClickedReset")

export const ClickedTempoDown = taggedStruct("ClickedTempoDown")

export const ClickedTempoUp = taggedStruct("ClickedTempoUp")

export const AdvancedPulse = taggedStruct("AdvancedPulse")

export const CompletedPlayRhythmSounds = taggedStruct(
    "CompletedPlayRhythmSounds"
)

export const FailedPlayRhythmSounds = taggedStruct("FailedPlayRhythmSounds", {
    reason: S.String,
})

export const StartedAudio = taggedStruct("StartedAudio")

export const StoppedAudio = taggedStruct("StoppedAudio")

export const FailedStartAudio = taggedStruct("FailedStartAudio", {
    reason: S.String,
})

export const ToggledRhythm = taggedStruct("ToggledRhythm", {
    rhythmId: S.Literals([
        "sixEight",
        "fiveFour",
        "sevenFour",
        "twoFour",
        "threeFour",
    ]),
})

export const Message = S.Union([
    ClickedPlay,
    ClickedStop,
    ClickedReset,
    ClickedTempoDown,
    ClickedTempoUp,
    ToggledRhythm,
    AdvancedPulse,
    CompletedPlayRhythmSounds,
    FailedPlayRhythmSounds,
    StartedAudio,
    StoppedAudio,
    FailedStartAudio,
])

export type Message = typeof Message.Type
