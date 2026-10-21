import { authControlView } from "@urm/ui/foldkit/auth-control.view.ts"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"

import type { Model } from "./authkit.model.ts"
import {
    AuthKitClickedSignIn,
    AuthKitClickedSignOut,
    GotAccountMenuMessage,
    type Message,
} from "./authkit.submodel.ts"

const authView = (presentation: "inline" | "menu") =>
    Submodel.defineView<Model, Message>(
        (model: Model, h: HtmlBuilder<Message>): Html =>
            authControlView(
                {
                    status: model.status,
                    profile: model.profile,
                    error: model.error,
                    account_menu: model.account_menu,
                    presentation,
                    on_sign_in: AuthKitClickedSignIn(),
                    on_sign_out: AuthKitClickedSignOut(),
                    on_account_menu_message: (message) =>
                        GotAccountMenuMessage({ message }),
                },
                h
            )
    )

export const view = authView("inline")

export const headerView = authView("menu")
