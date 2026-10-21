import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '@/ui/button'
import { icon } from '@/lib/icons'

import { Check, Copy } from 'lucide'

// Copy button — reusable component for copying text to clipboard.

export type CopyButtonConfig<M> = Readonly<{
  /** The string value that will be copied to the clipboard. */
  value: string
  /** Message dispatched when the user clicks the copy button. */
  onCopy?: M
  /** Whether the button should show the checkmark (copied) state. */
  isCopied?: boolean
  /** Additional class names for the button. */
  className?: string
  /** Accessible label for the button (default: "Copy"). */
  ariaLabel?: string
}>

/** A styled copy button that toggles between copy and check icons. */
export const copyButton = <M>(config: CopyButtonConfig<M>, h: HtmlBuilder<M>): Html =>
  button<M>(
    {
      variant: 'ghost',
      size: 'icon-sm',
      onClick: config.onCopy,
      isDisabled: config.isCopied,
      className: config.className,
    },
    config.isCopied ? icon(h, Check) : icon(h, Copy),
    h,
  )
