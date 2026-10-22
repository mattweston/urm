/**
 * Minimal structural shapes. Your real block union (Effect Schemas shared with the
 * Foldkit admin) must be assignable to these.
 */
export interface BlockBase {
  readonly type: string
  readonly id: string
  readonly props: unknown
}

export type PageMode = "ssg" | "ssr"

export interface PageBase<B extends BlockBase = BlockBase> {
  readonly route: string
  readonly title: string
  /** Defaults to "ssg". "ssr" pages are never written to disk by the build. */
  readonly mode?: PageMode
  readonly blocks: ReadonlyArray<B>
}

/** Opaque handle to a template. `id` is whatever your TemplateLoader understands (a path, a bundle key). */
export interface TemplateRef {
  readonly id: string
}

/**
 * One template per block type. Keyed on the block union's `type`, so adding a block
 * schema without a template is a compile error.
 */
export type Registry<B extends BlockBase> = {
  readonly [T in B["type"]]: TemplateRef
}
