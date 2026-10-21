/**
 * # Database
 *
 * Provides database schema, migrations, and connection management
 * using Drizzle ORM with Effect integration.
 */

// Restored runtime exports use legacy-schema. New schema: @urm/database/schema.
export {
    schema,
    relations,
    PgClientLive,
    DB as DBLegacy,
    DatabaseLive as DatabaseLiveLegacy,
    DatabaseMock,
} from "./layer.ts"
export type { LoggerStrategy } from "./logger.ts"
export {
    DatabaseOperationError,
    databaseOperationError,
} from "./database-operation-error.ts"
export {
    DefaultLoggerConfig,
    DevelopmentLoggerConfig,
    LoggerConfigs,
} from "./logger.ts"
export {
    MigrationError,
    MigratorService,
    migrator,
    getMigrationStatus,
    rollbackMigration,
} from "./migrator.ts"
export {
    MigratorLive,
    MigratorTest,
    makeMigratorLive,
    type MigratorLiveOptions,
} from "./services/migrator-live.ts"
export {
    fromFileSystem,
    fromGlob,
    MigrationLoaderError,
    type MigrationData,
} from "./services/migrator-loader.ts"
export type { Migrator } from "./migrator.ts"

// Environment-aware migrations
export {
    MigratorEnvironmentLive,
    makeMigratorLiveFromConfig,
    getMigrationStrategy,
    type MigrationStrategy,
} from "./services/migrator-environment.ts"

// Environment-aware logging
export {
    getLoggingConfig,
    createLoggerLayer,
    logQuery,
    logConnectionEvent,
    withLogging,
    type LoggingConfig,
} from "./services/database-logger.ts"

// Database service definition
export {
    DB,
    DatabaseSelectorError,
    type DBShape,
} from "./services/database-service.ts"

// Environment-aware database layers
export {
    DatabaseLive,
    DatabaseDemoLive,
    makeDatabaseLiveFromUrl,
} from "./services/database-selector.ts"

export {
    demo_workspace_lifetime_ms,
    demo_workspace_expired_retention_ms,
    demo_workspace_scenarios,
    expireDemoWorkspaces,
    purgeExpiredDemoWorkspaces,
    resetDemoWorkspace,
    DemoWorkspaceProvisioning,
    DemoWorkspaceProvisioningError,
    DemoWorkspaceProvisioningLive,
    provisionDemoWorkspace,
    type DemoWorkspaceScenario,
    type DemoWorkspaceProvisioningType,
    type DemoWorkspaceProvisionOptions,
    type ProvisionedDemoWorkspace,
} from "./services/demo-workspace-provisioning.ts"

// Individual environment layers (for explicit control)
export {
    makeDatabaseDevLive,
    makePgClientDev,
} from "./services/database-dev.ts"

export {
    makeDatabaseStageLive,
    makePgClientStage,
} from "./services/database-stage.ts"

export {
    makeDatabaseProdLive,
    makePgClientProd,
} from "./services/database-prod.ts"

// Demo database seeding utilities
export {
    addDemoData,
    addDemoDataPreset,
    clearDemoData,
    countDemoRows,
    generateFakeContact,
    generateFakeContacts,
    generateFakeTodoItem,
    generateFakeTodos,
    MAX_DEMO_ROWS,
    BATCH_SIZE,
    INSERT_AMOUNTS,
} from "./seeds/demo-seed.ts"

// Build-time schema introspection (no connection side effects when
// imported via the `@urm/database/introspection` subpath)
export {
    schema_overview,
    type ColumnOverview,
    type IndexOverview,
    type TableOverview,
} from "./introspection.ts"

// Environment configuration exports
export type {
    Environment,
    EnvironmentConfig,
    ConfigError,
    PoolConfig,
    DatabaseConfig,
} from "./config/index.ts"

export {
    validateEnvironment,
    getDatabaseUrlEnvVar,
    loadEnvironmentConfig,
    getDemoDatabaseUrl,
    validateAllEnvVars,
    getPoolConfig,
    getPoolConfigSafe,
    getDatabaseConfig,
} from "./config/index.ts"
