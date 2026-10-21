import * as Option from "effect/Option"
import * as Ui from "@foldkit/ui"
import { childAttributes } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import { Avatar, AvatarFallback, AvatarImage } from "./avatar.view.ts"
import { Button } from "./button/button.view.ts"

export type AccountMenuAction = "Sign out"

export const AccountMenu: Ui.Menu.Bundle<AccountMenuAction> =
    Ui.Menu.create<AccountMenuAction>()

const ACCOUNT_MENU_ACTIONS: ReadonlyArray<AccountMenuAction> = ["Sign out"]

type Profile = Readonly<{
    email: string
    display_name: string
    image_url: Option.Option<string>
}>

type Props<Message> = Readonly<{
    status: "loading" | "signed_out" | "signed_in" | "error"
    profile: Option.Option<Profile>
    error: Option.Option<string>
    on_sign_in: Message
    on_sign_out: Message
    account_menu: Ui.Menu.Model
    on_account_menu_message: (message: Ui.Menu.Message) => Message
    presentation?: "inline" | "menu"
}>

const initials = (profile: Profile): string =>
    (
        profile.display_name.trim()[0] ??
        profile.email.trim()[0] ??
        "U"
    ).toUpperCase()

const avatar = (profile: Profile): Html =>
    Avatar({
        class: "size-8",
        children: [
            Option.match(profile.image_url, {
                onNone: () => AvatarFallback({ children: [initials(profile)] }),
                onSome: (src) =>
                    AvatarImage({ src, alt: `${profile.display_name} avatar` }),
            }),
        ],
    })

const accountMenuView = <Message>(
    profile: Profile,
    props: Props<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const accessible_name = `Account menu for ${profile.display_name || profile.email}`

    return h.submodel({
        slotId: props.account_menu.id,
        model: props.account_menu,
        view: AccountMenu.view,
        viewInputs: {
            ariaLabel: accessible_name,
            anchor: {
                placement: "bottom-end",
                gap: 4,
                padding: 8,
            },
            items: ACCOUNT_MENU_ACTIONS,
            buttonContent: avatar(profile),
            buttonAttributes: childAttributes([h.Title(accessible_name)]),
            buttonClassName:
                "flex size-10 cursor-pointer items-center justify-center rounded-full border-(length:--control-outline-border-width) border-border bg-card text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent hover:text-accent-foreground hover:[box-shadow:var(--shadow-control-hover)] focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]",
            itemsClassName:
                "z-[60] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] outline-none",
            backdropClassName: "fixed inset-0 z-0",
            itemGroupKey: () => "Account",
            groupToHeading: () => ({
                className: "border-b border-border p-3",
                content: h.div(
                    [h.Class("flex min-w-0 items-center gap-3")],
                    [
                        avatar(profile),
                        h.div(
                            [h.Class("min-w-0 flex-1")],
                            [
                                h.div(
                                    [
                                        h.Class(
                                            "truncate text-sm font-medium text-foreground"
                                        ),
                                    ],
                                    [profile.display_name || "Account"]
                                ),
                                h.div(
                                    [
                                        h.Class(
                                            "truncate text-xs text-muted-foreground"
                                        ),
                                    ],
                                    [profile.email]
                                ),
                            ]
                        ),
                    ]
                ),
            }),
            itemToConfig: () => ({
                className:
                    "flex w-full cursor-pointer items-center px-3 py-2.5 text-start text-sm text-muted-foreground data-[active]:bg-accent data-[active]:text-accent-foreground",
                content: h.span([], ["Sign out"]),
            }),
        },
        toParentMessage: props.on_account_menu_message,
    })
}

export const authControlView = <Message>(
    props: Props<Message>,
    h: HtmlBuilder<Message>
): Html => {
    if (props.status === "loading") {
        return Button(
            {
                variant: "outline",
                size: "sm",
                isDisabled: true,
                children: ["Checking session"],
            },
            h
        )
    }

    if (Option.isSome(props.profile)) {
        const profile = props.profile.value

        if (props.presentation === "menu") {
            return accountMenuView(profile, props, h)
        }

        return h.div(
            [h.Class("flex items-center gap-2")],
            [
                avatar(profile),
                h.div(
                    [h.Class("hidden min-w-0 text-end sm:block")],
                    [
                        h.div(
                            [h.Class("max-w-40 truncate text-xs font-medium")],
                            [profile.display_name]
                        ),
                        h.div(
                            [
                                h.Class(
                                    "max-w-40 truncate text-[0.6875rem] text-muted-foreground"
                                ),
                            ],
                            [profile.email]
                        ),
                    ]
                ),
                Button(
                    {
                        variant: "ghost",
                        size: "sm",
                        onClick: props.on_sign_out,
                        children: ["Sign out"],
                    },
                    h
                ),
            ]
        )
    }

    return h.div(
        [h.Class("flex items-center gap-2")],
        [
            Option.match(props.error, {
                onNone: () => h.span([], []),
                onSome: (details) =>
                    h.span(
                        [
                            h.Class(
                                "hidden max-w-56 truncate text-xs text-destructive lg:inline"
                            ),
                            h.Title(details),
                        ],
                        ["Session unavailable"]
                    ),
            }),
            Button(
                {
                    size: "sm",
                    onClick: props.on_sign_in,
                    children: ["Sign in"],
                },
                h
            ),
        ]
    )
}
