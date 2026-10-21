import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedToggle = taggedStruct("ClickedToggle")
export const CompletedMountedCtScan = taggedStruct("CompletedMountedCtScan")

export const Message = S.Union([ClickedToggle, CompletedMountedCtScan])

export type Message = typeof Message.Type
