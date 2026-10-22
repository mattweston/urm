import type { PageBase } from "./types.js"

/** Which routes contain which block. Rebuild from fresh pages on each publish, or persist it. */
export interface DepMap {
  readonly blockToRoutes: ReadonlyMap<string, ReadonlySet<string>>
}

export const buildDepMap = (pages: ReadonlyArray<PageBase>): DepMap => {
  const blockToRoutes = new Map<string, Set<string>>()
  for (const page of pages) {
    for (const block of page.blocks) {
      const routes = blockToRoutes.get(block.id) ?? new Set<string>()
      routes.add(page.route)
      blockToRoutes.set(block.id, routes)
    }
  }
  return { blockToRoutes }
}

/**
 * Routes touched by a change. `change.routes` should include any route a block was
 * moved away from, since a map built from fresh pages no longer lists it there.
 */
export const affectedRoutes = (
  dep: DepMap,
  change: { readonly blocks: ReadonlyArray<string>; readonly routes: ReadonlyArray<string> },
): ReadonlySet<string> => {
  const out = new Set<string>(change.routes)
  for (const id of change.blocks) {
    for (const route of dep.blockToRoutes.get(id) ?? []) out.add(route)
  }
  return out
}
