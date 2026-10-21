import { Button as FoldkitButton } from '@foldkit/ui'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/** Button variant keys. Sync with `buttonVariants` is compiler-enforced:
 *  `buttonVariants` is `Record<ButtonVariant, string>` (missing key = error)
 *  and annotated object literals reject unknown keys. */
export const buttonVariantKeys = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const

export const buttonVariants: Record<ButtonVariant, string> = {
  default: 'cn-button-variant-default',
  destructive: 'cn-button-variant-destructive',
  outline: 'cn-button-variant-outline',
  secondary: 'cn-button-variant-secondary',
  ghost: 'cn-button-variant-ghost',
  link: 'cn-button-variant-link',
}

export type ButtonVariant = (typeof buttonVariantKeys)[number]

/** Button size keys. Sync with `buttonSizes` is compiler-enforced (see above). */
export const buttonSizeKeys = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
] as const

export const buttonSizes: Record<ButtonSize, string> = {
  default: 'cn-button-size-default',
  xs: 'cn-button-size-xs',
  sm: 'cn-button-size-sm',
  lg: 'cn-button-size-lg',
  icon: 'cn-button-size-icon',
  'icon-xs': 'cn-button-size-icon-xs',
  'icon-sm': 'cn-button-size-icon-sm',
  'icon-lg': 'cn-button-size-icon-lg',
}

export type ButtonSize = (typeof buttonSizeKeys)[number]

const buttonBase = 'cn-button'

export type ButtonConfig<M> = Readonly<{
  onClick?: M
  isDisabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  isAutofocus?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  /** Extra attributes merged onto the button element (ids, handlers,
   *  popoover anchors, …). */
  attributes?: ReadonlyArray<Attribute<M>>
}>

export type ButtonLabel = Html | string | ReadonlyArray<Html | string>

/** Styled button built on the @foldkit/ui Button helper. */
export const button = <M>(config: ButtonConfig<M>, label: ButtonLabel, h: HtmlBuilder<M>): Html =>
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
            h.Class(
              cn(
                buttonBase,
                buttonVariants[config.variant ?? 'default'],
                buttonSizes[config.size ?? 'default'],
                config.className,
              ),
            ),
            h.DataAttribute('slot', 'button'),
            ...(config.attributes ?? []),
          ],
          Array.isArray(label) ? label : [label],
        ),
    },
    h,
  )
