import { Layer } from "effect"
import { ChatRpcs, ChatThreadRpcs } from "@urm/contracts/chat-bkup"
// import { DocsRpcs } from "@urm/contracts/docs";
import { CsvRpcs } from "@urm/contracts/csv"
import { DocumentsRpcs } from "@urm/contracts/documents-legacy"
import { DomainsRpcs } from "@urm/contracts/domains"
import { DemoWorkspaceRpcs } from "@urm/contracts/demo-workspaces"
import { EventMenuItemsRpcs, EventsRpcs } from "@urm/contracts/events"
import { IssuesRpcs } from "@urm/contracts/issues"
import { MailRpcs } from "@urm/contracts/mail"
import { OrganisationsRpcs } from "@urm/contracts/organisations"
import { SettingsRpcs } from "@urm/contracts/settings"
import { ShopRpcs } from "@urm/contracts/shop"
import { AuditRpcs } from "@urm/contracts/audit"
import { ObservabilityLogRpcs } from "@urm/contracts/observability-log"
import { StudioRpcs } from "@urm/contracts/sysadmin"
import { TasksRpcs } from "@urm/contracts/tasks"
import { WeatherRpcs } from "@urm/contracts/events/weather"
import {
    DatabaseLive,
    DemoWorkspaceProvisioningLive,
    MigratorLive,
} from "@urm/database"
import { AuthConfigLive, ServerConfigLive } from "@urm/env/server"
import { DeliveryPersistenceLive, EmailSqlLive } from "@urm/email/postgres"
import {
    ChatRepositoryLive,
    ChatRpcLive,
    ChatThreadRpcLive,
} from "@urm/rpc/handlers/chat-bkup"
// import { DocsRpcLive } from "@urm/rpc/handlers/docs";
import {
    CsvDataRepositoryLive,
    CsvRpcLive,
    CsvUploadsRepositoryLive,
} from "@urm/rpc/handlers/csv"
import {
    DocumentsRepositoryLive,
    DocumentsRpcLive,
} from "@urm/rpc/handlers/documents-legacy"
import {
    DomainsRepositoryLive,
    DomainsRpcLive,
} from "@urm/rpc/handlers/domains"
import { DemoWorkspaceRpcLive } from "@urm/rpc/handlers/demo-workspaces"
import {
    EventMenuItemsRepositoryLive,
    EventMenuItemsRpcLive,
    EventsRepositoryLive,
    EventsRpcLive,
} from "@urm/rpc/handlers/events"
import { IssuesRepositoryLive, IssuesRpcLive } from "@urm/rpc/handlers/issues"
import { MailRpcLive } from "@urm/rpc/handlers/mail"
import { OrganisationsRpcLive } from "@urm/rpc/handlers/organisations"
import {
    MarketingAppearanceRepositoryLive,
    PreferencesRepositoryLive,
    SettingsRpcLive,
} from "@urm/rpc/handlers/settings"
import { ShopRpcLive } from "@urm/rpc/handlers/shop"
import {
    TasksRpcLive,
    TodoListItemsRepositoryLive,
} from "@urm/rpc/handlers/tasks"
import { WeatherRpcLive } from "@urm/rpc/handlers/events/weather"
import { AuditRpcLive } from "@urm/rpc/handlers/audit"
import { ObservabilityLogRpcLive } from "@urm/rpc/handlers/observability-log"
import {
    StudioRpcLive,
    StudioOrganisationRpcLive,
} from "@urm/rpc/handlers/sysadmin"
import {
    AppActiveDomainRpcMiddlewareLive,
    AppRpcAuthMiddlewareLive,
    DomainManagerRpcMiddlewareLive,
    PlatformAdminRpcMiddlewareLive,
    PublicWorkerRpcMiddlewareLive,
    RpcAuthorizationPersistenceLive,
} from "@urm/rpc/handlers"
import {
    ObservabilitySpanPersistenceLive,
    ObservabilityTracerLive,
} from "@urm/auth/observability-spans"
import { AuditEventPersistenceLive } from "@urm/auth/audit-events"
import { AuthPersistenceLive } from "@urm/auth/auth-persistence"
import {
    ObservabilityLoggerLive,
    ObservabilityLogPersistenceLive,
} from "@urm/auth/observability-logs"
import { RpcErrorLogMiddleware } from "./error-log.ts"
import { RuntimeEmailTransportLive } from "../runtime-email-transport.ts"
import { RuntimeUrmbotLanguageModelLive } from "../runtime-urmbot-language-model.ts"

// const DocsChatRpcs = DocsRpcs.omit(
//     "docs.list_topics",
//     "docs.get_topic",
//     "docs.list_bookmarks",
//     "docs.create_bookmark",
//     "docs.delete_bookmark",
//     "docs.list_notes",
//     "docs.create_note",
//     "docs.update_note",
//     "docs.delete_note",
// )

export const AppRpcs = EventsRpcs.merge(EventMenuItemsRpcs)
    .merge(WeatherRpcs)
    .merge(DemoWorkspaceRpcs)
    .merge(DomainsRpcs)
    .merge(DocumentsRpcs)
    .merge(MailRpcs)
    .merge(OrganisationsRpcs)
    .merge(IssuesRpcs)
    .merge(TasksRpcs)
    .merge(SettingsRpcs)
    .merge(ChatRpcs)
    .merge(ChatThreadRpcs)
    .merge(CsvRpcs)
    .merge(ShopRpcs)
    .merge(AuditRpcs)
    .merge(ObservabilityLogRpcs)
    .merge(StudioRpcs)
    .middleware(RpcErrorLogMiddleware)

export const ObservabilityLoggerWired = ObservabilityLoggerLive.pipe(
    Layer.provide(
        ObservabilityLogPersistenceLive.pipe(Layer.provide(DatabaseLive))
    )
)

const AppHandlersLayer = Layer.mergeAll(
    AuditRpcLive,
    ObservabilityLogRpcLive,
    StudioRpcLive,
    StudioOrganisationRpcLive,
    ObservabilityTracerLive.pipe(
        Layer.provide(ObservabilitySpanPersistenceLive)
    ),
    ObservabilityLoggerWired,
    //  DocsRpcLive.pipe(Layer.provide(DocsLanguageModelLive)),
    EventsRpcLive,
    EventMenuItemsRpcLive,
    WeatherRpcLive.pipe(
        Layer.provide(AuthPersistenceLive.pipe(Layer.provide(DatabaseLive)))
    ),
    DemoWorkspaceRpcLive.pipe(
        Layer.provide(AuthPersistenceLive.pipe(Layer.provide(DatabaseLive))),
        Layer.provide(DemoWorkspaceProvisioningLive)
    ),
    DomainsRpcLive,
    DocumentsRpcLive,
    MailRpcLive.pipe(
        Layer.provide(AuthPersistenceLive.pipe(Layer.provide(DatabaseLive)))
    ),
    OrganisationsRpcLive.pipe(
        Layer.provide(
            AuditEventPersistenceLive.pipe(Layer.provide(DatabaseLive))
        )
    ),
    IssuesRpcLive,
    TasksRpcLive,
    SettingsRpcLive,
    ChatRpcLive,
    ChatThreadRpcLive.pipe(
        Layer.provide(RuntimeUrmbotLanguageModelLive),
        Layer.provide(AuthPersistenceLive.pipe(Layer.provide(DatabaseLive)))
    ),
    CsvRpcLive,
    ShopRpcLive.pipe(
        Layer.provide(AuthPersistenceLive.pipe(Layer.provide(DatabaseLive)))
    ),
    MigratorLive
)
    .pipe(
        Layer.provide(EventsRepositoryLive),
        Layer.provide(EventMenuItemsRepositoryLive),
        Layer.provide(DocumentsRepositoryLive),
        Layer.provide(DomainsRepositoryLive),
        Layer.provide(IssuesRepositoryLive),
        Layer.provide(TodoListItemsRepositoryLive),
        Layer.provide(PreferencesRepositoryLive),
        Layer.provide(MarketingAppearanceRepositoryLive),
        Layer.provide(ChatRepositoryLive),
        Layer.provide(CsvUploadsRepositoryLive),
        Layer.provide(CsvDataRepositoryLive),
        Layer.provide(RuntimeEmailTransportLive),
        Layer.provide(DeliveryPersistenceLive),
        Layer.provide(EmailSqlLive.pipe(Layer.provide(DatabaseLive))),
        Layer.provide(ServerConfigLive)
    )
    .pipe(Layer.provide(DatabaseLive))

const AppRpcAuthMiddlewareWired = AppRpcAuthMiddlewareLive.pipe(
    Layer.provide(AuditEventPersistenceLive.pipe(Layer.provide(DatabaseLive))),
    Layer.provide(AuthConfigLive),
    Layer.provide(ServerConfigLive),
    Layer.provide(DatabaseLive)
)

const AppActiveDomainRpcMiddlewareWired = AppActiveDomainRpcMiddlewareLive.pipe(
    Layer.provide(AuthConfigLive),
    Layer.provide(ServerConfigLive),
    Layer.provide(DatabaseLive)
)

const PublicWorkerRpcMiddlewareWired = PublicWorkerRpcMiddlewareLive.pipe(
    Layer.provide(AuthConfigLive)
)

const PlatformAdminRpcMiddlewareWired = PlatformAdminRpcMiddlewareLive.pipe(
    Layer.provide(
        RpcAuthorizationPersistenceLive.pipe(Layer.provide(DatabaseLive))
    )
)

const DomainManagerRpcMiddlewareWired = DomainManagerRpcMiddlewareLive.pipe(
    Layer.provide(
        RpcAuthorizationPersistenceLive.pipe(Layer.provide(DatabaseLive))
    )
)

export const AppLayer = Layer.mergeAll(
    AppHandlersLayer,
    AppActiveDomainRpcMiddlewareWired,
    PublicWorkerRpcMiddlewareWired,
    AppRpcAuthMiddlewareWired,
    DomainManagerRpcMiddlewareWired,
    PlatformAdminRpcMiddlewareWired
)
