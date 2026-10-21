/**
 * # @urm/rpc
 *
 * Package interface for the RPC handler layer: the Live layers each app
 * composes into its RPC router. Deep imports into `./handlers/*` remain
 * available for group-scoped wiring; new consumers should prefer this
 * surface.
 */

export { AuditRpcLive } from "./handlers/audit/index.ts"
export {
    ChatRepositoryLive,
    ChatRpcHandlersTagLive,
    ChatRpcLive,
    ChatThreadRpcHandlersTagLive,
    ChatThreadRpcLive,
    UrmbotLanguageModelLive,
} from "./handlers/chat-bkup/index.ts"
export {
    ContactsServer,
    contacts_remote_handlers,
} from "./handlers/contacts/index.ts"
export {
    CsvDataRepositoryLive,
    CsvRpcHandlersTagLive,
    CsvRpcLive,
    CsvUploadsRepositoryLive,
} from "./handlers/csv/index.ts"
export {
    DocumentsRepositoryLive,
    DocumentsRpcHandlersTagLive,
    DocumentsRpcLive,
} from "./handlers/documents-legacy/index.ts"
export {
    DomainsRepositoryLive,
    DomainsRpcHandlersTagLive,
    DomainsRpcLive,
} from "./handlers/domains/index.ts"
export {
    EventMenuItemsRepositoryLive,
    EventMenuItemsRpcHandlersTagLive,
    EventMenuItemsRpcLive,
    EventsRepositoryLive,
    EventsRpcHandlersTagLive,
    EventsRpcLive,
    findPublishedEventImageUrl,
} from "./handlers/events/index.ts"
export {
    IssueLabelsRepositoryLive,
    IssueLabelsRpcHandlersTagLive,
    IssueLabelsRpcLive,
    IssuesRepositoryLive,
    IssuesRpcHandlersTagLive,
    IssuesRpcLive,
} from "./handlers/issues/index.ts"
export { MailRpcHandlersTagLive, MailRpcLive } from "./handlers/mail/index.ts"
export {
    ImagesRepositoryLive,
    MediaRpcHandlersTagLive,
    MediaRpcLive,
    findPublicGalleryImageUrl,
} from "./handlers/media-legacy/index.ts"
export {
    MembersServer,
    members_remote_handlers,
} from "./handlers/members/index.ts"
export {
    AppActiveDomainRpcMiddlewareLive,
    AppRpcAuthMiddlewareLive,
    RpcAuthorizationPersistenceLive,
} from "./handlers/middleware/index.ts"
export { ObservabilityLogRpcLive } from "./handlers/observability-log/index.ts"
export {
    MarketingAppearanceRepositoryLive,
    PreferencesRepositoryLive,
    SettingsRpcHandlersTagLive,
    SettingsRpcLive,
} from "./handlers/settings/index.ts"
export {
    ShopRpcHandlersTagLive,
    ShopRpcLive,
    findPublicProductImageUrl,
} from "./handlers/shop/index.ts"
export {
    StudioRpcLive,
    StudioOrganisationRpcLive,
} from "./handlers/sysadmin/index.ts"
export { OrganisationsRpcLive } from "./handlers/organisations/index.ts"
export {
    EntityTagsRepositoryLive,
    TagsRepositoryLive,
    TagsRpcHandlersTagLive,
    TagsRpcLive,
} from "./handlers/tags-legacy/index.ts"
export {
    TasksRpcHandlersTagLive,
    TasksRpcLive,
    TodoListItemsRepositoryLive,
} from "./handlers/tasks/index.ts"
export { WeatherRpcLive } from "./handlers/events/weather/index.ts"

export { ChatServer } from "./handlers/chat/index.ts"
export { SubscriptionsServer } from "./handlers/mail/remote.ts"
export { MediaServer } from "./handlers/media/index.ts"
export { TagsServer } from "./handlers/tags/index.ts"
export { BookmarksServer } from "./handlers/bookmarks/index.ts"
