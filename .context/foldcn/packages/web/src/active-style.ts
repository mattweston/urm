import { Schema as S } from 'effect'

/** The registry style applied to every demo preview.
 *
 *  Styles are resolved to concrete Tailwind classes at build time (see
 *  packages/registry/scripts/resolve-styles.mjs), so a style switch means
 *  rebinding which tree's exports the demo reads — not a CSS variable swap.
 *  The generated shims under `src/generated/registry/*` expose every component
 *  export as an ES-module live binding (`export let`) and reassign them via
 *  {@link setActiveStyle}; the foldkit view re-render then picks up the new
 *  classes instantly, with demo state preserved.
 *
 *  `localStorage` only exists in the browser, so SSR and prerendering always
 *  produce default-styled HTML — which is why entry.ts skips hydration
 *  (`Runtime.run` instead of `Runtime.hydrate`) when a non-default style is
 *  stored at boot.
 */

export const REGISTRY_STYLES = [
  'default',
  'nova',
  'vega',
  'maia',
  'lyra',
  'mira',
  'luma',
  'sera',
  'rhea',
] as const

export type RegistryStyle = (typeof REGISTRY_STYLES)[number]

/** Schema twin of {@link RegistryStyle} for use in foldkit Model/Message
 *  structs (mirrors how PackageManager/ThemePreference are declared in
 *  model.ts). */
export const RegistryStyle = S.Literals([...REGISTRY_STYLES])
export type RegistryStyleType = typeof RegistryStyle.Type

export const isRegistryStyle = (value: unknown): value is RegistryStyle =>
  REGISTRY_STYLES.some((style) => style === value)

export const STYLE_STORAGE_KEY = 'foldcn-style'

/**
 * Reads (and validates) the persisted preference without touching the active
 * pointer.
 */
export const readStoredStyle = (): RegistryStyle => {
  if (typeof localStorage === 'undefined') return 'default'
  const raw = localStorage.getItem(STYLE_STORAGE_KEY)
  return isRegistryStyle(raw) ? raw : 'default'
}

/**
 * The in-memory active style. Initialized from the stored preference at
 * module evaluation (shims bind against it as they load); mutated only by
 * {@link setActiveStyle}.
 */
let currentStyle: RegistryStyle = readStoredStyle()

/**
 * The style whose module exports the shims currently expose. Read at shim
 * evaluation time and on every rebinding.
 */
export const activeRegistryStyle = (): RegistryStyle => currentStyle

/**
 * Reloaders registered by generated shims: each reassigns its live exports
 * from the tree matching {@link activeRegistryStyle}.
 */
const styleReloaders: Array<() => void> = []

export const registerStyleReloader = (reloader: () => void): void => {
  styleReloaders.push(reloader)
}

/**
 * Switches the active style: persists the preference, flips the pointer, and
 * rebinds every shim export. Synchronous by contract — the caller's view
 * re-render must observe the rebound exports.
 */
export const setActiveStyle = (style: RegistryStyle): void => {
  if (style === currentStyle) return
  currentStyle = style
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STYLE_STORAGE_KEY, style)
  }
  for (const reloader of styleReloaders) reloader()
}

/** Human-facing label shown in the demo's style picker. */
export const styleLabel = (style: RegistryStyle): string => style
