import { Schema } from "effect"
import { Submodel } from "foldkit"
import type { Command } from "foldkit"
import * as OtpField from "@urm/features/labs/otp-field"
import type { DesktopRoute } from "../../routing/route.ts"

export const otp_field_href = () => "/labs/auth/otp-field"
export const is_otp_field_path = OtpField.isOtpFieldPath

export const Model = Schema.Struct({
    active: Schema.Boolean,
    otp: OtpField.Model,
})
export type Model = typeof Model.Type
export const Message = OtpField.Message
export type Message = OtpField.Message

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_otp_field_path(route.labs_path),
    otp: OtpField.init()[0],
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const active = route._tag === "Labs" && is_otp_field_path(route.labs_path)
    return active === model.active ? model : init(route)
}

export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (!model.active) return [model, []]
    const [otp, commands] = OtpField.update(model.otp, message)
    return [{ ...model, otp }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("mx-auto w-full max-w-4xl px-4 py-6 sm:px-6")],
        [OtpField.view(model.otp, (message) => message, h)]
    )
)
