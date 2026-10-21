import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { Toast } from "./toast.ts"

export const GotToastDemoMessage = taggedStruct("GotToastDemoMessage", {
    message: Toast.Message,
})
export const ClickedShowInfoToast = taggedStruct("ClickedShowInfoToast")
export const ClickedShowSuccessToast = taggedStruct("ClickedShowSuccessToast")
export const ClickedShowWarningToast = taggedStruct("ClickedShowWarningToast")
export const ClickedShowErrorToast = taggedStruct("ClickedShowErrorToast")
export const ClickedShowStickyToast = taggedStruct("ClickedShowStickyToast")
export const ClickedDismissAllToasts = taggedStruct("ClickedDismissAllToasts")

export const ToastDemoMessage = S.Union([
    GotToastDemoMessage,
    ClickedShowInfoToast,
    ClickedShowSuccessToast,
    ClickedShowWarningToast,
    ClickedShowErrorToast,
    ClickedShowStickyToast,
    ClickedDismissAllToasts,
])
export type ToastDemoMessage = typeof ToastDemoMessage.Type
