export {
    CreateEntityTagInput,
    CreateTagInput,
    EntityTag,
    SetTagsForEntityInput,
    Tag,
    UpdateTagInput,
    ConflictError,
    DatabaseError,
    NotFoundError,
    ValidationError,
} from "@urm/domain/schemas/tags"

export {
    EntityTagsCreateRpc,
    EntityTagsDeleteRpc,
    EntityTagsListRpc,
    EntityTagsSetRpc,
    TagsCreateRpc,
    TagsDeleteRpc,
    TagsGetRpc,
    TagsListRpc,
    TagsRpcs,
    TagsUpdateRpc,
} from "./routes.ts"

export type { EntityTagsApi, TagsApi } from "../services/tags.ts"
export type {
    EntityTagsRepositoryType,
    TagsRepositoryType,
} from "../repositories/tags.ts"
