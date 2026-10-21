import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'
import { button, type ButtonConfig } from './button'
import { inputClass } from './input'
import { textareaClass } from './textarea'

type Child = Html | string

// InputGroup draws a shared bordered box and lets you slot text/icon add-ons
// around a connected input. The inner control carries
// data-slot="input-group-control" so the group token's focus/invalid/disabled
// frame states key off it.

/** Upstream InputGroup root string. */
export const inputGroupClass =
  'group/input-group cn-input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto'

/** Upstream InputGroupAddon base string; alignment via the align tokens. */
export const inputGroupAddonClass =
  'cn-input-group-addon flex cursor-text items-center justify-center select-none'

export const inputGroupAddonAlignClasses = {
  'inline-start': 'cn-input-group-addon-align-inline-start order-first',
  'inline-end': 'cn-input-group-addon-align-inline-end order-last',
  'block-start': 'cn-input-group-addon-align-block-start order-first w-full justify-start',
  'block-end': 'cn-input-group-addon-align-block-end order-last w-full justify-start',
} as const

export type InputGroupAddonAlign = keyof typeof inputGroupAddonAlignClasses

export const inputGroupButtonSizeKeys = ['xs', 'sm', 'icon-xs', 'icon-sm'] as const
export type InputGroupButtonSize = (typeof inputGroupButtonSizeKeys)[number]

/** Upstream InputGroupButton base string (sizes are tokens). */
export const inputGroupButtonClass = 'cn-input-group-button flex items-center shadow-none'

/** Upstream InputGroupButton size tokens; keyed like upstream's cva variants. */
export const inputGroupButtonSizeClasses = {
  xs: 'cn-input-group-button-size-xs',
  sm: 'cn-input-group-button-size-sm',
  'icon-xs': 'cn-input-group-button-size-icon-xs',
  'icon-sm': 'cn-input-group-button-size-icon-sm',
} as const

export type InputGroupTextareaConfig<M> = Readonly<{
  id: string
  value?: string
  onInput?: (value: string) => M
  isDisabled?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  placeholder?: string
  name?: string
  rows?: number
  className?: string
}>

export const inputGroupTextareaClass = 'cn-input-group-textarea flex-1 resize-none'

export const inputGroupTextClass =
  'cn-input-group-text flex items-center [&_svg]:pointer-events-none'

export const inputGroupInputClass = 'cn-input-group-input flex-1'

/** The connected textarea for use inside `inputGroup`. Emits
 *  data-slot="input-group-control" so the group frame reacts to it. */
export const inputGroupTextarea = <M>(
  config: InputGroupTextareaConfig<M>,
  h: HtmlBuilder<M>,
): Html =>
  h.textarea([
    h.Id(config.id),
    ...(config.onInput === undefined ? [] : [h.OnInput(config.onInput)]),
    ...(config.value === undefined ? [] : [h.Value(config.value)]),
    ...(config.isDisabled === true ? [h.Disabled(true), h.DataAttribute('disabled', '')] : []),
    ...(config.isReadOnly === true ? [h.Attribute('readonly', 'true')] : []),
    ...(config.isInvalid === true ? [h.AriaInvalid(true), h.DataAttribute('invalid', '')] : []),
    ...(config.name === undefined ? [] : [h.Name(config.name)]),
    ...(config.rows === undefined ? [] : [h.Rows(config.rows)]),
    ...(config.placeholder === undefined ? [] : [h.Placeholder(config.placeholder)]),
    h.DataAttribute('slot', 'input-group-control'),
    h.Class(cn(textareaClass, inputGroupTextareaClass, config.className)),
  ])

export type InputGroupInputConfig<M> = Readonly<{
  id: string
  ariaLabel?: string
  value?: string
  onInput?: (value: string) => M
  isDisabled?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  placeholder?: string
  name?: string
  type?: string
  className?: string
  /** Extra attributes merged onto the input element. */
  attributes?: ReadonlyArray<Attribute<M>>
}>

/** The connected input for use inside `inputGroup`. Emits
 *  data-slot="input-group-control" so the group frame reacts to it. */
export const inputGroupInput = <M>(config: InputGroupInputConfig<M>, h: HtmlBuilder<M>): Html =>
  h.input([
    h.Id(config.id),
    ...(config.ariaLabel === undefined ? [] : [h.AriaLabel(config.ariaLabel)]),
    ...(config.onInput === undefined ? [] : [h.OnInput(config.onInput)]),
    ...(config.value === undefined ? [] : [h.Value(config.value)]),
    ...(config.isDisabled === true ? [h.Disabled(true), h.DataAttribute('disabled', '')] : []),
    ...(config.isReadOnly === true ? [h.Attribute('readonly', 'true')] : []),
    ...(config.isInvalid === true ? [h.AriaInvalid(true), h.DataAttribute('invalid', '')] : []),
    ...(config.name === undefined ? [] : [h.Name(config.name)]),
    ...(config.type === undefined ? [] : [h.Type(config.type)]),
    ...(config.placeholder === undefined ? [] : [h.Placeholder(config.placeholder)]),
    h.DataAttribute('slot', 'input-group-control'),
    h.Class(cn(inputClass, inputGroupInputClass, config.className)),
    ...(config.attributes ?? []),
  ])

export type InputGroupButtonConfig<M> = Omit<ButtonConfig<M>, 'size'> &
  Readonly<{
    /** Group-local size — keys `cn-input-group-button-size-*` tokens. */
    size?: InputGroupButtonSize
  }>

/** A `button` styled to sit inside an `inputGroup` — ghost by default,
 *  sized by the group tokens (upstream keeps the underlying Button on its own
 *  default size and layers the group size token over it). */
export const inputGroupButton = <M>(
  config: InputGroupButtonConfig<M>,
  label: Html | string,
  h: HtmlBuilder<M>,
): Html => {
  const size = config.size ?? 'xs'
  const { size: _groupSize, ...buttonConfig } = config
  return button<M>(
    {
      ...buttonConfig,
      variant: config.variant ?? 'ghost',
      className: cn(inputGroupButtonClass, inputGroupButtonSizeClasses[size], config.className),
      attributes: [h.DataAttribute('size', size), ...(config.attributes ?? [])],
    },
    label,
    h,
  )
}

type StyleConfig = Readonly<{ className?: string }>

type AddonConfig = StyleConfig & Readonly<{ align?: InputGroupAddonAlign }>

/** Add-on (text or icon) for either side of the group. Clicking the addon
 *  focuses the contained input (unless the click target is a button), matching
 *  upstream InputGroupAddon's onClick delegation. */
export const inputGroupAddon = <M>(
  config: AddonConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html => {
  const align = config.align ?? 'inline-start'
  return h.div(
    [
      h.Role('group'),
      h.DataAttribute('slot', 'input-group-addon'),
      h.DataAttribute('align', align),
      h.Class(cn(inputGroupAddonClass, inputGroupAddonAlignClasses[align], config.className)),
      h.Attribute(
        'onclick',
        "if(!event.target.closest('button'))this.parentElement?.querySelector('input')?.focus()",
      ),
    ],
    children,
  )
}

/** Alias kept for backward compatibility — an inline-start text addon.
 *  Upstream renders a `span` with NO data-slot (foldcn previously added
 *  an extra slot; removed to match upstream). */
export const inputGroupText = <M>(
  config: StyleConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html => h.span([h.Class(cn(inputGroupTextClass, config.className))], children)

/** Segmented container — pass addons / controls as children. */
export const inputGroup = <M>(
  config: StyleConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Role('group'),
      h.Class(cn(inputGroupClass, config.className)),
      h.DataAttribute('slot', 'input-group'),
    ],
    children,
  )
