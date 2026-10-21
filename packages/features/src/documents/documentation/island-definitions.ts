import { Schema as S } from "effect"

import { documentationStaticIslandDefinitions } from "./static-island-definitions.ts"
import { documentationInteractiveIslandDefinitions } from "./interactive-island-definitions.ts"

export const documentationIslandDefinitions = {
    ...documentationStaticIslandDefinitions,
    ...documentationInteractiveIslandDefinitions,
    TabsDemo: S.Struct({}),
}
