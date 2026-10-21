import { Effect } from "effect"
import { injectIntoTemplate } from "foldkit/experimental/server"
import type { RenderedApplication } from "foldkit/experimental/server"

import { DocumentAssemblyError } from "../errors.ts"

export const assembleDocument = (
    path: string,
    template: string,
    application: RenderedApplication
): Effect.Effect<string, DocumentAssemblyError> =>
    Effect.try({
        try: () => injectIntoTemplate(template, application),
        catch: (cause) => new DocumentAssemblyError({ path, cause }),
    })
