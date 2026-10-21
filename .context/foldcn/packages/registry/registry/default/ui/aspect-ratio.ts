import type { Html, HtmlBuilder } from 'foldkit/html'

type Child = Html | string

import { cn } from '@/lib/utils'

export const aspectRatioClass = 'relative aspect-(--ratio)'

type AspectRatioConfig = Readonly<{ ratio: number; className?: string }>

export const aspectRatio = <M>(
  config: AspectRatioConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(cn(aspectRatioClass, config.className)),
      h.DataAttribute('slot', 'aspect-ratio'),
      h.Style({ '--ratio': String(config.ratio) }),
    ],
    children,
  )
