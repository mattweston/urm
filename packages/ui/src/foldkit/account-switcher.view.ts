import { Array, Option } from "effect"
import * as Ui from "@foldkit/ui"
import { childAttributes } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"
import { IconCheck, IconChevronsUpDown } from "./icons/view.ts"

const AccountSwitcherListbox = Ui.Listbox.create<Account>()

export const updateAccountSwitcher = (
    model: Ui.Listbox.Model,
    message: Ui.Listbox.Message
) => AccountSwitcherListbox.update(model, message)

type Account = Readonly<{
    label: string
    email: string
    accent: string
}>

const ACCOUNTS: ReadonlyArray<Account> = [
    { label: "Alicia Keys", email: "alicia@example.com", accent: "A" },
    { label: "Nova Labs", email: "team@novalabs.dev", accent: "N" },
    { label: "Jordan Lee", email: "jordan@example.com", accent: "J" },
]

const triggerClassName =
    "inline-flex w-full items-center gap-3 rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-start text-foreground transition hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [box-shadow:var(--shadow-control)]"
const collapsedTriggerClassName =
    "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card text-muted-foreground [box-shadow:var(--shadow-control)] hover:bg-accent hover:text-accent-foreground hover:[box-shadow:var(--shadow-control-hover)]"
const itemsClassName =
    "absolute z-[60] mt-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden overscroll-contain rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] outline-none"
const itemClassName =
    "group flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-start text-sm text-muted-foreground data-[active]:bg-accent data-[active]:text-accent-foreground"
const backdropClassName = "fixed inset-0 z-0"
const wrapperClassName = (isCollapsed: boolean): string =>
    isCollapsed ? "relative inline-block" : "relative inline-block w-full"
const listboxAnchor: Ui.Listbox.AnchorConfig = {
    placement: "bottom-start",
    gap: 4,
    padding: 8,
}

const selectedAccount = (maybeSelectedEmail: Option.Option<string>): Account =>
    Option.getOrElse(
        Array.findFirst(
            ACCOUNTS,
            (account) =>
                account.email ===
                Option.getOrElse(maybeSelectedEmail, () => ACCOUNTS[0]!.email)
        ),
        () => ACCOUNTS[0]!
    )

const avatarView = <ParentMessage>(
    account: Account,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            ),
        ],
        [account.accent]
    )
}

export const accountSwitcherView = <ParentMessage>(
    props: Readonly<{
        slotId?: string
        model: Ui.Listbox.Model
        maybeSelectedEmail: Option.Option<string>
        isCollapsed: boolean
        toParentMessage: (message: Ui.Listbox.Message) => ParentMessage
    }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const currentAccount = selectedAccount(props.maybeSelectedEmail)

    return h.submodel({
        slotId: props.slotId ?? props.model.id,
        model: props.model,
        view: AccountSwitcherListbox.view,
        viewInputs: {
            maybeSelectedValue: props.maybeSelectedEmail,
            anchor: listboxAnchor,
            items: ACCOUNTS,
            itemToValue: (account) => account.email,
            itemToConfig: (account) => ({
                className: itemClassName,
                content: h.div(
                    [h.Class("flex min-w-0 w-full items-start gap-3")],
                    [
                        avatarView<ParentMessage>(account, h),
                        h.div(
                            [h.Class("min-w-0 flex-1")],
                            [
                                h.div(
                                    [h.Class("flex items-center gap-2")],
                                    [
                                        h.span(
                                            [
                                                h.Class(
                                                    "min-w-0 flex-1 [overflow-wrap:anywhere] font-medium text-foreground"
                                                ),
                                            ],
                                            [account.label]
                                        ),
                                        IconCheck({
                                            class: "ms-auto size-4 shrink-0 invisible text-foreground group-data-[selected]:visible",
                                        }),
                                    ]
                                ),
                                h.div(
                                    [h.Class("[overflow-wrap:anywhere] text-xs text-muted-foreground")],
                                    [account.email]
                                ),
                            ]
                        ),
                    ]
                ),
            }),
            buttonContent: props.isCollapsed
                ? avatarView<ParentMessage>(currentAccount, h)
                : h.div(
                      [h.Class("flex w-full min-w-0 items-center gap-3")],
                      [
                          avatarView<ParentMessage>(currentAccount, h),
                          h.div(
                              [h.Class("min-w-0 flex-1")],
                              [
                                  h.div(
                                      [
                                          h.Class(
                                              "truncate text-sm font-medium text-foreground"
                                          ),
                                      ],
                                      [currentAccount.label]
                                  ),
                                  h.div(
                                      [
                                          h.Class(
                                              "truncate text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [currentAccount.email]
                                  ),
                              ]
                          ),
                          IconChevronsUpDown({
                              class: "ms-auto size-4 shrink-0 text-muted-foreground",
                          }),
                      ]
                  ),
            buttonAttributes: childAttributes([
                h.Class(
                    props.isCollapsed
                        ? collapsedTriggerClassName
                        : triggerClassName
                ),
                h.AriaLabel("Choose account"),
            ]),
            itemsAttributes: childAttributes([h.Class(itemsClassName)]),
            backdropAttributes: childAttributes([h.Class(backdropClassName)]),
            attributes: childAttributes([
                h.Class(wrapperClassName(props.isCollapsed)),
            ]),
        },
        toParentMessage: props.toParentMessage,
    })
}
