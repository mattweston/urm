/** Stateful submodel — import the whole module as a namespace and wire its
 *  Model/Message/init/update into your app:
 *  `import * as Tooltip from '@/components/ui/tooltip'`
 */
import { Tooltip as FoldkitTooltip } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/tooltip'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

type Child = Html | string

import { cn } from '@/lib/utils'

// Re-export the @foldkit/ui Tooltip submodel surface.

export const Model = FoldkitTooltip.Model
export type Model = typeof Model.Type

export const Message = FoldkitTooltip.Message
export type Message = typeof Message.Type

export const OutMessage = FoldkitTooltip.OutMessage
export type OutMessage = typeof OutMessage.Type

export const update = FoldkitTooltip.update
export const reflectShowDelay = FoldkitTooltip.reflectShowDelay
export const triggerId = FoldkitTooltip.triggerId
export const view = FoldkitTooltip.view

export type RenderInfo = FoldkitTooltip.RenderInfo

export type InitConfig = FoldkitTooltip.InitConfig

/** Hover-to-show delay in milliseconds. Matches the shadcn reference
 *  `TooltipProvider` default (`delay = 0`): tooltips appear immediately on
 *  hover/focus. Pass `showDelay` (e.g. `Duration.millis(400)` or `'400 millis'`)
 *  to wait before revealing. */
export const DEFAULT_SHOW_DELAY = 0

/** Create an initial tooltip model. Defaults the delay to `0` (immediate),
 *  matching the shadcn base tooltip. Any caller-supplied `showDelay` wins. */
export const init = (config: InitConfig): Model =>
  FoldkitTooltip.init({ showDelay: DEFAULT_SHOW_DELAY, ...config })

/** Default anchor matching the shadcn reference `TooltipContent` defaults:
 *  `side="top"`, `sideOffset=4`, `align="center"`, `alignOffset=0`.
 *  `placement` maps side+align (a bare side centers the tooltip), `gap` maps
 *  sideOffset, `offset` maps alignOffset and defaults to 0. */
export const TOOLTIP_ANCHOR: AnchorConfig = {
  placement: 'top',
  gap: 4,
}

export const tooltipTriggerClass = 'cn-button cn-button-variant-outline cn-button-size-default'

/**
 * The foldkit anchor writes the resolved side to `data-placement`; this view
 * additionally emits `data-side` so upstream's data-[side=…] variants resolve.
 *
 */
export const tooltipContentClass =
  'cn-tooltip-content cn-tooltip-content-logical z-50 w-fit max-w-xs origin-(--transform-origin) bg-foreground text-background'

// Mirrors the shadcn v4 base tooltip arrow (`cn-tooltip-arrow` +
// `cn-tooltip-arrow-logical` + Arrow props), inlined and mapped to
// `data-placement`. The logical (`inline-start`/`inline-end`) variants are
// omitted: foldkit placements are always physical (LTR), so the physical
// left/right rules already cover them. `absolute` is added because foldcn
// renders its own arrow element where base-ui's Arrow is positioned by the
// library; the panel's inline `position: absolute` (from the anchor mount)
// is its containing block.
/** Upstream arrow string plus `absolute` (foldcn renders its own arrow
 *  element where Base UI positions the Arrow itself). Side variants key on
 *  the emitted data-side attribute. */
export const tooltipArrowClass =
  'cn-tooltip-arrow cn-tooltip-arrow-logical absolute z-50 bg-foreground fill-foreground size-2.5 rotate-45 rounded-[2px] translate-y-[calc(-50%-2px)] data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5'

export const tooltipWrapperClass = 'relative inline-block'

export type StyledViewInputs<M = never> = Readonly<{
  /** Positioning overrides. Defaults to `TOOLTIP_ANCHOR`
   *  (`placement: 'top'`, `gap: 4`), matching the shadcn reference. */
  anchor?: AnchorConfig
  /** Trigger element content. */
  trigger: Child
  /** Tooltip text. */
  content: Child
  className?: string
  triggerClass?: string
  contentClass?: string
  wrapperClass?: string
  /** When true, the trigger is skipped by keyboard focus and only pointer
   *  hover can reveal the tooltip. */
  hoverOnly?: boolean
  /** Attributes applied to the generated trigger element. */
  triggerAttributes?: ReadonlyArray<Attribute<M> | ChildAttribute>
}>

/** Build styled `Tooltip.ViewInputs`. Pass your view's `h`. */
export const styledViewInputs = <M>(
  viewInputs: StyledViewInputs<M>,
  h: HtmlBuilder<M>,
): FoldkitTooltip.ViewInputs => {
  const anchor = { ...TOOLTIP_ANCHOR, ...viewInputs.anchor }
  const side = (anchor.placement ?? 'top').split('-')[0] || 'top'
  return {
    anchor,
    toView: ({ trigger, panel, isVisible }) =>
      h.div(
        [
          h.Class(cn(tooltipWrapperClass, viewInputs.wrapperClass)),
          h.DataAttribute('slot', 'tooltip'),
        ],
        [
          h.button(
            [
              ...(viewInputs.triggerAttributes ?? []),
              ...trigger,
              ...(viewInputs.hoverOnly === true ? [h.Attribute('tabindex', '-1')] : []),
              h.Class(cn(tooltipTriggerClass, viewInputs.triggerClass)),
              h.DataAttribute('slot', 'tooltip-trigger'),
            ],
            [viewInputs.trigger],
          ),
          ...(isVisible
            ? [
                h.div(
                  [
                    ...panel,
                    h.DataAttribute('slot', 'tooltip-content'),
                    h.DataAttribute('side', side),
                    h.Class(cn(tooltipContentClass, viewInputs.contentClass)),
                  ],
                  [
                    viewInputs.content,
                    h.div([h.DataAttribute('side', side), h.Class(tooltipArrowClass)], []),
                  ],
                ),
              ]
            : []),
        ],
      ),
  }
}
