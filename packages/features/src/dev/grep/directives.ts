import { documentationStaticIslandDefinitions } from "../../documents/documentation/static-island-definitions.ts"
import { documentationInteractiveIslandDefinitions } from "../../documents/documentation/interactive-island-definitions.ts"

export const grep_directives = {
    Callout: documentationStaticIslandDefinitions.Callout,
    Steps: documentationStaticIslandDefinitions.Steps,
    Tabs: documentationInteractiveIslandDefinitions.Tabs,
    TabItem: documentationInteractiveIslandDefinitions.TabItem,
    CodeTabs: documentationInteractiveIslandDefinitions.CodeTabs,
}
