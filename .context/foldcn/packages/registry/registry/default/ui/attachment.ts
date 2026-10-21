import { Button as FoldkitButton } from '@foldkit/ui'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

type Child = Html | string

import { cn } from '@/lib/utils'

export const attachmentStateKeys = ['idle', 'uploading', 'processing', 'error', 'done'] as const
export type AttachmentState = (typeof attachmentStateKeys)[number]

export const attachmentSizeKeys = ['default', 'sm', 'xs'] as const
export type AttachmentSize = (typeof attachmentSizeKeys)[number]

export const attachmentSizes: Record<AttachmentSize, string> = {
  default: 'cn-attachment-size-default',
  sm: 'cn-attachment-size-sm',
  xs: 'cn-attachment-size-xs',
}

export const attachmentOrientationKeys = ['horizontal', 'vertical'] as const
export type AttachmentOrientation = (typeof attachmentOrientationKeys)[number]

export const attachmentOrientations: Record<AttachmentOrientation, string> = {
  horizontal: 'cn-attachment-orientation-horizontal items-center',
  vertical: 'cn-attachment-orientation-vertical flex-col',
}

export const attachmentClass =
  'cn-attachment group/attachment relative flex max-w-full min-w-0 shrink-0 flex-wrap border bg-card text-card-foreground transition-colors has-[>a,>button]:hover:bg-muted/50 data-[state=error]:border-destructive/30 data-[state=idle]:border-dashed'

export const attachmentMediaVariantKeys = ['icon', 'image'] as const
export type AttachmentMediaVariant = (typeof attachmentMediaVariantKeys)[number]

export const attachmentMediaVariants: Record<AttachmentMediaVariant, string> = {
  icon: 'cn-attachment-media-variant-icon',
  image:
    'cn-attachment-media-variant-image *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover',
}

export const attachmentMediaClass =
  'cn-attachment-media relative flex aspect-square shrink-0 items-center justify-center overflow-hidden group-data-[state=error]/attachment:bg-destructive/10 group-data-[state=error]/attachment:text-destructive [&_svg]:pointer-events-none'

export const attachmentContentClass = 'cn-attachment-content max-w-full min-w-0 flex-1'

export const attachmentTitleClass =
  'cn-attachment-title block max-w-full min-w-0 truncate group-data-[state=processing]/attachment:shimmer group-data-[state=uploading]/attachment:shimmer'

export const attachmentDescriptionClass =
  'cn-attachment-description block min-w-0 truncate text-muted-foreground group-data-[state=error]/attachment:text-destructive/80 max-w-full'

export const attachmentActionsClass = 'cn-attachment-actions flex shrink-0 items-center'

export const attachmentActionClass =
  'cn-button cn-button-variant-ghost cn-button-size-icon-xs cn-attachment-action'

export const attachmentTriggerClass = 'cn-attachment-trigger absolute inset-0 z-10 outline-none'

export const attachmentGroupClass =
  'cn-attachment-group flex min-w-0 scroll-fade-x snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start'

type StyleConfig = Readonly<{ className?: string }>

type AttachmentConfig = Readonly<{
  state?: AttachmentState
  size?: AttachmentSize
  orientation?: AttachmentOrientation
  className?: string
}>

type AttachmentMediaConfig = Readonly<{
  variant?: AttachmentMediaVariant
  className?: string
}>

type ButtonConfig<M> = Readonly<{
  onClick?: M
  isDisabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  isAutofocus?: boolean
  className?: string
  attributes?: ReadonlyArray<Attribute<M>>
}>

const attachmentGroup = <M>(
  config: StyleConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(cn(attachmentGroupClass, config.className)),
      h.DataAttribute('slot', 'attachment-group'),
    ],
    children,
  )

const attachmentContainer = <M>(
  config: AttachmentConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(
        cn(
          attachmentClass,
          attachmentSizes[config.size ?? 'default'],
          attachmentOrientations[config.orientation ?? 'horizontal'],
          config.className,
        ),
      ),
      h.DataAttribute('slot', 'attachment'),
      h.DataAttribute('state', config.state ?? 'done'),
      h.DataAttribute('size', config.size ?? 'default'),
      h.DataAttribute('orientation', config.orientation ?? 'horizontal'),
    ],
    children,
  )

const attachmentMedia = <M>(
  config: AttachmentMediaConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(
        cn(
          attachmentMediaClass,
          attachmentMediaVariants[config.variant ?? 'icon'],
          config.className,
        ),
      ),
      h.DataAttribute('slot', 'attachment-media'),
      h.DataAttribute('variant', config.variant ?? 'icon'),
    ],
    children,
  )

const attachmentContent = <M>(
  config: StyleConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(cn(attachmentContentClass, config.className)),
      h.DataAttribute('slot', 'attachment-content'),
    ],
    children,
  )

const attachmentTitle = <M>(
  config: StyleConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.span(
    [
      h.Class(cn(attachmentTitleClass, config.className)),
      h.DataAttribute('slot', 'attachment-title'),
    ],
    children,
  )

const attachmentDescription = <M>(
  config: StyleConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.span(
    [
      h.Class(cn(attachmentDescriptionClass, config.className)),
      h.DataAttribute('slot', 'attachment-description'),
    ],
    children,
  )

const attachmentActions = <M>(
  config: StyleConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(cn(attachmentActionsClass, config.className)),
      h.DataAttribute('slot', 'attachment-actions'),
    ],
    children,
  )

const attachmentAction = <M>(
  config: ButtonConfig<M>,
  label: Html | string,
  h: HtmlBuilder<M>,
): Html =>
  FoldkitButton.view<M>(
    {
      onClick: config.onClick,
      isDisabled: config.isDisabled,
      type: config.type,
      isAutofocus: config.isAutofocus,
      toView: (attributes) =>
        h.button(
          [
            ...attributes.button,
            h.Class(cn(attachmentActionClass, config.className)),
            h.DataAttribute('slot', 'attachment-action'),
            ...(config.attributes ?? []),
          ],
          [label],
        ),
    },
    h,
  )

const attachmentTrigger = <M>(config: ButtonConfig<M>, h: HtmlBuilder<M>): Html =>
  FoldkitButton.view<M>(
    {
      onClick: config.onClick,
      isDisabled: config.isDisabled,
      type: config.type ?? 'button',
      isAutofocus: config.isAutofocus,
      toView: (attributes) =>
        h.button(
          [
            ...attributes.button,
            h.Class(cn(attachmentTriggerClass, config.className)),
            h.DataAttribute('slot', 'attachment-trigger'),
            ...(config.attributes ?? []),
          ],
          [],
        ),
    },
    h,
  )

/** Styled attachment — a file/card preview with `Attachment.group`,
 *  `Attachment.media`, `Attachment.content`, `Attachment.title`,
 *  `Attachment.description`, `Attachment.actions`, `Attachment.action`,
 *  `Attachment.trigger` sub-builders. Mirrors the shadcn v4 `attachment.tsx`.
 *  Pure layout primitive (no @foldkit/ui submodel). */
export const Attachment = Object.assign(attachmentContainer, {
  group: attachmentGroup,
  media: attachmentMedia,
  content: attachmentContent,
  title: attachmentTitle,
  description: attachmentDescription,
  actions: attachmentActions,
  action: attachmentAction,
  trigger: attachmentTrigger,
})
