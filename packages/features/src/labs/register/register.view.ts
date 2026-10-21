import { Match as M } from "effect"
import type { Field } from "foldkit/fieldValidation"
import { type Html, type HtmlBuilder } from "foldkit/html"
import { Register } from "@urm/ui/foldkit/register.view.ts"
import type { Message } from "./register.message.ts"
import {
    ChangedEmail,
    ChangedPassword,
    SubmittedRegister,
} from "./register.message.ts"
import type { Model } from "./register.model.ts"
import {
    TextField,
    TextFieldInput,
    TextFieldLabel,
} from "@urm/ui/foldkit/text-field.view.ts"

export type Hrefs = Readonly<{
    login: string
}>

const fieldErrorView = <ParentMessage>(
    field: Field<string>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => h.empty,
            Validating: () => h.empty,
            Valid: () => h.empty,
            Invalid: () => h.empty,
        })
    )
}

const fieldView = <ParentMessage>(
    id: string,
    labelText: string,
    field: Field<string>,
    onUpdate: (value: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    type: "text" | "email" | "password" = "text",
    placeholder = "",
    autocomplete?: string
): Html => {
    return TextField({
        class: "grid gap-2",
        children: [
            TextFieldLabel({
                for: id,
                class: "sr-only",
                children: [labelText],
            }),
            TextFieldInput(
                {
                    id,
                    field,
                    onInput: onUpdate,
                    type,
                    placeholder,
                    ...((autocomplete ??
                        (type === "email"
                            ? "email"
                            : type === "password"
                              ? "current-password"
                              : undefined)) === undefined
                        ? {}
                        : {
                              autocomplete:
                                  autocomplete ??
                                  (type === "email"
                                      ? "email"
                                      : "current-password"),
                          }),
                },
                h
            ),
            fieldErrorView<ParentMessage>(field, h),
        ],
    })
}

export const view = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Register<ParentMessage>(
        {
            isSubmitting: model.isSubmitting,
            backHref: hrefs.login,
            backLabel: "Sign in",
            onSubmit: toParentMessage(SubmittedRegister()),
            emailField: fieldView<ParentMessage>(
                "register-email",
                "Email",
                model.email,
                (value) => toParentMessage(ChangedEmail({ value })),
                h,
                "email",
                "m@example.com"
            ),
            passwordField: fieldView<ParentMessage>(
                "register-password",
                "Password",
                model.password,
                (value) => toParentMessage(ChangedPassword({ value })),
                h,
                "password",
                "",
                "new-password"
            ),
        },
        h
    )
}
