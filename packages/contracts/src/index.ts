/**
 * # Contracts
 *
 * The package's public surface. The commented-out blocks below reference
 * modules that no longer exist (src/docs/, src/example-todo/) — they are a
 * record of what was removed, not a switch that can be flipped.
 */

export { AppRpc } from "./app/index.ts"
export {
    DemoWorkspaceProvisionRpc,
    DemoWorkspaceRpcs,
} from "./demo-workspaces/index.ts"
export {
    OrganisationMember,
    OrganisationRole,
    OrganisationsAcceptInvitationRpc,
    OrganisationsInviteMemberRpc,
    OrganisationsListMembersRpc,
    OrganisationsRpcs,
    OrganisationsUpdateMemberRpc,
} from "./organisations/index.ts"
export {
    AuthResponse,
    AuthSession,
    AuthContact,
    AuthCurrentDomain,
    AuthPlatformAdmin,
    CredentialsLoginInput,
    CredentialsSignUpInput,
    hasRoleOrHigher,
} from "./auth-legacy/index.ts"
export {
    ChatRpcs,
    MessagesListRpc,
    MessagesSendRpc,
} from "./chat-bkup/index.ts"
export { MailNewsletterSendRpc, MailRpcs } from "./mail/index.ts"
export {
    PlatformNewsletterRpcs,
    PlatformNewsletterSendRpc,
    PlatformNewsletterSubscribersListRpc,
    PlatformNewsletterSubscribersSetRpc,
} from "./platform-newsletter/index.ts"
export { MembersRemote } from "./members/index.ts"
export {
    ImagesCreateRpc,
    ImagesDeleteRpc,
    ImagesGetRpc,
    ImagesListRpc,
    ImagesUpdateRpc,
    MediaRpcs,
} from "./media-legacy/index.ts"
export {
    CsvDataCreateRpc,
    CsvDataDeleteRpc,
    CsvDataGetByUploadRpc,
    CsvRpcs,
    CsvUploadsCreateRpc,
    CsvUploadsDeleteRpc,
    CsvUploadsGetRpc,
    CsvUploadsListRpc,
    CsvUploadsUpdateRpc,
} from "./csv/index.ts"
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
} from "./tags-legacy/index.ts"
export { ContactsRemote } from "./contacts/index.ts"
export {
    DomainsAddAdminRpc,
    DomainsCreateRpc,
    DomainsDeleteRpc,
    DomainsGetAdminRoleRpc,
    DomainsGetRpc,
    DomainsListAdminsRpc,
    DomainsListRpc,
    DomainsRemoveAdminRpc,
    DomainsRpcs,
    DomainsUpdateAdminRoleRpc,
    DomainsUpdateRpc,
} from "./domains/index.ts"
export {
    EventMenuItemsCreateRpc,
    EventMenuItemsDeleteRpc,
    EventMenuItemsGetRpc,
    EventMenuItemsListRpc,
    EventMenuItemsRpcs,
    EventMenuItemsUpdateRpc,
    EventsCreateRpc,
    EventsDeleteRpc,
    EventsGetRpc,
    EventsListRpc,
    EventsRpcs,
    EventsUpdateRpc,
} from "./events/index.ts"
export {
    DocumentsCreateRpc,
    DocumentsDeleteRpc,
    DocumentsGetBySlugRpc,
    DocumentsGetRpc,
    DocumentsListBlogPostsRpc,
    DocumentsListRpc,
    DocumentsRpcs,
    DocumentsUpdateRpc,
    type DocumentsApi,
} from "./documents-legacy/index.ts"
// export { ExampleTodoRpc, ExampleTodoSchema, CreateExampleTodoPayloadSchema, ExampleTodoValidationError, type ExampleTodo } from "./example-todo/index.ts";
// export {
//     DocsAnimationStep,
//     DocsBlock,
//     DocsCalloutBlock,
//     DocsCalloutContentBlock,
//     DocsCalloutVariant,
//     DocsCodeBlock,
//     DocsDescriptionBlock,
//     DocsLink,
//     DocsLinksBlock,
//     DocsMarkdownBlock,
//     DocsAccessContext,
//     DocsAskRequest,
//     DocsAskResponse,
//     DocsAskRpc,
//     DocsBookmark,
//     DocsCreateBookmarkRpc,
//     DocsCreateNoteRpc,
//     DocsDeleteBookmarkRpc,
//     DocsDeleteNoteRpc,
//     DocsDomainAdminAccess,
//     DocsDomainMemberAccess,
//     DocsGetTopicRpc,
//     DocsListBookmarksRpc,
//     DocsListNotesRpc,
//     DocsListTopicsRpc,
//     DocsNote,
//     DocsPlatformAdminAccess,
//     DocsRenderRequest,
//     DocsRenderResponse,
//     DocsRenderRpc,
//     DocsRenderedStep,
//     DocsRpcs,
//     DocsStep,
//     DocsTopic,
//     DocsTopicFormat,
//     DocsTopicSummary,
//     DocsWidgetBlock,
//     DocsWidgetKind,
//     DocsUpdateNoteRpc,
// } from "./docs/index.ts";
export {
    SettingsRpcs,
    PreferencesGetByContactIdRpc,
    PreferencesSetThemeRpc,
} from "./settings/index.ts"
// export type { DocsApi } from "./docs/index.ts";
export {
    WeatherData,
    WeatherGetCurrentRpc,
    WeatherRpcs,
    WeatherUnavailableError,
    type WeatherData as WeatherDataType,
    type WeatherUnavailableError as WeatherUnavailableErrorType,
} from "./events/weather/index.ts"
export {
    ShopRpcs,
    ShopProductsListRpc,
    ShopProductsGetRpc,
    ShopCollectionsListRpc,
    ShopCartGetRpc,
    ShopCartAddRpc,
    ShopCartRemoveRpc,
    ShopCartUpdateRpc,
    ShopOrdersListRpc,
    ShopOrdersGetRpc,
} from "./shop/index.ts"
export type { SettingsApi } from "./services/settings/index.ts"
export type { PreferencesRepositoryType } from "./repositories/settings/index.ts"
export type { ContactsApi } from "./services/contacts/index.ts"
export type { ContactsRepositoryType } from "./repositories/contacts/index.ts"
export type { MembersApi } from "./services/members.ts"
export type { MembersRepositoryType } from "./repositories/members.ts"
export type { ImagesApi, ImagesRepositoryType } from "./media-legacy/index.ts"
export type { CsvDataApi, CsvUploadsApi } from "./csv/index.ts"
export type {
    CsvDataRepositoryType,
    CsvUploadsRepositoryType,
} from "./csv/index.ts"
export type { EntityTagsApi, TagsApi } from "./tags-legacy/index.ts"
export type {
    EntityTagsRepositoryType,
    TagsRepositoryType,
} from "./tags-legacy/index.ts"

export { ChatRepository, type ChatRepositoryType } from "./repositories/chat.ts"
// export {
//     ExampleTodoRepository,
//     type ExampleTodoRepositoryType,
// } from "./repositories/example-todo.ts";
export type { MessagesApi } from "./services/chat.ts"

export { RpcApi } from "./rpc/index.ts"

export { AccountDomain, AccountDomains } from "./auth/index.ts"

export { ChatRemote } from "./chat/index.ts"
export { SubscriptionsRemote } from "./mail/index.ts"
export { MediaRemote } from "./media/index.ts"
export { TagsRemote } from "./tags/index.ts"
export { BookmarksRemote } from "./bookmarks/index.ts"
