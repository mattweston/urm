/** # Tooltip
 *
 *  A thin shell over `@foldkit/ui`'s headless Tooltip. The component is
 *  embedded through `h.submodel`, so its Messages are constructed and routed by
 *  the library rather than rebuilt here; this module only decides what the
 *  trigger and panel look like.
 *
 *  The library publishes a {@link UiTooltip.RenderInfo} to `toView`: `trigger`
 *  carries the hover, focus and keyboard handlers plus the `aria-describedby`
 *  link, `panel` carries `role="tooltip"`, the Floating UI anchor Mount and the
 *  open-state attribute, and `isVisible` says whether the panel should exist.
 *  Spreading those bundles is what keeps the trigger tag free: a sidebar item
 *  that navigates renders an `a`, one that acts renders a `button`, and neither
 *  has to restate the wiring.
 */
import type { AnchorConfig, RenderInfo } from "@foldkit/ui/tooltip"
import { Tooltip as UiTooltip } from "@foldkit/ui"
import { type Attribute, type Html, type HtmlBuilder } from "foldkit/html"

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

type TooltipProps<ParentMessage> = Readonly<{
    model: UiTooltip.Model
    toParentMessage: (message: UiTooltip.Message) => ParentMessage
    anchor: AnchorConfig
    triggerTag?: "a" | "button"
    triggerHref?: string | undefined
    triggerClassName?: string | undefined
    triggerAttributes?: ReadonlyArray<Attribute<ParentMessage>> | undefined
    triggerContent: Html
    content: Html
    panelClassName?: string | undefined
    panelAttributes?: ReadonlyArray<Attribute<ParentMessage>> | undefined
    className?: string
    attributes?: ReadonlyArray<Attribute<ParentMessage>>
}>

export const Tooltip = <ParentMessage>(
    props: TooltipProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const renderTrigger = (render: RenderInfo): Html => {
        const attributes = [
            ...render.trigger,
            ...(props.triggerClassName
                ? [h.Class(props.triggerClassName)]
                : []),
            ...(props.triggerAttributes ?? []),
        ]

        return (props.triggerTag ?? "button") === "a"
            ? h.a(
                  [
                      ...attributes,
                      ...(props.triggerHref !== undefined
                          ? [h.Href(props.triggerHref)]
                          : []),
                  ],
                  [props.triggerContent]
              )
            : h.button(
                  [h.Type("button"), ...attributes],
                  [props.triggerContent]
              )
    }

    const renderPanel = (render: RenderInfo): ReadonlyArray<Html> =>
        render.isVisible
            ? [
                  h.div(
                      [
                          ...render.panel,
                          h.Class(
                              joinClassName(
                                  "transition-all duration-150",
                                  props.panelClassName
                              )
                          ),
                          ...(props.panelAttributes ?? []),
                      ],
                      [props.content]
                  ),
              ]
            : []

    return h.submodel({
        slotId: props.model.id,
        model: props.model,
        view: UiTooltip.view,
        toParentMessage: props.toParentMessage,
        viewInputs: {
            anchor: props.anchor,
            toView: (render: RenderInfo) =>
                h.div(
                    [
                        h.Class(joinClassName("inline-flex", props.className)),
                        ...(props.attributes ?? []),
                    ],
                    [renderTrigger(render), ...renderPanel(render)]
                ),
        },
    })
}
