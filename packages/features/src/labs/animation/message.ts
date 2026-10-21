import { Schema as S } from "effect"
import { Animation } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

export const GotAnimationDemoMessage = taggedStruct("GotAnimationDemoMessage", {
    message: Animation.Message,
})
export const ToggledAnimationDemo = taggedStruct("ToggledAnimationDemo")
export const CompletedMountedThreeJsDemo = taggedStruct(
    "CompletedMountedThreeJsDemo"
)
export type CompletedMountedThreeJsDemo =
    typeof CompletedMountedThreeJsDemo.Type

export const AnimationDemoMessage = S.Union([
    GotAnimationDemoMessage,
    ToggledAnimationDemo,
    CompletedMountedThreeJsDemo,
])
export type AnimationDemoMessage = typeof AnimationDemoMessage.Type
