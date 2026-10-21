/** Divergence from upstream: shadcn `direction.tsx` re-exports
 *  `DirectionProvider`/`useDirection` from `@base-ui/react/direction-provider`.
 *  foldcn instead renders a plain `<div dir="...">` (`direction`) — no provider
 *  context. Existing foldcn API is `direction({ dir, className }, children, h)`;
 *  do not switch to a provider without a major version bump. */
import type { Html, HtmlBuilder } from 'foldkit/html'

type Child = Html | string

import { cn } from '@/lib/utils'

export type Direction = 'ltr' | 'rtl'

type DirectionConfig = Readonly<{ dir: Direction; className?: string }>

export const direction = <M>(
  config: DirectionConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html => h.div([h.Dir(config.dir), h.Class(cn('w-full', config.className))], children)
