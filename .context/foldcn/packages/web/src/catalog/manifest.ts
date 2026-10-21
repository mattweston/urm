import ui from '@foldcn/registry/registry/default/ui/registry.json'
import lib from '@foldcn/registry/registry/default/lib/registry.json'
import blocks from '@foldcn/registry/registry/default/blocks/registry.json'
import style from '@foldcn/registry/registry/default/style/registry.json'

import type { RegistryGroupJson } from './types'

export const uiGroup = ui satisfies RegistryGroupJson
export const libGroup = lib satisfies RegistryGroupJson
export const blocksGroup = blocks satisfies RegistryGroupJson
export const styleGroup = style satisfies RegistryGroupJson
