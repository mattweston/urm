import { Array, Option } from "effect"
import type { LogoScene } from "@urm/domain/schemas/logos"
import * as Ui from "@foldkit/ui"
import { childAttributes } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"
import { IconCheck, IconChevronsUpDown, IconCloud } from "./icons/view.ts"
import { sceneLogoView } from "./logo.ts"

const DomainSwitcherListbox = Ui.Listbox.create<Domain>()

export const updateDomainSwitcher = (
    model: Ui.Listbox.Model,
    message: Ui.Listbox.Message
) => DomainSwitcherListbox.update(model, message)

export type DomainSwitcherDomain = Readonly<{
    id: string
    label: string
    logo_scene?: LogoScene
}>

type Domain = DomainSwitcherDomain

const triggerClassName =
    "inline-flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-start text-foreground transition hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [box-shadow:var(--shadow-control)]"
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

const selectedDomain = (
    maybeSelectedId: Option.Option<string>,
    domains: ReadonlyArray<Domain>
): Domain | undefined =>
    Option.getOrUndefined(
        Array.findFirst(
            domains,
            (domain) =>
                domain.id === Option.getOrElse(maybeSelectedId, () => "")
        )
    )

const domainIconView = (
    domain: Domain,
    className: string,
    isCollapsed = false
): Html =>
    domain.logo_scene === undefined
        ? IconCloud({ class: `size-5 shrink-0 ${className}` })
        : sceneLogoView({
              scene: domain.logo_scene,
              class: `${isCollapsed ? "size-7" : "size-9"} shrink-0 ${className}`,
          })

export const domainSwitcherView = <ParentMessage>(
    props: Readonly<{
        slotId?: string
        model: Ui.Listbox.Model
        maybeSelectedDomainId: Option.Option<string>
        domains?: ReadonlyArray<Domain>
        isCollapsed: boolean
        toParentMessage: (message: Ui.Listbox.Message) => ParentMessage
    }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const domains = props.domains ?? []
    const currentDomain = selectedDomain(props.maybeSelectedDomainId, domains)

    return h.submodel({
        slotId: props.slotId ?? props.model.id,
        model: props.model,
        view: DomainSwitcherListbox.view,
        viewInputs: {
            maybeSelectedValue: props.maybeSelectedDomainId,
            anchor: listboxAnchor,
            items: domains,
            itemToValue: (domain) => domain.id,
            itemToConfig: (domain) => ({
                className: itemClassName,
                content: h.div(
                    [h.Class("flex min-w-0 w-full items-start gap-3")],
                    [
                        domainIconView(domain, "text-primary"),
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
                                            [domain.label]
                                        ),
                                        IconCheck({
                                            class: "ms-auto size-4 shrink-0 invisible text-foreground group-data-[selected]:visible",
                                        }),
                                    ]
                                ),
                                h.div(
                                    [h.Class("text-xs text-muted-foreground")],
                                    ["Domain"]
                                ),
                            ]
                        ),
                    ]
                ),
            }),
            buttonContent: props.isCollapsed
                ? currentDomain === undefined
                    ? IconCloud({ class: "size-5 text-muted-foreground" })
                    : domainIconView(currentDomain, "text-primary", true)
                : h.div(
                      [h.Class("flex w-full min-w-0 items-center gap-3")],
                      [
                          currentDomain === undefined
                              ? IconCloud({
                                    class: "size-5 shrink-0 text-muted-foreground",
                                })
                              : domainIconView(currentDomain, "text-primary"),
                          h.div(
                              [h.Class("min-w-0 flex-1")],
                              [
                                  h.div(
                                      [
                                          h.Class(
                                              "truncate text-sm font-medium text-foreground"
                                          ),
                                      ],
                                      [currentDomain?.label ?? "No domain"]
                                  ),
                                  h.div(
                                      [
                                          h.Class(
                                              "truncate text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          currentDomain === undefined
                                              ? ""
                                              : "Domain",
                                      ]
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
                h.AriaLabel("Choose domain"),
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
