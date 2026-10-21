import { ChatRepositoryLive } from "./handlers/chat/repository.ts"
import { SubscriptionsRepositoryLive } from "./handlers/mail/repository.ts"
import { ProjectsLibraryRepositoryLive } from "./handlers/projects/postgres-repository.ts"
import { IssuesLibraryRepositoryLive } from "./handlers/issues/postgres-repository.ts"
import { EventsLibraryRepositoryLive } from "./handlers/events/postgres-repository.ts"
import { SubdomainsRepositoryLive } from "./handlers/subdomains/repository.ts"
import { PublicationConfigurationRepositoryLive } from "./handlers/publication-config/repository.ts"
import { Layer } from "effect"
import { ContactsRepositoryLive } from "./handlers/contacts/repository.ts"
import { MembersRepositoryLive } from "./handlers/members/repository.ts"
import { MediaRepositoryLive } from "./handlers/media/repository.ts"
import { TagsRepositoryLive } from "./handlers/tags/repository.ts"
import { BookmarksRepositoryLive } from "./handlers/bookmarks/repository.ts"
import { DocumentsRepositoryLive } from "./handlers/documents/repository.ts"
import { PublishingRepositoryLive } from "./handlers/publishing/repository.ts"
import { PagesRepositoryLive } from "./handlers/pages/repository.ts"
import { BlogRepositoryLive } from "./handlers/blog/repository.ts"
import { ShopCatalogRepositoryLive } from "./handlers/shop/catalog-repository.ts"
import { ShopCartRepositoryLive } from "./handlers/shop/cart-repository.ts"
import { ShopOrderRepositoryLive } from "./handlers/shop/order-repository.ts"
import { ShopPaymentRepositoryLive } from "./handlers/shop/payment-repository.ts"
import { DataRepositoryLive } from "./handlers/data/repository.ts"
import { FormsRepositoryLive } from "./handlers/forms/repository.ts"
import { LandingTemplatesRepositoryLive } from "./handlers/landing-templates/repository.ts"
import { LogoDraftRepositoryLive } from "./handlers/logo-drafts/repository.ts"
import { AccountPreferencesRepositoryLive } from "./handlers/account-preferences/repository.ts"
import { SysadminSessionsRepositoryLive } from "./handlers/sysadmin/account-sessions.ts"
import { SysadminTelemetryRepositoryLive } from "./handlers/sysadmin/account-telemetry.ts"
import { SysadminTelemetryWriterLive } from "./handlers/sysadmin/telemetry-write.ts"
import { SocialRepositoryLive } from "./handlers/social/repository.ts"

export const RepositoriesLive = Layer.mergeAll(
    ChatRepositoryLive,
    SubscriptionsRepositoryLive,
    EventsLibraryRepositoryLive,
    IssuesLibraryRepositoryLive,
    ProjectsLibraryRepositoryLive,
    SubdomainsRepositoryLive,
    ContactsRepositoryLive,
    MembersRepositoryLive,
    MediaRepositoryLive,
    TagsRepositoryLive,
    BookmarksRepositoryLive,
    DocumentsRepositoryLive,
    BlogRepositoryLive,
    ShopCatalogRepositoryLive,
    ShopCartRepositoryLive,
    ShopOrderRepositoryLive,
    ShopPaymentRepositoryLive,
    DataRepositoryLive,
    FormsRepositoryLive,
    LandingTemplatesRepositoryLive,
    LogoDraftRepositoryLive,
    AccountPreferencesRepositoryLive,
    SysadminSessionsRepositoryLive,
    SysadminTelemetryRepositoryLive,
    SysadminTelemetryWriterLive,
    SocialRepositoryLive,
    PagesRepositoryLive,
    PublicationConfigurationRepositoryLive.pipe(
        Layer.provide(PagesRepositoryLive)
    ),
    PublishingRepositoryLive.pipe(Layer.provide(PagesRepositoryLive))
)
