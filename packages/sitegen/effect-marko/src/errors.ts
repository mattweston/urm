import { Data } from "effect"

/** A template could not be loaded (compile failure, missing module, bad export shape). */
export class TemplateLoadError extends Data.TaggedError("TemplateLoadError")<{
  readonly template: string
  readonly cause: unknown
}> {}

/** A loaded template threw while rendering. */
export class RenderError extends Data.TaggedError("RenderError")<{
  readonly template: string
  readonly cause: unknown
}> {}

/** A block's `type` has no entry in the registry. */
export class UnknownBlockType extends Data.TaggedError("UnknownBlockType")<{
  readonly blockType: string
  readonly blockId: string
}> {}

export class StoreError extends Data.TaggedError("StoreError")<{
  readonly cause: unknown
}> {}

export class OutputError extends Data.TaggedError("OutputError")<{
  readonly path: string
  readonly cause: unknown
}> {}
