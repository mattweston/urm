export {
    DEFAULT_TAG_COLOR,
    Model,
    TAG_COLOR_OPTIONS,
} from "./platform/app.model.ts"
export type { Model as ModelType } from "./platform/app.model.ts"
export {
    CreatedTag,
    CreateTagFailed,
    DirectoryTagSyncFailed,
    DeletedTag,
    DeleteTagFailed,
    FailedLoadingTags,
    LoadedTags,
    Message,
    SavedTagEdits,
    SyncedDirectoryTags,
    TagEditsSaveFailed,
} from "./platform/app.message.ts"
export type { Message as MessageType } from "./platform/app.message.ts"
export { init, update } from "./platform/app.update.ts"
export { submodelView as view } from "./platform/app.view.ts"
export { EntityTag, Tag } from "@urm/domain/schemas/tags"
export type {
    EntityTag as EntityTagType,
    Tag as TagType,
} from "@urm/domain/schemas/tags"

export const isAppScope = (pathname: string) =>
    pathname === "/tags" || pathname.startsWith("/tags/")
