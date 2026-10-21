// Registry item sources, derived from the resolved styles tree via Vite's
// glob import. Every file is inlined as `?raw`, so item pages render the exact
// code users copy — adding a component requires no registration here: drop it
// in the registry and its source shows up automatically.

import { blocksGroup, libGroup, styleGroup, uiGroup } from './manifest'
import type { RegistryGroupJson } from './types'

export type SourceEntry = Readonly<{ path: string; code: string }>

const rawSources: Readonly<Record<string, string>> = import.meta.glob(
  '../../../registry/styles/default/**/*.ts',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
)

// Glob keys are module paths whose shape depends on how the pattern resolves;
// normalize them to paths relative to the resolved tree root.
const TREE_MARKER = 'styles/default/'

const rawByTreePath: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(rawSources)
    .map((entry): readonly [string, string] | undefined => {
      const at = entry[0].indexOf(TREE_MARKER)
      return at === -1 ? undefined : [entry[0].slice(at + TREE_MARKER.length), entry[1]]
    })
    .filter((entry): entry is readonly [string, string] => entry !== undefined),
)

// Manifest file paths are relative to their sub-registry directory; the item
// page displays them as full `registry/default/...` paths.
const GROUPS: ReadonlyArray<{ group: RegistryGroupJson; dir: string }> = [
  { group: styleGroup, dir: 'style' },
  { group: libGroup, dir: 'lib' },
  { group: uiGroup, dir: 'ui' },
  { group: blocksGroup, dir: 'blocks' },
]

const resolveSource = (dir: string, filePath: string): SourceEntry | undefined => {
  const code = rawByTreePath[`${dir}/${filePath}`]
  return code === undefined ? undefined : { path: `registry/default/${dir}/${filePath}`, code }
}

export const sourceByItem: Readonly<Record<string, SourceEntry>> = Object.fromEntries(
  GROUPS.flatMap(({ group, dir }) =>
    (group.items ?? []).flatMap((item): Array<[string, SourceEntry]> => {
      const name = item.name ?? ''
      if (name === '') return []
      const files = (item.files ?? []).flatMap((file) =>
        file.path === undefined ? [] : [resolveSource(dir, file.path)],
      )
      const entry = files.find((file) => file !== undefined)
      return entry === undefined ? [] : [[name, entry]]
    }),
  ),
)
