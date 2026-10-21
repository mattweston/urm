import { foldcnOnly } from './parity'

const rename = {
  menu: 'dropdown-menu',
  fieldset: 'field',
} as const

const isRenameKey = (name: string): name is keyof typeof rename => name in rename

export const shadcnUrlFor = (name: string): string | undefined => {
  if (foldcnOnly.has(name)) return undefined
  const slug = isRenameKey(name) ? rename[name] : name
  return `https://ui.shadcn.com/docs/components/${slug}`
}

export const hasUpstream = (name: string): boolean => shadcnUrlFor(name) !== undefined
