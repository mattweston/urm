/** Stateful submodel — import the whole module as a namespace and wire its
 *  Model/Message/init/update into your app:
 *  `import * as Listbox from '@/components/ui/listbox'`
 */
import { Listbox as FoldkitListbox } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/listbox'
import type { Option } from 'effect/Option'
import type { Html } from 'foldkit/html'

import { cn } from '@/lib/utils'

// Re-export the @foldkit/ui Listbox surface. Create a bundle once per
// value type:
//
//   export const ItemListbox = Listbox.create<"a" | "b">()
//   export const MultiListbox = Listbox.Multi.create<"a" | "b">()

export const create = FoldkitListbox.create
export const Multi = FoldkitListbox.Multi
export const init = (config: InitConfig): Model =>
  FoldkitListbox.init({ isAnimated: true, ...config })
export const buttonId = FoldkitListbox.buttonId
export const Model = FoldkitListbox.Model
export type Model = typeof Model.Type
export const Message = FoldkitListbox.Message
export type Message = typeof Message.Type
export const OutMessage = FoldkitListbox.OutMessage
export type OutMessage = typeof OutMessage.Type

export type Bundle<Item = string> = FoldkitListbox.Bundle<Item>
export type InitConfig = FoldkitListbox.InitConfig
export type ViewInputs<Item, Value extends string = string> = FoldkitListbox.ViewInputs<Item, Value>
export type ItemConfig = FoldkitListbox.ItemConfig
export type GroupHeading = FoldkitListbox.GroupHeading

export const listboxTriggerClass =
  "flex h-9 min-w-48 items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium text-foreground shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

export const listboxItemsClass =
  'z-50 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2'

export const listboxItemsAnimatedClass =
  'z-50 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 data-[enter]:animate-in data-[enter]:fade-in-0 data-[enter]:zoom-in-95 data-[leave]:animate-out data-[leave]:fade-out-0 data-[leave]:zoom-out-95'

export const listboxItemClass =
  "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none transition-colors data-[active]:bg-accent data-[active]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

export const listboxGroupHeadingClass = 'px-2 py-1.5 text-xs font-semibold text-muted-foreground'

export const listboxSeparatorClass = '-mx-1 my-1 h-px bg-border'

export const listboxBackdropClass = 'fixed inset-0 z-0'

export const listboxWrapperClass = 'relative inline-block'

export const LISTBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

type CommonConfig<Item> = Readonly<{
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{
      isActive: boolean
      isDisabled: boolean
      isReadOnly: boolean
      isSelected: boolean
    }>,
  ) => ItemConfig
  buttonContent: Html
  anchor?: AnchorConfig
  isItemDisabled?: (item: Item, index: number) => boolean
  itemToSearchText?: (item: Item, index: number) => string
  isButtonDisabled?: boolean
  isAnimated?: boolean
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  triggerClass?: string
  itemsClass?: string
  itemClass?: string
  backdropClass?: string
  wrapperClass?: string
}>

const common = <Item>(config: CommonConfig<Item>) => ({
  items: config.items,
  anchor: config.anchor ?? LISTBOX_ANCHOR,
  isItemDisabled: config.isItemDisabled,
  itemToSearchText: config.itemToSearchText,
  isButtonDisabled: config.isButtonDisabled,
  buttonContent: config.buttonContent,
  itemGroupKey: config.itemGroupKey,
  groupToHeading: config.groupToHeading,
  buttonClassName: cn(listboxTriggerClass, config.triggerClass),
  itemsClassName: cn(
    config.isAnimated !== false ? listboxItemsAnimatedClass : listboxItemsClass,
    config.itemsClass,
  ),
  itemToConfig: (item: Item, context: Parameters<CommonConfig<Item>['itemToConfig']>[1]) => {
    const { className, content } = config.itemToConfig(item, context)
    return { className: cn(listboxItemClass, config.itemClass, className), content }
  },
  separatorClassName: listboxSeparatorClass,
  groupClassName: listboxGroupHeadingClass,
  backdropClassName: cn(listboxBackdropClass, config.backdropClass),
  className: cn(listboxWrapperClass, config.wrapperClass),
})

export type SingleViewInputsConfig<Item, Value extends string> = CommonConfig<Item> &
  Readonly<{
    maybeSelectedValue: Option<Value>
    itemToValue?: (item: Item) => Value
  }>

/** Build styled single-select `Listbox.ViewInputs`. */
export const viewInputs = <Item, Value extends string = Item extends string ? Item : string>(
  config: SingleViewInputsConfig<Item, Value>,
): ViewInputs<Item, Value> => {
  const { itemToValue, ...rest } = config
  return {
    ...common(rest),
    maybeSelectedValue: rest.maybeSelectedValue,
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: String(item) as Value default
    itemToValue: itemToValue ?? ((item: Item): Value => String(item) as Value),
  }
}

export type MultiViewInputsConfig<Item> = CommonConfig<Item> &
  Readonly<{
    selectedValues: ReadonlyArray<string>
    itemToValue?: (item: Item) => string
  }>

/** Build styled multi-select `Listbox.Multi` view inputs. */
export const multiViewInputs = <Item>(
  config: MultiViewInputsConfig<Item>,
): FoldkitListbox.Multi.ViewInputs<Item> => {
  const { itemToValue, ...rest } = config
  return {
    ...common(rest),
    selectedValues: rest.selectedValues,
    itemToValue: itemToValue ?? ((item: Item) => String(item)),
  }
}
