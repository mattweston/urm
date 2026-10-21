// Parity status surfaced in the sidebar — derived from the user-facing
// gaps map (catalog/gaps.ts) plus the set of foldcn-only primitives that
// have no shadcn/ui counterpart at all (see docs/shadcn-base-parity-audit.md
// "Not covered (no counterpart) — foldcn-only").
//
// Statuses:
//  - full        — matches shadcn/ui counterpart (no known behavioral gap)
//  - diverged    — has at least one entry in gapsByItem; item page shows a
//                  "Differences vs shadcn/ui" callout
//  - foldcn-only — no shadcn/ui counterpart to compare against
//
// Keep this file in sync with gaps.ts: when a gap is fixed, delete its entry
// in gaps.ts and the sidebar dot flips to green without touching this file.
// When a new foldcn-only primitive gains a shadcn counterpart, remove it from
// the set below.

import { Check, Sparkles, TriangleAlert } from 'lucide'
import type { IconNode } from 'lucide'

import type { BadgeVariant } from '@foldcn/registry/styles/default/ui/badge'

import { gapsForItem } from './gaps'

/** Components that exist only in foldcn — no shadcn/ui counterpart. */
export const foldcnOnly = new Set<string>([
  'animation',
  'date-picker',
  'drag-and-drop',
  'file-drop',
  'listbox',
  'nav',
  'virtual-list',
])

export type ParityStatus = 'full' | 'diverged' | 'foldcn-only'

/** Parity for a registry item name that belongs to the Components category.
 *  For non-components (Blocks, Lib, Base) callers should skip the indicator. */
export const parityStatus = (name: string): ParityStatus => {
  if (foldcnOnly.has(name)) return 'foldcn-only'
  if (gapsForItem(name) !== undefined) return 'diverged'
  return 'full'
}

export const parityLabel: Record<ParityStatus, string> = {
  full: 'Full parity',
  diverged: 'Deviations',
  'foldcn-only': 'Foldcn only',
}

export const parityTitle: Record<ParityStatus, string> = {
  full: 'Full parity with shadcn/ui',
  diverged: 'Deviations from shadcn/ui — see item page for details',
  'foldcn-only': 'Foldcn only — no shadcn/ui counterpart',
}

export const parityDotClass: Record<ParityStatus, string> = {
  full: 'bg-emerald-500',
  diverged: 'bg-amber-500',
  'foldcn-only': 'bg-violet-500',
}

export const parityVariant: Record<ParityStatus, BadgeVariant> = {
  full: 'secondary',
  diverged: 'destructive',
  'foldcn-only': 'outline',
}

export const parityIcon: Record<ParityStatus, IconNode> = {
  full: Check,
  diverged: TriangleAlert,
  'foldcn-only': Sparkles,
}

/** Convenience: title for a specific item — uses the first gap sentence for diverged items. */
export const parityTitleForItem = (name: string): string => {
  const status = parityStatus(name)
  if (status === 'diverged') {
    const gaps = gapsForItem(name)
    if (gaps?.[0]) return gaps[0]
    return parityTitle.diverged
  }
  return parityTitle[status]
}
