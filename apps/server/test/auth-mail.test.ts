import * as ProjectsBrowser from "../../client/src/projects/submodel.ts"
import * as ChatBrowser from "../../client/src/chat/submodel.ts"
import * as MailBrowser from "../../client/src/mail/submodel.ts"
import { Surface } from "foldkit-surface"
import type { SQL } from "drizzle-orm"
import { EmailTransport } from "@urm/email"
import { handleImageUrlRoute } from "../src/http/uploads.ts"
import {
    EMAIL_DELIVERY_RECOVERY_AGE_MS,
    EmailPersistenceError,
    EmailSql,
    dispatchPendingNewsletterSends,
    pollCloudflareEmailEvents,
    recordCloudflareDeliveryEvent,
    reconcileCloudflareDeliveryEvents,
    recoverStaleEmailDeliveries,
} from "@urm/email/postgres"
import { ServerConfig } from "@urm/env/server"
import { defineMessageUnion } from "foldkit/message"
import {
    DeleteNewsletterDraft,
    NewsletterCatalog,
    NewsletterSummary,
    NewsletterTemplateCatalog,
    NewsletterTemplateSummary,
    SaveNewsletterDraft,
    SaveNewsletterTemplate,
    SendNewsletter,
    ChangeTransactionalCopy,
    SendTransactionalEmail,
    TransactionalCatalog,
    TransactionalSummary,
} from "@urm/contracts/mail"
import { newsletter_catalog_id } from "@urm/domain/mail-newsletter"
import { transactional_catalog_id } from "@urm/domain/mail-transactional"
import {
    NewsletterImagePublishError,
    NewsletterImagePublisher,
} from "@urm/rpc/handlers/mail"
import {
    newsletter_template_catalog_id,
    type SaveNewsletterTemplateInput as SaveNewsletterTemplateType,
} from "@urm/domain/mail-templates"
import * as Subscriptions from "@urm/features/mail/subscriptions"
import * as Mail from "@urm/features/mail/submodel"
import * as SendFeature from "@urm/features/mail/send"
import * as ChatUi from "../../client/src/chat/chat-ui.ts"
import { ProjectAction } from "@urm/domain/projects"
import { ChangeProjects } from "@urm/contracts/projects"
import * as IssuesBrowser from "../../client/src/issues/submodel.ts"
import { IssueAction } from "@urm/domain/issues"
import { ChangeIssues } from "@urm/contracts/issues"
import * as SubdomainsBrowser from "../../client/src/domains/submodel.ts"
import * as EventsBrowser from "../../client/src/events/submodel.ts"
import * as ShopBrowser from "../../client/src/shop/submodel-postgres.ts"
import * as DataBrowser from "../../client/src/data/submodel.ts"
import * as FormsBrowser from "../../client/src/forms/submodel.ts"
import {
    load_catalog as load_forms_catalog,
    load_detail as load_form_detail,
} from "../../client/src/forms/api.ts"
import { FormsRepository } from "@urm/rpc/handlers/forms"
import { FormDefinition } from "@urm/domain/schemas/forms"
import type { FormsAction } from "@urm/domain/forms"
import * as FormsFeature from "@urm/features/forms/submodel"
import * as CsvDataFeature from "@urm/features/data/upload-csv"
import * as DataFeature from "@urm/features/data/submodel"
import * as ShopFeature from "@urm/features/shop/admin"
import { ShopPaymentRepository } from "@urm/rpc/handlers/shop"
import { DataRepository } from "@urm/rpc/handlers/data"
import type { DataAction } from "@urm/domain/data"
import { DataColumns } from "@urm/domain/schemas/data-tables"
import * as EventsFeature from "@urm/features/events/submodel"
import { ChangeSubdomains } from "@urm/contracts/subdomains"
import { ChangeEvents } from "@urm/contracts/events"
import type { EventAction } from "@urm/domain/events"
import type { SubdomainAction } from "@urm/domain/subdomains"
import {
    DeployDevelopment,
    PromotePublication,
    DeploySubdomain,
} from "@urm/contracts/publishing"
import { PreviewDeployer } from "@urm/ssg/preview-deployer"
import { PreviewDeploymentError } from "@urm/ssg/errors"
import { Scene } from "foldkit"
import type { HtmlBuilder } from "foldkit/html"
import {
    marketing_starter_landing_page,
    urm_marketing_landing_page,
} from "@urm/domain/landing-page-presets"
import * as LayoutBrowser from "../../client/src/design/layout-submodel.ts"
import { DomainId } from "../../client/src/domains/domain-record.ts"
import {
    build_publication,
    run_development_job,
    ReleaseAssetStorage,
    PublishingRepository,
} from "@urm/rpc/handlers/publishing"
import { PublishingError, ReleaseAssetSource } from "@urm/domain/publishing"
import { SiteBuildWriterLive } from "@urm/ssg/write-site-build"
import { SiteBuildManifest } from "@urm/domain/schemas/document-site-builds"
import { createHash } from "node:crypto"
import * as PagesBrowser from "../../client/src/design/pages-submodel.ts"
import * as PublishingBrowser from "../../client/src/domains/publishing-console.ts"
import { Url } from "foldkit/url"
import { RepositoriesLive } from "@urm/rpc/repositories"
import * as BlogBrowser from "../../client/src/blog/submodel.ts"
import * as BlogFeature from "@urm/features/blog/submodel"
import type { BlogAction } from "@urm/contracts/blog"
import * as DocumentsBrowser from "../../client/src/documents/submodel.ts"
import * as DocumentsFeature from "@urm/features/documents/submodel"
import type { DocumentAction } from "@urm/contracts/documents"
import {
    Remote,
    REMOTE_PROTOCOL_VERSION,
    type RemoteClient,
} from "foldkit-remote"
import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { ConfigProvider, Effect, Exit, Layer, Option, Schema } from "effect"
import { Email } from "@urm/domain/schemas/contacts"
import { Headers, HttpRouter } from "effect/unstable/http"
import { Rpc, RpcGroup, RpcMessage } from "effect/unstable/rpc"
import { AuthenticatedRpcMiddleware } from "@urm/contracts/auth"
import { authenticated_rpc_layer } from "@urm/rpc/auth"
import { randomUUID } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/db/sql"
import {
    authenticate_token,
    login_account,
    provision_account,
    revoke_token,
} from "@urm/auth"
import {
    UploadStorage,
    UploadError,
    handle_upload_request,
} from "@urm/http/uploads-web-handler"
import { UploadedImage, image_upload_limit } from "@urm/contracts/uploads"
import { handle_auth_request } from "@urm/http/auth-web-handler"
import { contacts_remote_handlers } from "@urm/rpc/handlers/contacts"
import {
    CreateRemoteContact,
    RenameRemoteContact,
    UpdateRemoteContact,
    DeleteRemoteContact,
    ImportRemoteContacts,
} from "@urm/contracts/contacts"
import { RpcApi } from "@urm/contracts/rpc"
import { api_request_layer } from "@urm/rpc/api"
import {
    rpc_http_layer,
    rpc_request_rejection,
    rpc_response,
} from "@urm/rpc/http"
import {
    CreateMember,
    UpdateMember,
    DeleteMember,
} from "@urm/contracts/members"
import { members_remote_handlers } from "@urm/rpc/handlers/members"
import * as BookmarksBrowser from "../../client/src/content/bookmarks-submodel.ts"
import type { BookmarkAction } from "@urm/contracts/bookmarks"
import * as TagsBrowser from "../../client/src/tags/submodel.ts"
import type { TagAction } from "@urm/contracts/tags"
import * as MediaBrowser from "../../client/src/media/submodel.ts"
import { type MediaAction } from "@urm/contracts/media"
import { api_handlers } from "@urm/rpc/api"
import * as MembersBrowser from "../../client/src/members/model.ts"
import * as MembersManage from "@urm/features/mail/members/manage"
import { contacts_client_layer } from "../scripts/contacts-client.ts"
import { browser_api, ContactsApi } from "../../client/src/contacts/api.ts"
import {
    initial as browser_initial,
    Message as BrowserMessage,
    update as browser_update,
    page as browser_page,
} from "../../client/src/contacts/model.ts"
import type { Model as BrowserModel } from "../../client/src/contacts/model.ts"
import {
    Data as BrowserData,
    contacts_page as searched_page,
} from "../../client/src/contacts/remote.ts"
import {
    ContactsApp,
    ContactsData,
    contacts_page,
} from "../scripts/contacts-model.ts"

afterEach(() => vi.unstubAllGlobals())
const pg = new PGlite()
const dialect = new PgDialect()
const make_sql = (in_transaction = false): SqlService => ({
    query: (statement) =>
        Effect.tryPromise({
            try: async () => {
                const compiled = dialect.sqlToQuery(statement)
                const result = await pg.query<Record<string, unknown>>(
                    compiled.sql,
                    compiled.params
                )
                // node-postgres returns raw int8 columns as strings; PGlite defaults to numbers.
                return result.rows.map((row) =>
                    Object.fromEntries(
                        Object.entries(row).map(([name, value]) => [
                            name,
                            result.fields.some(
                                (field) =>
                                    field.name === name &&
                                    field.dataTypeID === 20
                            ) && value !== null
                                ? String(value)
                                : value,
                        ])
                    )
                )
            },
            catch: () => new SqlError({ operation: "test_query" }),
        }),
    transaction: (effect) =>
        in_transaction
            ? effect
            : Effect.gen(function* () {
                  yield* Effect.promise(() => pg.exec("BEGIN"))
                  const result = yield* Effect.exit(
                      effect.pipe(Effect.provideService(Sql, make_sql(true)))
                  )
                  yield* Effect.promise(() =>
                      pg.exec(Exit.isSuccess(result) ? "COMMIT" : "ROLLBACK")
                  )
                  if (Exit.isFailure(result))
                      return yield* Effect.failCause(result.cause)
                  return result.value
              }),
})

describe("Data account cutover", () => {
    it("loads the Data UI and refreshes CSV uploads through account RPC", async () => {
        const owner = await seed("data-browser")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Data']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("data-browser")
        const cookie = `urm_account=${session.token}`
        const fetch_local: typeof fetch = async (input, init) => {
            const request = new Request(input, init)
            request.headers.set("cookie", cookie)
            return run(
                new URL(request.url).pathname.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "data-browser@example.com", password }),
            fetch_local
        )
        const [scoped, load_commands] = DataBrowser.synchronize(
            DataBrowser.init("/data/spreadsheets"),
            { domain_id: owner.domain_id, can_write: true }
        )
        const loaded_message = await Effect.runPromise(
            load_commands[0]!.effect.pipe(Effect.provide(layer))
        )
        const [loaded] = DataBrowser.update(scoped, loaded_message)
        expect(loaded.tables.loaded).toBe(true)
        expect(loaded.tables.can_write).toBe(true)
        const with_file = {
            ...loaded,
            csvUpload: {
                ...loaded.csvUpload,
                selectedUploadFiles: [
                    new File(["name\nAda"], "sample.csv", { type: "text/csv" }),
                ],
            },
        }
        const [, upload_commands] = DataBrowser.update(
            with_file,
            DataFeature.GotCsvUploadMessage({
                message: CsvDataFeature.ClickedUploadCsv(),
            })
        )
        expect(upload_commands.map((command) => command.name)).toEqual([
            "UploadDesktopCsv",
        ])
        const uploaded_message = await Effect.runPromise(
            upload_commands[0]!.effect.pipe(Effect.provide(layer))
        )
        expect(uploaded_message._tag).toBe("GotCsvUploadMessage")
        const [uploaded, reload_commands] = DataBrowser.update(
            with_file,
            uploaded_message
        )
        expect(reload_commands.map((command) => command.name)).toEqual([
            "LoadDataWorkspace",
        ])
        const reloaded_message = await Effect.runPromise(
            reload_commands[0]!.effect.pipe(Effect.provide(layer))
        )
        const [reloaded] = DataBrowser.update(uploaded, reloaded_message)
        expect(reloaded.csvUpload.uploads[0]?.filename).toBe("sample.csv")
    })

    it("keeps CSV imports and table edits in one workspace", async () => {
        const owner = await seed("data-postgres")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Data']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("data-postgres")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const change = (action: DataAction) =>
            run(
                Effect.flatMap(DataRepository, (repository) =>
                    repository.change(principal, action)
                )
            )
        const workspace = () =>
            run(
                Effect.flatMap(DataRepository, (repository) =>
                    repository.load_workspace(principal)
                )
            )
        const upload_id = randomUUID()
        const rows = [
            { name: "Ada", count: "3" },
            { name: "Bea", count: "4" },
        ]
        await change({
            _tag: "StoreCsv",
            id: upload_id,
            filename: "people.csv",
            rows,
        })
        await change({
            _tag: "StoreCsv",
            id: upload_id,
            filename: "people.csv",
            rows,
        })
        expect((await workspace()).uploads).toHaveLength(1)
        await expect(
            change({
                _tag: "StoreCsv",
                id: upload_id,
                filename: "people.csv",
                rows: [
                    { name: "Other", count: "3" },
                    { name: "Bea", count: "4" },
                ],
            })
        ).rejects.toMatchObject({ _tag: "DataWriteError" })
        const table_id = randomUUID()
        const columns: typeof DataColumns.Type = [
            {
                key: "name",
                name: "Name",
                type: "text",
                required: true,
                choices: [],
                default_value: "",
            },
            {
                key: "count",
                name: "Count",
                type: "number",
                required: true,
                choices: [],
                default_value: "",
            },
        ]
        await change({
            _tag: "CreateTable",
            id: table_id,
            name: "People",
            columns,
        })
        await expect(
            change({
                _tag: "CreateTable",
                id: randomUUID(),
                name: "people",
                columns,
            })
        ).rejects.toMatchObject({
            message: "A table with this name already exists",
        })
        await change({
            _tag: "CreateTable",
            id: table_id,
            name: "People",
            columns,
        })
        const row_ids = [randomUUID(), randomUUID()]
        await change({
            _tag: "AppendRows",
            table_id,
            schema_revision: 1,
            rows,
            row_ids,
            upload_id,
        })
        await change({
            _tag: "AppendRows",
            table_id,
            schema_revision: 1,
            rows,
            row_ids,
            upload_id,
        })
        await expect(
            change({
                _tag: "AppendRows",
                table_id,
                schema_revision: 1,
                rows: [
                    { name: "Other", count: "3" },
                    { name: "Bea", count: "4" },
                ],
                row_ids,
                upload_id,
            })
        ).rejects.toMatchObject({ _tag: "DataWriteError" })
        const stored = await run(
            Effect.flatMap(DataRepository, (repository) =>
                repository.load_table_rows(principal, table_id)
            )
        )
        expect(stored.rows).toHaveLength(2)
        expect(stored.rows[0]?.values).toEqual({ name: "Ada", count: 3 })
        const first = stored.rows[0]
        if (!first) throw new Error("Expected first row")
        await change({
            _tag: "UpdateRow",
            table_id,
            row_id: first.id,
            schema_revision: 1,
            row_revision: 1,
            values: { name: "Ada", count: "5" },
        })
        await expect(
            change({
                _tag: "UpdateRow",
                table_id,
                row_id: first.id,
                schema_revision: 1,
                row_revision: 1,
                values: { name: "Ada", count: "6" },
            })
        ).rejects.toMatchObject({ _tag: "DataWriteError" })
        const added_row_ids = [randomUUID()]
        const add_row: DataAction = {
            _tag: "AppendRows",
            table_id,
            schema_revision: 1,
            rows: [{ name: "Dee", count: "7" }],
            row_ids: added_row_ids,
        }
        await change(add_row)
        await change(add_row)
        expect((await workspace()).tables[0]?.row_count).toBe(3)
        await expect(
            change({ _tag: "DeleteCsv", id: upload_id })
        ).rejects.toMatchObject({ _tag: "DataWriteError" })
        const contacts_upload_id = randomUUID()
        await change({
            _tag: "StoreCsv",
            id: contacts_upload_id,
            filename: "contacts.csv",
            rows: [{ name: "Cee" }],
        })
        await pg.query(
            "INSERT INTO contact_import_receipts (domain_id,source_id,payload_hash,imported,account_id,completed_at) VALUES ($1,$2,'test-hash',1,$3,$4)",
            [
                owner.domain_id,
                `postgres:${contacts_upload_id}`,
                owner.account_id,
                Date.now(),
            ]
        )
        await change({
            _tag: "RecordContactImport",
            upload_id: contacts_upload_id,
        })
        await change({
            _tag: "RecordContactImport",
            upload_id: contacts_upload_id,
        })
        expect(
            (await workspace()).uploads.find(
                (upload) => upload.id === contacts_upload_id
            )?.imports
        ).toHaveLength(1)
        await expect(
            change({ _tag: "DeleteCsv", id: contacts_upload_id })
        ).rejects.toMatchObject({ _tag: "DataWriteError" })
        const other = await seed("data-postgres-other")
        await expect(
            pg.query(
                "INSERT INTO csv_data (id,domain_id,upload_id,row_index,data,updated_at) VALUES ($1,$2,$3,9,'{}',1)",
                [randomUUID(), other.domain_id, upload_id]
            )
        ).rejects.toMatchObject({ code: "23503" })
        await expect(
            run(
                Effect.flatMap(DataRepository, (repository) =>
                    repository.load_table_rows(
                        { ...principal, domain_id: other.domain_id },
                        table_id
                    )
                )
            )
        ).rejects.toMatchObject({ _tag: "AuthError" })
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await workspace()).can_write).toBe(false)
        await expect(
            change({
                _tag: "CreateTable",
                id: randomUUID(),
                name: "Denied",
                columns,
            })
        ).rejects.toMatchObject({ _tag: "AuthError" })
    })
})

describe("Forms account cutover", () => {
    it("creates forms and organization templates through browser commands and account RPC", async () => {
        const owner = await seed("forms-browser")
        const session = await login("forms-browser")
        const cookie = `urm_account=${session.token}`
        const fetch_local: typeof fetch = async (input, init) => {
            const request = new Request(input, init)
            request.headers.set("cookie", cookie)
            return run(
                new URL(request.url).pathname.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "forms-browser@example.com", password }),
            fetch_local
        )
        const initial = await Effect.runPromise(
            load_forms_catalog(owner.domain_id).pipe(Effect.provide(layer))
        )
        expect(initial.forms).toEqual([])
        const [empty] = FormsBrowser.init("/forms")
        const [creating] = FormsBrowser.update(
            empty,
            FormsFeature.ToggledCreating(),
            Option.some(Schema.decodeUnknownSync(DomainId)(owner.domain_id))
        )
        const [named] = FormsBrowser.update(
            creating,
            FormsFeature.ChangedNewTitle({ value: "Feedback" }),
            Option.some(Schema.decodeUnknownSync(DomainId)(owner.domain_id))
        )
        const [, commands] = FormsBrowser.update(
            named,
            FormsFeature.SubmittedNewForm(),
            Option.some(Schema.decodeUnknownSync(DomainId)(owner.domain_id))
        )
        expect(commands.map((command) => command.name)).toEqual(["CreateForm"])
        const created = await Effect.runPromise(
            commands[0]!.effect.pipe(Effect.provide(layer))
        )
        expect(created._tag).toBe("FormCreated")
        const catalog = await Effect.runPromise(
            load_forms_catalog(owner.domain_id).pipe(Effect.provide(layer))
        )
        expect(catalog.forms.map((form) => form.slug)).toEqual(["feedback"])
        const detail = await Effect.runPromise(
            load_form_detail(owner.domain_id, "feedback").pipe(
                Effect.provide(layer)
            )
        )
        expect(detail.form?.id).toBe(catalog.forms[0]?.id)
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const change = (action: FormsAction) =>
            run(
                Effect.flatMap(FormsRepository, (repository) =>
                    repository.change(principal, action)
                )
            )
        const fields = Schema.decodeUnknownSync(FormDefinition)([
            {
                id: "email",
                kind: "email",
                name: "email",
                label: "Email",
                description: "",
                placeholder: "you@example.com",
                required: true,
                options: [],
            },
        ])
        await change({
            _tag: "SaveDefinition",
            form_id: catalog.forms[0]!.id,
            fields,
        })
        expect(
            (
                await Effect.runPromise(
                    load_form_detail(owner.domain_id, "feedback").pipe(
                        Effect.provide(layer)
                    )
                )
            ).fields.map((field) => field.component_id)
        ).toEqual(["email"])
        const template = await change({
            _tag: "SaveTemplate",
            template_id: null,
            expected_revision: 0,
            name: "Feedback template",
            description: "",
            tags: ["feedback"],
            fields,
        })
        const reloaded = await Effect.runPromise(
            load_forms_catalog(owner.domain_id).pipe(Effect.provide(layer))
        )
        expect(reloaded.templates[0]?.id).toBe(template.changed_id)
        await expect(
            change({
                _tag: "SaveTemplate",
                template_id: template.changed_id,
                expected_revision: 0,
                name: "Outdated",
                description: "",
                tags: [],
                fields,
            })
        ).rejects.toThrow("changed elsewhere")
        await change({
            _tag: "SaveTemplate",
            template_id: template.changed_id,
            expected_revision: 1,
            name: "Updated feedback template",
            description: "",
            tags: ["FEEDBACK", "feedback"],
            fields,
        })
        const updated_template = await Effect.runPromise(
            load_forms_catalog(owner.domain_id).pipe(Effect.provide(layer))
        )
        expect(updated_template.templates[0]?.revision).toBe(2)
        expect(updated_template.templates[0]?.tags).toEqual(["feedback"])
        await change({
            _tag: "CreateForm",
            title: "Second",
            slug: "second",
            template_id: template.changed_id,
        })
        expect(
            (
                await Effect.runPromise(
                    load_form_detail(owner.domain_id, "second").pipe(
                        Effect.provide(layer)
                    )
                )
            ).fields
        ).toHaveLength(1)
        await expect(
            change({
                _tag: "CreateForm",
                title: "Duplicate",
                slug: "feedback",
                template_id: null,
            })
        ).rejects.toThrow("A form already uses this slug")
    })

    it("rejects cross-domain and read-only writes", async () => {
        const owner = await seed("forms-owner")
        const other = await seed("forms-other")
        const session = await login("forms-owner")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const other_session = await login("forms-other")
        const other_principal = {
            ...(await run(authenticate_token(other_session.token))),
            domain_id: other.domain_id,
        }
        const template = await run(
            Effect.flatMap(FormsRepository, (repository) =>
                repository.change(other_principal, {
                    _tag: "SaveTemplate",
                    template_id: null,
                    expected_revision: 0,
                    name: "Private",
                    description: "",
                    tags: [],
                    fields: [],
                })
            )
        )
        await expect(
            run(
                Effect.flatMap(FormsRepository, (repository) =>
                    repository.change(principal, {
                        _tag: "CreateForm",
                        title: "Wrong org",
                        slug: "wrong-org",
                        template_id: template.changed_id,
                    })
                )
            )
        ).rejects.toThrow("Form unavailable")
        await expect(
            run(
                Effect.flatMap(FormsRepository, (repository) =>
                    repository.authorize(principal, other.domain_id)
                )
            )
        ).rejects.toThrow("Form unavailable")
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        await expect(
            run(
                Effect.flatMap(FormsRepository, (repository) =>
                    repository.change(principal, {
                        _tag: "CreateForm",
                        title: "Denied",
                        slug: "denied",
                        template_id: null,
                    })
                )
            )
        ).rejects.toMatchObject({ reason: "forbidden" })
    })
})

describe("Shop account cutover", () => {
    it("reserves one server-priced payment attempt per pending order", async () => {
        const owner = await seed("shop-payment-ledger")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Shop']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("shop-payment-ledger")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const order_id = randomUUID()
        const now = Date.now()
        await pg.query(
            `INSERT INTO orders
                (id,domain_id,cart_id,session_id,checkout_key,email,status,
                total_price,currency,shipping_address,created_at,updated_at)
                VALUES ($1,$2,'cart','session',$1,'buyer@example.com','pending',
                2400,'USD','{}'::jsonb,$3,$3)`,
            [order_id, owner.domain_id, now]
        )
        const reserve = (request_key: string) =>
            run(
                Effect.flatMap(ShopPaymentRepository, (repository) =>
                    repository.reserve_order_payment(
                        principal,
                        order_id,
                        request_key
                    )
                )
            )
        const first = await reserve("initial")
        const repeated = await reserve("initial")
        expect(repeated.id).toBe(first.id)
        expect(first.amount).toBe(2400)
        expect(first.currency).toBe("USD")
        expect(first.provider_idempotency_key).toBe(`shop:checkout:${first.id}`)
        expect(
            (
                await pg.query<{ count: number }>(
                    "SELECT count(*)::int AS count FROM shop_payments WHERE order_id=$1",
                    [order_id]
                )
            ).rows[0]?.count
        ).toBe(1)

        await pg.query("UPDATE shop_payments SET status='failed' WHERE id=$1", [
            first.id,
        ])
        expect((await reserve("initial")).id).toBe(first.id)
        const retry = await reserve("retry-1")
        expect(retry.id).not.toBe(first.id)
        expect(retry.amount).toBe(2400)
        await expect(reserve("retry-2")).rejects.toMatchObject({
            _tag: "ShopPaymentError",
        })

        const receipt = {
            id: "evt_shop_payment_1",
            event_type: "checkout.session.completed",
            provider_object_id: "cs_shop_payment_1",
            payload_sha256: "a".repeat(64),
            occurred_at: now,
        }
        const record = (input: typeof receipt) =>
            run(
                Effect.flatMap(ShopPaymentRepository, (repository) =>
                    repository.record_verified_stripe_event(input)
                )
            )
        expect(await record(receipt)).toEqual({
            id: receipt.id,
            duplicate: false,
        })
        expect(await record(receipt)).toEqual({
            id: receipt.id,
            duplicate: true,
        })
        await expect(
            record({
                ...receipt,
                payload_sha256: "b".repeat(64),
            })
        ).rejects.toMatchObject({ _tag: "ShopPaymentError" })
    })

    it("drives Shop upload, catalog, cart and pending order through browser RPC", async () => {
        const owner = await seed("shop-browser")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Shop','Media']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const media_id = randomUUID()
        const media_url = "https://example.com/shop-library.png"
        await pg.query(
            "INSERT INTO images (id,domain_id,url,alt,text,order_position,created_at,updated_at) VALUES ($1,$2,$3,'Library bag','',0,1,1)",
            [media_id, owner.domain_id, media_url]
        )
        const session = await login("shop-browser")
        const cookie = `urm_account=${session.token}`
        const fetch_local: typeof fetch = async (input, init) => {
            const request = new Request(input, init)
            request.headers.set("cookie", cookie)
            return run(
                new URL(request.url).pathname.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : new URL(request.url).pathname.startsWith("/api/uploads")
                      ? upload_request(request)
                      : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "shop-browser@example.com", password }),
            fetch_local
        )
        const image_url = await Effect.runPromise(
            Effect.gen(function* () {
                const api = yield* ContactsApi
                return yield* api.upload_image(
                    owner.domain_id,
                    new File([png], "bag.png", { type: "image/png" }),
                    "Shop"
                )
            }).pipe(Effect.provide(layer))
        )
        expect(image_url).toContain(`/api/uploads/${owner.domain_id}/shop/`)
        expect(
            (
                await run(
                    upload_request(
                        new Request(`https://urm.test${image_url}`, {
                            headers: { cookie },
                        })
                    )
                )
            ).status
        ).toBe(302)
        const url = Url.make({
            protocol: "https:",
            host: "urm.test",
            port: Option.none(),
            pathname: "/shop/products/new",
            search: Option.none(),
            hash: Option.none(),
        })
        const [scoped, load_commands] = ShopBrowser.synchronize(
            ShopBrowser.init(url, "/shop/products/new"),
            { account_id: owner.account_id, domain_id: owner.domain_id }
        )
        const loaded_message = await Effect.runPromise(
            load_commands[0]!.effect.pipe(Effect.provide(layer))
        )
        expect(loaded_message._tag).toBe("ShopRemoteLoaded")
        const [loaded] = ShopBrowser.update(
            scoped,
            loaded_message,
            Option.none()
        )
        const [media_open, media_commands] = ShopBrowser.update(
            loaded,
            ShopFeature.OpenedProductMediaLibrary(),
            Option.none()
        )
        expect(media_commands.map((command) => command.name)).toEqual([
            "LoadPostgresShopMedia",
        ])
        const media_message = await Effect.runPromise(
            media_commands[0]!.effect.pipe(Effect.provide(layer))
        )
        expect(media_message._tag).toBe("ShopRemoteMediaLoaded")
        const [media_closed] = ShopBrowser.update(
            media_open,
            ShopFeature.ClosedProductMediaLibrary(),
            Option.none()
        )
        expect(
            ShopBrowser.update(media_closed, media_message, Option.none())[0]
        ).toBe(media_closed)
        const [media_ready] = ShopBrowser.update(
            media_open,
            media_message,
            Option.none()
        )
        expect(media_ready.ui.productMediaImages[0]?.id).toBe(media_id)
        const [media_selected] = ShopBrowser.update(
            media_ready,
            ShopFeature.SelectedProductMediaImage({ imageId: media_id }),
            Option.none()
        )
        expect(media_selected.ui.productDraft.imageUrl).toBe(media_url)
        expect(media_selected.ui.productDraft.imageId).toBe(media_id)
        const product_model = ShopBrowser.Model.make({
            ...media_selected,
            ui: {
                ...media_selected.ui,
                productDraft: {
                    name: "Canvas bag",
                    slug: "canvas-bag",
                    description: "A reusable bag",
                    price: "24.00",
                    inventory: "5",
                    imageUrl: media_selected.ui.productDraft.imageUrl,
                    imageId: media_selected.ui.productDraft.imageId,
                    collectionIds: [],
                    isActive: true,
                    isFeatured: true,
                },
            },
        })
        const [, product_commands] = ShopBrowser.update(
            product_model,
            ShopFeature.SubmittedProductForm(),
            Option.none()
        )
        const product_message = await Effect.runPromise(
            product_commands[0]!.effect.pipe(Effect.provide(layer))
        )
        expect(product_message._tag).toBe("ShopRemoteCatalogSaved")
        expect(product_commands[0]?.args).toMatchObject({
            action: { image_id: media_id },
        })
        const [with_product] = ShopBrowser.update(
            product_model,
            product_message,
            Option.none()
        )
        const variant_id = with_product.ui.products[0]?.variants?.[0]?.id
        if (variant_id === undefined) throw new Error("Shop variant missing")
        const [, cart_commands] = ShopBrowser.update(
            with_product,
            ShopFeature.ClickedAddCartItem({
                variantId: variant_id,
                quantity: 2,
            }),
            Option.none()
        )
        const cart_message = await Effect.runPromise(
            cart_commands[0]!.effect.pipe(Effect.provide(layer))
        )
        expect(cart_message._tag).toBe("ShopRemoteCartSaved")
        const [with_cart] = ShopBrowser.update(
            with_product,
            cart_message,
            Option.none()
        )
        expect(with_cart.ui.cartSnapshot.cart?.totalPrice).toBe(4800)
        const checkout_model = ShopBrowser.Model.make({
            ...with_cart,
            ui: {
                ...with_cart.ui,
                checkoutDraft: {
                    email: "buyer@example.com",
                    firstName: "Ada",
                    lastName: "Lovelace",
                    line1: "1 Main St",
                    city: "London",
                    province: "London",
                    country: "GB",
                    postal: "SW1A 1AA",
                },
            },
        })
        const [, order_commands] = ShopBrowser.update(
            checkout_model,
            ShopFeature.SubmittedPendingOrder(),
            Option.none()
        )
        const order_message = await Effect.runPromise(
            order_commands[0]!.effect.pipe(Effect.provide(layer))
        )
        expect(order_message._tag).toBe("ShopRemoteOrderSaved")
        const [with_order, followups] = ShopBrowser.update(
            checkout_model,
            order_message,
            Option.none()
        )
        expect(with_order.ui.orders[0]?.order.totalPrice).toBe(4800)
        expect(followups.map((command) => command.name)).toContain(
            "LoadPostgresShop"
        )
    }, 30_000)
})

describe("Cloudflare provider events", () => {
    it("applies matched events once, preserves terminal state, and suppresses hard bounces", async () => {
        const owner = await seed("event-ledger")
        const contact_id = randomUUID()
        const delivery_id = randomUUID()
        const send_id = randomUUID()
        const now = Date.now()
        await pg.query(
            "INSERT INTO contacts (id,name,created_at,updated_at) VALUES ($1,'Reader',$2,$2)",
            [contact_id, now]
        )
        await pg.query(
            "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        await pg.query(
            "INSERT INTO email_subscriptions (id,domain_id,contact_id,list_key,status,created_at,updated_at) VALUES ($1,$2,$3,'newsletter','subscribed',$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        await pg.query(
            `INSERT INTO email_newsletter_sends
                (id,domain_id,name,template_id,subject,list_key,provider,audience,
                idempotency_key,headline,body_text,status,approved_contact_count,
                accepted_count,queued_count,sent_count,failed_count,skipped_count,
                created_at,updated_at,completed_at)
                VALUES ($1,$2,'Event test','newsletter_basic','Test','newsletter',
                'cloudflare','subscribers',$1,'Test','Body','completed',
                1,1,0,0,0,0,$3,$3,$3)`,
            [send_id, owner.domain_id, now]
        )
        await pg.query(
            `INSERT INTO email_deliveries
            (id,domain_id,contact_id,newsletter_send_id,template_id,purpose,provider,provider_message_id,
            status,to_hash,subject,idempotency_key,created_at,updated_at)
            VALUES ($1,$2,$3,$4,'newsletter_basic','newsletter','cloudflare','message-1',
            'accepted',$5,'Test',$1,$6,$6)`,
            [
                delivery_id,
                owner.domain_id,
                contact_id,
                send_id,
                createHash("sha256").update("reader@example.com").digest("hex"),
                now,
            ]
        )
        const run_event = <A, E>(effect: Effect.Effect<A, E, EmailSql>) =>
            Effect.runPromise(effect.pipe(Effect.provide(TestEmailServices)))
        const event = (
            id: string,
            type: "deferred" | "delivered" | "bounced",
            occurred_at: number
        ) => ({
            id,
            message_id: "message-1",
            recipient: "reader@example.com",
            type,
            bounce_type: type === "bounced" ? "hard" : null,
            occurred_at,
        })
        expect(
            await run_event(
                recordCloudflareDeliveryEvent(
                    event("event-1", "delivered", now + 2)
                )
            )
        ).toBe(true)
        expect(
            await run_event(
                recordCloudflareDeliveryEvent(
                    event("event-1", "delivered", now + 2)
                )
            )
        ).toBe(false)
        await run_event(
            recordCloudflareDeliveryEvent(event("event-2", "deferred", now + 3))
        )
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_deliveries WHERE id=$1",
                    [delivery_id]
                )
            ).rows[0]?.status
        ).toBe("delivered")
        await run_event(
            recordCloudflareDeliveryEvent(event("event-3", "bounced", now + 4))
        )
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_deliveries WHERE id=$1",
                    [delivery_id]
                )
            ).rows[0]?.status
        ).toBe("bounced")
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_subscriptions WHERE contact_id=$1",
                    [contact_id]
                )
            ).rows[0]?.status
        ).toBe("suppressed")
        expect(
            (
                await pg.query<{
                    accepted_count: number
                    failed_count: number
                }>(
                    "SELECT accepted_count,failed_count FROM email_newsletter_sends WHERE id=$1",
                    [send_id]
                )
            ).rows[0]
        ).toMatchObject({ accepted_count: 0, failed_count: 1 })
        expect(
            (
                await pg.query<{ total: number }>(
                    "SELECT count(*)::int AS total FROM email_provider_events WHERE delivery_id=$1",
                    [delivery_id]
                )
            ).rows[0]?.total
        ).toBe(3)
    })

    it("retains an early event until the provider message ID is recorded", async () => {
        const owner = await seed("event-race")
        const delivery_id = randomUUID()
        const now = Date.now()
        await pg.query(
            `INSERT INTO email_deliveries
            (id,domain_id,template_id,purpose,provider,status,to_hash,subject,
            idempotency_key,created_at,updated_at)
            VALUES ($1,$2,'test','transactional','cloudflare','accepted',$3,'Test',$1,$4,$4)`,
            [
                delivery_id,
                owner.domain_id,
                createHash("sha256").update("race@example.com").digest("hex"),
                now,
            ]
        )
        const run_event = <A, E>(effect: Effect.Effect<A, E, EmailSql>) =>
            Effect.runPromise(effect.pipe(Effect.provide(TestEmailServices)))
        await run_event(
            recordCloudflareDeliveryEvent({
                id: randomUUID(),
                message_id: "unmatched-message",
                recipient: "race@example.com",
                type: "delivered",
                bounce_type: null,
                occurred_at: now,
            })
        )
        expect(
            await run_event(
                recordCloudflareDeliveryEvent({
                    id: randomUUID(),
                    message_id: "message-race",
                    recipient: "race@example.com",
                    type: "delivered",
                    bounce_type: null,
                    occurred_at: now + 1,
                })
            )
        ).toBe(false)
        await pg.query(
            "UPDATE email_deliveries SET provider_message_id='message-race' WHERE id=$1",
            [delivery_id]
        )
        expect(await run_event(reconcileCloudflareDeliveryEvents(1))).toBe(1)
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_deliveries WHERE id=$1",
                    [delivery_id]
                )
            ).rows[0]?.status
        ).toBe("delivered")
    })

    it("decodes a pulled Queue event and acknowledges it after persistence", async () => {
        const owner = await seed("event-queue")
        const delivery_id = randomUUID()
        const now = Date.now()
        await pg.query(
            `INSERT INTO email_deliveries
            (id,domain_id,template_id,purpose,provider,provider_message_id,status,
            to_hash,subject,idempotency_key,created_at,updated_at)
            VALUES ($1,$2,'test','transactional','cloudflare','queue-message',
            'accepted',$3,'Test',$1,$4,$4)`,
            [
                delivery_id,
                owner.domain_id,
                createHash("sha256").update("queue@example.com").digest("hex"),
                now,
            ]
        )
        vi.stubEnv("CLOUDFLARE_EMAIL_EVENTS_ENABLED", "true")
        vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account")
        vi.stubEnv("CLOUDFLARE_EMAIL_EVENTS_QUEUE_ID", "test-queue")
        vi.stubEnv(
            "CLOUDFLARE_EMAIL_EVENTS_SUBSCRIPTION_IDS",
            "test-subscription"
        )
        vi.stubEnv("CLOUDFLARE_EMAIL_EVENTS_API_TOKEN", "test-token")
        const event = {
            type: "cf.email.sending.message.delivered",
            source: { type: "email.sending", domain: "mail.urm.dev" },
            payload: {
                eventId: randomUUID(),
                messageId: "queue-message",
                recipient: "queue@example.com",
                terminal: true,
            },
            metadata: {
                accountId: "test-account",
                eventSubscriptionId: "test-subscription",
                eventSchemaVersion: 1,
                eventTimestamp: new Date(now).toISOString(),
            },
        }
        let acked = false
        vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
            if (url.endsWith("/pull"))
                return Response.json({
                    success: true,
                    result: {
                        messages: [
                            {
                                body: Buffer.from(
                                    JSON.stringify(event)
                                ).toString("base64"),
                                lease_id: "test-lease",
                                metadata: { "CF-Content-Type": "json" },
                            },
                        ],
                    },
                })
            const status = (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_deliveries WHERE id=$1",
                    [delivery_id]
                )
            ).rows[0]?.status
            const body = JSON.parse(String(init.body))
            acked =
                status === "delivered" &&
                body.acks[0]?.lease_id === "test-lease"
            return Response.json({ success: true })
        })
        try {
            expect(
                await Effect.runPromise(
                    pollCloudflareEmailEvents().pipe(
                        Effect.provide(TestEmailServices)
                    )
                )
            ).toBe(1)
            expect(acked).toBe(true)
        } finally {
            vi.unstubAllEnvs()
        }
    })
})

describe("interrupted email delivery recovery", () => {
    it("resumes only unattempted recipients and never submits them twice", async () => {
        const owner = await seed("mail-resume")
        const now = Date.now()
        const stale_at = now - EMAIL_DELIVERY_RECOVERY_AGE_MS - 1_000
        const send_id = randomUUID()
        const delivery_id = randomUUID()
        const contact_id = randomUUID()
        const unsubscribed_contact_id = randomUUID()
        const skipped_delivery_id = randomUUID()
        await pg.query(
            "INSERT INTO contacts (id,name,created_at,updated_at) VALUES ($1,'Resume Reader',$2,$2)",
            [contact_id, now]
        )
        await pg.query(
            "INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES ($1,$2,'resume@example.com',true,$3,$3)",
            [randomUUID(), contact_id, now]
        )
        await pg.query(
            "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        await pg.query(
            "INSERT INTO email_subscriptions (id,domain_id,contact_id,list_key,status,created_at,updated_at) VALUES ($1,$2,$3,'newsletter','subscribed',$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        await pg.query(
            "INSERT INTO contacts (id,name,created_at,updated_at) VALUES ($1,'Former Reader',$2,$2)",
            [unsubscribed_contact_id, now]
        )
        await pg.query(
            "INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES ($1,$2,'former@example.com',true,$3,$3)",
            [randomUUID(), unsubscribed_contact_id, now]
        )
        await pg.query(
            "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',$4,$4)",
            [randomUUID(), owner.domain_id, unsubscribed_contact_id, now]
        )
        await pg.query(
            "INSERT INTO email_subscriptions (id,domain_id,contact_id,list_key,status,created_at,updated_at) VALUES ($1,$2,$3,'newsletter','unsubscribed',$4,$4)",
            [randomUUID(), owner.domain_id, unsubscribed_contact_id, now]
        )
        await pg.query(
            `INSERT INTO email_newsletter_sends
                (id,domain_id,name,template_id,subject,list_key,provider,audience,
                idempotency_key,headline,body_text,status,approved_contact_count,
                accepted_count,queued_count,sent_count,failed_count,skipped_count,
                created_at,updated_at,started_at)
                VALUES ($1,$2,'Resume','newsletter_basic','Resume','newsletter',
                'cloudflare','subscribers',$1,'Resume','Hello again','sending',
                2,0,0,0,0,0,$3,$3,$3)`,
            [send_id, owner.domain_id, stale_at]
        )
        await pg.query(
            `INSERT INTO email_deliveries
                (id,domain_id,contact_id,newsletter_send_id,template_id,purpose,
                provider,status,provider_status,to_hash,subject,idempotency_key,
                created_at,updated_at)
                VALUES ($1,$2,$3,$4,'newsletter_basic','newsletter','cloudflare',
                'pending','unattempted',$5,'Resume',$1,$6,$6)`,
            [
                delivery_id,
                owner.domain_id,
                contact_id,
                send_id,
                createHash("sha256").update("resume@example.com").digest("hex"),
                stale_at,
            ]
        )
        await pg.query(
            `INSERT INTO email_deliveries
                (id,domain_id,contact_id,newsletter_send_id,template_id,purpose,
                provider,status,provider_status,to_hash,subject,idempotency_key,
                created_at,updated_at)
                VALUES ($1,$2,$3,$4,'newsletter_basic','newsletter','cloudflare',
                'pending','unattempted',$5,'Resume',$1,$6,$6)`,
            [
                skipped_delivery_id,
                owner.domain_id,
                unsubscribed_contact_id,
                send_id,
                createHash("sha256").update("former@example.com").digest("hex"),
                stale_at,
            ]
        )
        const run_email = <A, E>(
            effect: Effect.Effect<A, E, EmailSql | EmailTransport>
        ) => Effect.runPromise(effect.pipe(Effect.provide(TestEmailServices)))
        expect(await run_email(recoverStaleEmailDeliveries(now))).toEqual({
            deliveries: 0,
            sends: 0,
        })
        const before = sent_emails.length
        expect(
            await run_email(dispatchPendingNewsletterSends("https://urm.test"))
        ).toBe(1)
        expect(sent_emails.length).toBe(before + 1)
        expect(
            await run_email(dispatchPendingNewsletterSends("https://urm.test"))
        ).toBe(0)
        expect(sent_emails.length).toBe(before + 1)
        expect(
            (
                await pg.query<{ status: string; skipped_count: number }>(
                    "SELECT status,skipped_count FROM email_newsletter_sends WHERE id=$1",
                    [send_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "completed", skipped_count: 1 })
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_deliveries WHERE id=$1",
                    [delivery_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "delivered" })
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_deliveries WHERE id=$1",
                    [skipped_delivery_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "skipped" })
    })

    it("marks stale unknown outcomes without resending or changing active sends", async () => {
        const owner = await seed("mail-recovery")
        const now = Date.now()
        const stale_at = now - EMAIL_DELIVERY_RECOVERY_AGE_MS - 1_000
        const active_at = now - 1_000
        const interrupted_id = randomUUID()
        const accepted_id = randomUUID()
        const active_id = randomUUID()
        const insert_send = async (
            id: string,
            approved_count: number,
            created_at: number
        ) =>
            pg.query(
                `INSERT INTO email_newsletter_sends
                    (id,domain_id,name,template_id,subject,list_key,provider,audience,
                    idempotency_key,status,approved_contact_count,accepted_count,
                    queued_count,sent_count,failed_count,skipped_count,
                    created_at,updated_at,started_at)
                    VALUES ($1,$2,'Recovery','newsletter_basic','Recovery','newsletter',
                    'cloudflare','subscribers',$1,'sending',$3,0,0,0,0,0,$4,$4,$4)`,
                [id, owner.domain_id, approved_count, created_at]
            )
        const insert_delivery = async (
            id: string,
            send_id: string,
            status: string,
            created_at: number
        ) =>
            pg.query(
                `INSERT INTO email_deliveries
                    (id,domain_id,newsletter_send_id,template_id,purpose,provider,
                    status,to_hash,subject,idempotency_key,created_at,updated_at)
                    VALUES ($1,$2,$3,'newsletter_basic','newsletter','cloudflare',
                    $4,$5,'Recovery',$1,$6,$6)`,
                [
                    id,
                    owner.domain_id,
                    send_id,
                    status,
                    "a".repeat(64),
                    created_at,
                ]
            )

        await insert_send(interrupted_id, 3, stale_at)
        await insert_send(accepted_id, 1, stale_at)
        await insert_send(active_id, 1, active_at)
        const pending_id = randomUUID()
        await insert_delivery(pending_id, interrupted_id, "pending", stale_at)
        await insert_delivery(
            randomUUID(),
            interrupted_id,
            "accepted",
            stale_at
        )
        await insert_delivery(randomUUID(), accepted_id, "accepted", stale_at)
        const active_delivery_id = randomUUID()
        await insert_delivery(
            active_delivery_id,
            active_id,
            "pending",
            active_at
        )

        const recover = () =>
            Effect.runPromise(
                recoverStaleEmailDeliveries(now).pipe(
                    Effect.provide(TestEmailServices)
                )
            )
        expect(await recover()).toEqual({ deliveries: 1, sends: 2 })
        expect(await recover()).toEqual({ deliveries: 0, sends: 0 })

        expect(
            (
                await pg.query<{
                    status: string
                    accepted_count: number
                    failed_count: number
                    error_message: string | null
                }>(
                    `SELECT status,accepted_count,failed_count,error_message
                     FROM email_newsletter_sends WHERE id=$1`,
                    [interrupted_id]
                )
            ).rows[0]
        ).toMatchObject({
            status: "failed",
            accepted_count: 1,
            failed_count: 2,
            error_message:
                "Send interrupted; review delivery outcomes. Do not retry automatically.",
        })
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_newsletter_sends WHERE id=$1",
                    [accepted_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "completed" })
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_newsletter_sends WHERE id=$1",
                    [active_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "sending" })
        expect(
            (
                await pg.query<{
                    status: string
                    provider_status: string | null
                    error_class: string | null
                }>(
                    "SELECT status,provider_status,error_class FROM email_deliveries WHERE id=$1",
                    [pending_id]
                )
            ).rows[0]
        ).toMatchObject({
            status: "failed",
            provider_status: "unknown",
            error_class: "OutcomeUnknown",
        })
        expect(
            (
                await pg.query<{ status: string }>(
                    "SELECT status FROM email_deliveries WHERE id=$1",
                    [active_delivery_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "pending" })
    })

    it("completes a recovered send when a late provider event resolves its uncertain delivery", async () => {
        const owner = await seed("mail-late-event")
        const now = Date.now()
        const stale_at = now - EMAIL_DELIVERY_RECOVERY_AGE_MS - 1_000
        const send_id = randomUUID()
        const delivery_id = randomUUID()
        await pg.query(
            `INSERT INTO email_newsletter_sends
                (id,domain_id,name,template_id,subject,list_key,provider,audience,
                idempotency_key,status,approved_contact_count,accepted_count,
                queued_count,sent_count,failed_count,skipped_count,
                created_at,updated_at,started_at)
                VALUES ($1,$2,'Late event','newsletter_basic','Late event','newsletter',
                'cloudflare','subscribers',$1,'sending',1,0,0,0,0,0,$3,$3,$3)`,
            [send_id, owner.domain_id, stale_at]
        )
        await pg.query(
            `INSERT INTO email_deliveries
                (id,domain_id,newsletter_send_id,template_id,purpose,provider,
                provider_message_id,status,to_hash,subject,idempotency_key,
                created_at,updated_at)
                VALUES ($1,$2,$3,'newsletter_basic','newsletter','cloudflare',
                'late-message','pending',$4,'Late event',$1,$5,$5)`,
            [
                delivery_id,
                owner.domain_id,
                send_id,
                createHash("sha256").update("late@example.com").digest("hex"),
                stale_at,
            ]
        )
        const run_event = <A, E>(effect: Effect.Effect<A, E, EmailSql>) =>
            Effect.runPromise(effect.pipe(Effect.provide(TestEmailServices)))
        expect(await run_event(recoverStaleEmailDeliveries(now))).toEqual({
            deliveries: 1,
            sends: 1,
        })
        expect(
            (
                await pg.query(
                    "SELECT status FROM email_newsletter_sends WHERE id=$1",
                    [send_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "failed" })

        expect(
            await run_event(
                recordCloudflareDeliveryEvent({
                    id: randomUUID(),
                    message_id: "late-message",
                    recipient: "late@example.com",
                    type: "delivered",
                    bounce_type: null,
                    occurred_at: now + 1,
                })
            )
        ).toBe(true)
        expect(
            (
                await pg.query(
                    `SELECT status,accepted_count,sent_count,failed_count,error_message
                     FROM email_newsletter_sends WHERE id=$1`,
                    [send_id]
                )
            ).rows[0]
        ).toMatchObject({
            status: "completed",
            accepted_count: 1,
            sent_count: 1,
            failed_count: 0,
            error_message: null,
        })
        expect(await run_event(recoverStaleEmailDeliveries(now))).toEqual({
            deliveries: 0,
            sends: 0,
        })
    })
})
const database = make_sql()
// Every send in these tests stops here; nothing reaches a provider.
const sent_emails: Array<{
    subject: string
    recipients: number
    addresses: ReadonlyArray<string>
}> = []
const TestEmailTransport = Layer.succeed(EmailTransport, {
    send: (input) =>
        Effect.sync(() => {
            const recipients = (
                Array.isArray(input.to) ? input.to : [input.to]
            ).map((recipient) =>
                typeof recipient === "string" ? recipient : recipient.address
            )
            sent_emails.push({
                subject: input.subject,
                recipients: recipients.length,
                addresses: recipients,
            })
            return {
                status: "sent" as const,
                message_id: `test-${randomUUID()}`,
                delivered: recipients,
                queued: [],
                permanent_bounces: [],
            }
        }),
})
const stored_images = new Map<string, Uint8Array>()
const published_images = new Map<string, string>()
const TestNewsletterImagePublisher = Layer.succeed(NewsletterImagePublisher, {
    read: (key: string) => {
        const bytes = stored_images.get(key)
        return bytes === undefined
            ? Effect.fail(new NewsletterImagePublishError("missing test image"))
            : Effect.succeed({ bytes, content_type: "image/png" })
    },
    publish: (key: string) =>
        Effect.sync(() => {
            const url = `https://storage.test/public/${key}`
            published_images.set(key, url)
            return url
        }),
})
const TestEmailServices = Layer.mergeAll(
    TestEmailTransport,
    TestNewsletterImagePublisher,
    Layer.succeed(EmailSql, {
        query: (statement: SQL) =>
            database
                .query(statement)
                .pipe(
                    Effect.mapError(
                        () => new EmailPersistenceError({ operation: "query" })
                    )
                ),
        transaction: (effect) =>
            database.transaction(effect).pipe(
                Effect.mapError(
                    () =>
                        new EmailPersistenceError({
                            operation: "transaction",
                        })
                )
            ),
    }),
    // A stub rather than ServerConfigLive: the test environment has no PORT,
    // and only the unsubscribe origin matters here.
    Layer.succeed(ServerConfig, {
        port: 1234,
        hostname: "urm.test",
        apiUrl: "https://urm.test",
        appUrl: "https://urm.test",
        adminAppUrl: "https://urm.test",
        marketingAppUrl: "https://urm.test",
        cookieDomain: "urm.test",
    })
)
const run = <A, E>(
    effect: Effect.Effect<A, E, Sql | Layer.Success<typeof RepositoriesLive>>
) =>
    Effect.runPromise(
        effect.pipe(
            Effect.provide(RepositoriesLive),
            Effect.provide(TestEmailServices),
            Effect.provideService(Sql, database)
        )
    )
const uploaded_objects = new Map<string, Uint8Array>()
const upload_storage = UploadStorage.of({
    put: (key, bytes) =>
        Effect.sync(() => {
            uploaded_objects.set(key, bytes)
        }),
    url: (key) =>
        Effect.succeed(
            uploaded_objects.has(key)
                ? `https://storage.test/${key}?signed=example`
                : null
        ),
})
const upload_request = (request: Request) =>
    handle_upload_request(request).pipe(
        Effect.provideService(UploadStorage, upload_storage)
    )
const png = Uint8Array.from(
    Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=",
        "base64"
    )
)
const password = "a long unique test password"
const seed = (slug: string) =>
    run(
        provision_account({
            name: slug,
            email: `${slug}@example.com`,
            password,
            slug,
        })
    )
const login = (slug: string) =>
    run(login_account({ email: `${slug}@example.com`, password }))

beforeAll(async () => {
    const base = new URL(
        "../../../packages/db/src/migrations/",
        import.meta.url
    )
    for (const entry of (await readdir(base, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        await pg.exec(
            await readFile(new URL(`${entry.name}/migration.sql`, base), "utf8")
        )
    }
}, 30_000)
beforeEach(async () => {
    uploaded_objects.clear()
    await pg.exec(
        "TRUNCATE organizations,users,contacts,account_login_attempts CASCADE"
    )
})
afterAll(async () => {
    await pg.close()
})

const post = (path: string, body: unknown, cookie?: string) =>
    new Request(`https://urm.test${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-requested-with": "XMLHttpRequest",
            ...(cookie === undefined ? {} : { cookie }),
        },
        body: JSON.stringify(body) + "\n",
    })
const legacy_probe = RpcGroup.make(
    Rpc.make("LegacyProbe", { success: Schema.String })
)
const handle_rpc_request = (request: Request) =>
    Effect.gen(function* () {
        const rejected = rpc_request_rejection(request)
        if (rejected !== null) return rejected
        const db = yield* Sql
        const layer = rpc_http_layer(RpcApi.merge(legacy_probe)).pipe(
            Layer.provide(
                legacy_probe.toLayer({
                    LegacyProbe: () => Effect.succeed("legacy-ok"),
                })
            ),
            Layer.provide(api_request_layer(request)),
            Layer.provide(TestEmailServices),
            Layer.provide(Layer.succeed(Sql, db))
        )
        const { handler, dispose } = HttpRouter.toWebHandler(layer, {
            disableLogger: true,
        })
        return yield* Effect.promise(() =>
            rpc_response(request, handler, dispose)
        )
    })
const query_request = (domain_id: string, cookie?: string) =>
    post(
        `/api/rpc?domain_id=${domain_id}`,
        {
            _tag: "Request",
            id: "1",
            tag: "FoldkitRemoteQuery",
            payload: {
                query: "DomainContacts",
                input: { domain_id },
                window: {},
            },
            headers: [],
        },
        cookie
    )
const fetch_local: typeof fetch = async (input, init) => {
    const request = new Request(input, init)
    const response = await run(handle_rpc_request(request))
    return response
}

describe("account auth and PostgreSQL Contacts", () => {
    it("shares the endpoint across feature queries and legacy procedures without trusting envelope cookies", async () => {
        const owner = await seed("shared")
        const other = await seed("other")
        const session = await login("shared")
        const messages = [
            {
                _tag: "Request",
                id: "1",
                tag: "LegacyProbe",
                payload: null,
                headers: [],
            },
            ...["DomainContacts", "DomainMembers"].map((query, index) => ({
                _tag: "Request",
                id: String(index + 2),
                tag: "FoldkitRemoteQuery",
                payload: {
                    query,
                    input: { domain_id: owner.domain_id },
                    window: {},
                },
                headers: [["cookie", `urm_account=${session.token}`]],
            })),
        ]
        const invoke = async (domain_id: string, cookie?: string) => {
            const response = await run(
                handle_rpc_request(
                    new Request(
                        `https://urm.test/api/rpc?domain_id=${domain_id}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/ndjson",
                                "x-requested-with": "XMLHttpRequest",
                                ...(cookie === undefined ? {} : { cookie }),
                            },
                            body:
                                messages
                                    .map((message) => JSON.stringify(message))
                                    .join("\n") + "\n",
                        }
                    )
                )
            )
            expect(response.status).toBe(200)
            expect(response.headers.get("cache-control")).toBe("no-store")
            return await response.text()
        }
        const forged = await invoke(owner.domain_id)
        expect(forged).toContain("legacy-ok")
        expect(forged.match(/AuthorizationError/g)).toHaveLength(2)
        const allowed = await invoke(
            owner.domain_id,
            `urm_account=${session.token}`
        )
        expect(allowed).toContain("legacy-ok")
        expect(allowed).not.toContain('"Failure"')
        expect(allowed.match(/"Success"/g)).toHaveLength(3)
        const foreign = await invoke(
            other.domain_id,
            `urm_account=${session.token}`
        )
        expect(foreign.match(/"Failure"/g)).toHaveLength(2)
        // A previous successful request must not authenticate the next one.
        expect(await invoke(owner.domain_id)).toContain("AuthorizationError")
    })

    it("enforces account authentication in RPC middleware independently of the HTTP wrapper", async () => {
        await seed("middleware")
        const session = await login("middleware")
        const invoke = async (cookie: string | undefined) => {
            let dispatched = false
            const request = new Request("http://localhost/api/probe", {
                headers: cookie === undefined ? {} : { cookie },
            })
            const result = await run(
                Effect.gen(function* () {
                    const middleware = yield* AuthenticatedRpcMiddleware
                    return yield* Effect.exit(
                        middleware(
                            Effect.sync(() => {
                                dispatched = true
                                throw new Error("probe reached")
                            }),
                            {
                                client: new Rpc.ServerClient(1),
                                requestId: RpcMessage.RequestId("probe"),
                                rpc: Rpc.make("probe"),
                                payload: {},
                                headers: Headers.empty,
                            }
                        )
                    )
                }).pipe(
                    Effect.provide(authenticated_rpc_layer(request)),
                    Effect.scoped
                )
            )
            return { result, dispatched }
        }
        expect((await invoke(undefined)).dispatched).toBe(false)
        expect((await invoke("urm_account=invalid")).dispatched).toBe(false)
        expect((await invoke(`urm_account=${session.token}`)).dispatched).toBe(
            true
        )
        await run(revoke_token(session.token))
        expect((await invoke(`urm_account=${session.token}`)).dispatched).toBe(
            false
        )
    })
    it("drives browser login, domain discovery, paging, create, rename and logout against PostgreSQL", async () => {
        const owner = await seed("browser")
        await seed("unrelated")
        let cookie = ""
        const requests: string[] = []
        const browser_fetch: typeof fetch = async (input, init) => {
            const request = new Request(input, init)
            request.headers.set("cookie", cookie)
            requests.push(new URL(request.url).pathname)
            const result = await run(
                new URL(request.url).pathname.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : new URL(request.url).pathname.startsWith("/api/uploads")
                      ? upload_request(request)
                      : handle_rpc_request(request)
            )
            const set_cookie = result.headers.get("set-cookie")
            if (set_cookie !== null) cookie = set_cookie.split(";")[0] ?? ""
            return result
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "browser@example.com", password }),
            browser_fetch
        )
        const dispatch = async (
            model: BrowserModel,
            message: typeof BrowserMessage.Type
        ) => {
            let result = browser_update(model, message)
            let current = result.model
            const pending = [...(result.commands ?? [])]
            for (let turns = 0; pending.length > 0 && turns < 10; turns++) {
                const command = pending.shift()
                if (command === undefined) break
                const received = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                result = browser_update(current, received)
                current = result.model
                pending.push(...(result.commands ?? []))
            }
            expect(pending).toHaveLength(0)
            return current
        }
        const signed_out = await dispatch(
            browser_initial,
            BrowserMessage.Boot()
        )
        expect(signed_out.session).toBeNull()
        let model = await dispatch(signed_out, BrowserMessage.SubmittedLogin())
        expect(model.error).toBe("")
        expect(model.session?.domains.map((item) => item.id)).toEqual([
            owner.domain_id,
        ])
        expect(browser_page(model)._tag).toBe("Ready")
        model = browser_update(
            model,
            BrowserMessage.ChangedName({ value: "Frontend contact" })
        ).model
        model = browser_update(
            model,
            BrowserMessage.ChangedEmail({ value: "frontend@example.com" })
        ).model
        model = await dispatch(model, BrowserMessage.SubmittedCreate())
        expect(model.error).toBe("")
        const created = browser_page(model)
        if (created._tag !== "Ready") throw new Error("Contacts did not load")
        const contact = created.value.items.find(
            (item) => item.email === "frontend@example.com"
        )
        if (contact === undefined)
            throw new Error("Created contact was not visible")
        model = browser_update(
            model,
            BrowserMessage.EditedContact({ id: contact.id })
        ).model
        model = browser_update(
            model,
            BrowserMessage.ChangedRename({ value: "Renamed in the browser" })
        ).model
        model = await dispatch(model, BrowserMessage.SubmittedRename())
        expect(JSON.stringify(browser_page(model))).toContain(
            "Renamed in the browser"
        )
        for (let index = 0; index < 25; index++) {
            const id = randomUUID()
            await pg.query(
                "INSERT INTO contacts (id,name,created_at,updated_at) VALUES ($1,$2,1,1)",
                [id, `Page contact ${index}`]
            )
            await pg.query(
                "INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES ($1,$1,$2,true,1,1)",
                [id, `page-${index}@example.com`]
            )
            await pg.query(
                "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',1,1)",
                [id, owner.domain_id, id]
            )
        }
        model = await dispatch(model, BrowserMessage.Refreshed())
        const first_page = browser_page(model)
        if (first_page._tag !== "Ready")
            throw new Error("First page did not load")
        expect(first_page.value.items).toHaveLength(25)
        expect(first_page.value.hasNext).toBe(true)
        model = await dispatch(model, BrowserMessage.NextPage())
        const second_page = browser_page(model)
        if (second_page._tag !== "Ready")
            throw new Error("Second page did not load")
        expect(second_page.value.items).toHaveLength(2)
        expect(
            second_page.value.items.some((item) =>
                first_page.value.items.some((first) => first.id === item.id)
            )
        ).toBe(false)
        model = await dispatch(model, BrowserMessage.PreviousPage())
        expect(browser_page(model)).toEqual(first_page)
        const outside = second_page.value.items[0]
        if (outside === undefined)
            throw new Error("Missing second page contact")
        model = await dispatch(
            model,
            BrowserMessage.ContactInteraction({
                message: {
                    _tag: "ContactsSearchChanged",
                    value: outside.name.toUpperCase(),
                },
            })
        )
        expect(model.error).toBe("")
        expect(JSON.stringify(browser_page(model))).toContain(outside.id)
        expect(model.after).toBeNull()
        model = await dispatch(model, BrowserMessage.Refreshed())
        expect(JSON.stringify(browser_page(model))).toContain(outside.id)
        model = await dispatch(
            model,
            BrowserMessage.EditedContact({ id: outside.id })
        )
        model = await dispatch(model, BrowserMessage.SubmittedRename())
        expect(model.error).toBe("")
        expect(model.search).toBe(outside.name.toUpperCase())
        expect(JSON.stringify(browser_page(model))).toContain(outside.id)
        model = await dispatch(
            model,
            BrowserMessage.ContactInteraction({
                message: { _tag: "ContactsSearchChanged", value: "" },
            })
        )
        expect(browser_page(model)._tag).toBe("Ready")
        await pg.query(
            "UPDATE organization_members SET role = 'member' WHERE user_id = $1",
            [owner.account_id]
        )
        model = await dispatch(model, BrowserMessage.Refreshed())
        expect(model.session?.domains[0]?.can_write).toBe(false)
        await pg.query(
            "UPDATE organization_members SET status = 'suspended' WHERE user_id = $1",
            [owner.account_id]
        )
        model = await dispatch(model, BrowserMessage.Refreshed())
        expect(model.session).toBeNull()
        expect(model.remote).toEqual(browser_initial.remote)
        model = await dispatch(model, BrowserMessage.SignedOut())
        expect(model.session).toBeNull()
        expect(model.remote).toEqual(browser_initial.remote)
        expect(
            requests.every(
                (path) =>
                    path.startsWith("/auth/") || path.startsWith("/api/rpc")
            )
        ).toBe(true)
    }, 30_000)

    it("provisions a separate account and refuses to claim an existing CRM email", async () => {
        const first = await seed("first")
        expect(first.account_id).not.toBe(first.contact_id)
        const result = await run(
            Effect.result(
                provision_account({
                    name: "Other",
                    email: "first@example.com",
                    password,
                    slug: "other",
                })
            )
        )
        expect(result._tag).toBe("Failure")
        const rows = await pg.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM contacts"
        )
        expect(rows.rows[0]?.count).toBe(1)
        const provider = await pg.query("SELECT * FROM auth_sessions")
        expect(provider.rows).toHaveLength(0)
    })

    it("creates root domains in the account's personal organization and guards edits and deletion", async () => {
        const tenant = await seed("first")
        const personal = await pg.query<{
            id: string
            kind: string
            max_domains: number
        }>(
            "SELECT o.id,o.kind,o.max_domains FROM users u JOIN organizations o ON o.id=u.personal_organization_id WHERE u.id=$1",
            [tenant.account_id]
        )
        expect(personal.rows[0]).toMatchObject({
            kind: "personal",
            max_domains: 1,
        })
        const signed_in = await run(
            handle_auth_request(
                post("/auth/login", { email: "first@example.com", password })
            )
        )
        const cookie = signed_in.headers.get("set-cookie")?.split(";")[0] ?? ""
        const create = (name: string, slug: string) =>
            run(
                handle_auth_request(
                    post("/auth/domains/create", { name, slug }, cookie)
                )
            )
        const first = await create("New site", "new-site")
        expect(first.status).toBe(200)
        const first_domains: unknown = await first.json()
        expect(first_domains).toMatchObject({
            account_id: tenant.account_id,
            domains: expect.arrayContaining([
                expect.objectContaining({ slug: "new-site" }),
            ]),
        })
        expect((await create("Another site", "another-site")).status).toBe(409)

        await pg.query("UPDATE organizations SET max_domains=2 WHERE id=$1", [
            personal.rows[0]?.id,
        ])
        const second = await create("Another site", "another-site")
        expect(second.status).toBe(200)
        const rows = await pg.query<{ id: string }>(
            "SELECT id FROM domains WHERE slug='another-site'"
        )
        const domain_id = rows.rows[0]?.id ?? ""
        const other = await seed("second")
        const other_login = await run(
            handle_auth_request(
                post("/auth/login", { email: "second@example.com", password })
            )
        )
        const other_cookie =
            other_login.headers.get("set-cookie")?.split(";")[0] ?? ""
        expect(other.account_id).not.toBe(tenant.account_id)
        const foreign_edit = await run(
            handle_auth_request(
                post(
                    "/auth/domains/update",
                    { domain_id, name: "Foreign edit", slug: "foreign-edit" },
                    other_cookie
                )
            )
        )
        expect(foreign_edit.status).toBe(403)
        const updated = await run(
            handle_auth_request(
                post(
                    "/auth/domains/update",
                    { domain_id, name: "Renamed site", slug: "renamed-site" },
                    cookie
                )
            )
        )
        expect(updated.status).toBe(200)
        expect(await updated.json()).toMatchObject({
            domains: expect.arrayContaining([
                expect.objectContaining({ slug: "renamed-site" }),
            ]),
        })

        await pg.query(
            "UPDATE domains SET development_deployment_id='existing-provider' WHERE id=$1",
            [domain_id]
        )
        const deployed_edit = await run(
            handle_auth_request(
                post(
                    "/auth/domains/update",
                    { domain_id, name: "Still here", slug: "moved-site" },
                    cookie
                )
            )
        )
        expect(deployed_edit.status).toBe(409)
        const deployed_delete = await run(
            handle_auth_request(
                post("/auth/domains/delete", { domain_id }, cookie)
            )
        )
        expect(deployed_delete.status).toBe(409)
        await pg.query(
            "UPDATE domains SET development_deployment_id=NULL WHERE id=$1",
            [domain_id]
        )

        await pg.query(
            "UPDATE domains SET staging_release_id='existing-release' WHERE id=$1",
            [domain_id]
        )
        const released_edit = await run(
            handle_auth_request(
                post(
                    "/auth/domains/update",
                    { domain_id, name: "Still here", slug: "moved-site" },
                    cookie
                )
            )
        )
        expect(released_edit.status).toBe(409)
        await pg.query(
            "UPDATE domains SET staging_release_id=NULL WHERE id=$1",
            [domain_id]
        )

        const deleted = await run(
            handle_auth_request(
                post("/auth/domains/delete", { domain_id }, cookie)
            )
        )
        expect(deleted.status).toBe(200)
        const remaining = await pg.query<{ slug: string }>(
            "SELECT slug FROM domains WHERE organization_id=$1 ORDER BY slug",
            [personal.rows[0]?.id]
        )
        expect(remaining.rows).toEqual([{ slug: "new-site" }])
        const final_domain = await pg.query<{ id: string }>(
            "SELECT id FROM domains WHERE slug='new-site'"
        )
        const final_delete = await run(
            handle_auth_request(
                post(
                    "/auth/domains/delete",
                    { domain_id: final_domain.rows[0]?.id },
                    cookie
                )
            )
        )
        expect(final_delete.status).toBe(409)
    })

    it("creates a personal organization on first root-domain write for an older account", async () => {
        const tenant = await seed("first")
        const existing = await pg.query<{ id: string }>(
            "SELECT personal_organization_id AS id FROM users WHERE id=$1",
            [tenant.account_id]
        )
        await pg.query(
            "UPDATE users SET personal_organization_id=NULL WHERE id=$1",
            [tenant.account_id]
        )
        await pg.query("DELETE FROM organizations WHERE id=$1", [
            existing.rows[0]?.id,
        ])
        const signed_in = await run(
            handle_auth_request(
                post("/auth/login", { email: "first@example.com", password })
            )
        )
        const cookie = signed_in.headers.get("set-cookie")?.split(";")[0] ?? ""
        const created = await run(
            handle_auth_request(
                post(
                    "/auth/domains/create",
                    { name: "Personal site", slug: "personal-site" },
                    cookie
                )
            )
        )
        expect(created.status).toBe(200)
        const personal = await pg.query<{ kind: string; slug: string }>(
            "SELECT o.kind,d.slug FROM users u JOIN organizations o ON o.id=u.personal_organization_id JOIN domains d ON d.organization_id=o.id WHERE u.id=$1",
            [tenant.account_id]
        )
        expect(personal.rows).toEqual([
            { kind: "personal", slug: "personal-site" },
        ])
    })

    it("authenticates, stores only a token hash, revokes, and rejects malformed cookies", async () => {
        const tenant = await seed("first")
        const response = await run(
            handle_auth_request(
                post("/auth/login", { email: "first@example.com", password })
            )
        )
        expect(response.status).toBe(200)
        const set_cookie = response.headers.get("set-cookie") ?? ""
        expect(set_cookie).toContain("HttpOnly")
        expect(set_cookie).toContain("Secure")
        expect(set_cookie).not.toContain("Domain=")
        const cookie = set_cookie.split(";")[0] ?? ""
        const me = await run(
            handle_auth_request(
                new Request("https://urm.test/auth/me", { headers: { cookie } })
            )
        )
        expect(await me.json()).toMatchObject({
            account_id: tenant.account_id,
            contact_id: tenant.contact_id,
            profile: {
                id: tenant.account_id,
                email: "first@example.com",
                display_name: "first",
                image_url: null,
            },
        })
        const sessions = await pg.query<{ token_hash: string }>(
            "SELECT token_hash FROM account_sessions"
        )
        expect(cookie).not.toContain(sessions.rows[0]?.token_hash)
        expect(sessions.rows[0]?.token_hash).toMatch(/^[a-f0-9]{64}$/)
        const logout = await run(
            handle_auth_request(post("/auth/logout", {}, cookie))
        )
        expect(logout.status).toBe(200)
        const revoked = await run(
            handle_auth_request(
                new Request("https://urm.test/auth/me", { headers: { cookie } })
            )
        )
        expect(revoked.status).toBe(401)
        const malformed = await run(
            handle_auth_request(
                new Request("https://urm.test/auth/me", {
                    headers: { cookie: "urm_account=%ZZ" },
                })
            )
        )
        expect(malformed.status).toBe(401)
    })

    it("requires an account session and limits breach checks in PostgreSQL", async () => {
        await seed("first")
        const anonymous = await run(
            handle_auth_request(
                post("/auth/breach-check", { email: "not-an-email" })
            )
        )
        expect(anonymous.status).toBe(401)
        const signed_in = await run(
            handle_auth_request(
                post("/auth/login", { email: "first@example.com", password })
            )
        )
        const cookie = signed_in.headers.get("set-cookie")?.split(";")[0] ?? ""
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const result = await run(
                handle_auth_request(
                    post(
                        "/auth/breach-check",
                        { email: "not-an-email" },
                        cookie
                    )
                )
            )
            expect(result.status).toBe(200)
            expect(await result.json()).toMatchObject({
                status: "error",
                message: "Enter a valid email address.",
            })
        }
        const limited = await run(
            handle_auth_request(
                post("/auth/breach-check", { email: "not-an-email" }, cookie)
            )
        )
        expect(limited.status).toBe(200)
        expect(await limited.json()).toMatchObject({
            status: "error",
            message: "Too many checks. Try again in one minute.",
        })
        const attempts = await pg.query<{ attempts: number }>(
            "SELECT attempts FROM account_login_attempts WHERE key LIKE 'breach:user:%'"
        )
        expect(attempts.rows).toEqual([{ attempts: 6 }])
    })

    it("enforces CSRF, rate limits, expiry and disabled accounts", async () => {
        await seed("first")
        const no_csrf = await run(
            handle_auth_request(
                new Request("https://urm.test/auth/login", { method: "POST" })
            )
        )
        expect(no_csrf.status).toBe(403)
        const invalid = await run(
            handle_auth_request(
                post("/auth/login", {
                    email: "first@example.com",
                    password: "wrong",
                })
            )
        )
        expect(invalid.status).toBe(401)
        const session = await login("first")
        await pg.exec("UPDATE account_sessions SET expires_at = 0")
        expect(
            (await run(Effect.result(authenticate_token(session.token))))._tag
        ).toBe("Failure")
        const second = await login("first")
        await pg.exec("UPDATE auth_accounts SET disabled_at = 1")
        expect(
            (await run(Effect.result(authenticate_token(second.token))))._tag
        ).toBe("Failure")
        await pg.exec("UPDATE account_login_attempts SET attempts = 10")
        expect(
            (
                await run(
                    handle_auth_request(
                        post("/auth/login", {
                            email: "first@example.com",
                            password,
                        })
                    )
                )
            ).status
        ).toBe(429)
    })

    it("runs create, rename and fresh reads through HTTP RPC and the Foldkit Remote Model", async () => {
        const tenant = await seed("first")
        const session = await login("first")
        const id = randomUUID()
        const layer = contacts_client_layer(
            `https://urm.test/api/rpc?domain_id=${tenant.domain_id}`,
            `urm_account=${session.token}`,
            fetch_local
        )
        const program = Effect.gen(function* () {
            const created = ContactsData.mutate(
                ContactsApp.initial,
                CreateRemoteContact,
                {
                    id,
                    domain_id: tenant.domain_id,
                    name: "Ada",
                    email: "ada@example.com",
                }
            )
            const settled = yield* created.command.effect
            expect(settled._tag).toBe("MutationSucceeded")
            const model = ContactsData.reduce(created.model, settled)
            const rename = ContactsData.mutate(model, RenameRemoteContact, {
                id,
                domain_id: tenant.domain_id,
                name: "Ada Lovelace",
            })
            const renamed = yield* rename.command.effect
            expect(renamed._tag).toBe("MutationSucceeded")
            const page = contacts_page(tenant.domain_id)
            const fresh = yield* ContactsData.prefetch(
                ContactsApp.initial,
                page
            )
            expect(page.read(fresh)._tag).toBe("Ready")
            expect(JSON.stringify(page.read(fresh))).toContain("Ada Lovelace")
            expect(JSON.stringify(page.read(fresh))).toContain(
                "ada@example.com"
            )
        })
        await Effect.runPromise(program.pipe(Effect.provide(layer)))
    })

    it("rejects cross-tenant reads/writes, read-only writes, suspended membership and disabled Mail", async () => {
        const first = await seed("first")
        const second = await seed("second")
        const session = await login("first")
        const principal = await run(authenticate_token(session.token))
        const handlers = contacts_remote_handlers({
            ...principal,
            domain_id: first.domain_id,
        })
        const denied = await run(
            Effect.result(
                handlers.FoldkitRemoteQuery({
                    query: "DomainContacts",
                    input: { domain_id: second.domain_id },
                    window: {},
                })
            )
        )
        expect(denied._tag).toBe("Failure")
        const foreign = await run(
            handle_rpc_request(
                query_request(second.domain_id, `urm_account=${session.token}`)
            )
        )
        expect(foreign.status).toBe(200)
        expect(await foreign.text()).toContain("Failure")
        await pg.query(
            "UPDATE organization_members SET role = 'member' WHERE user_id = $1",
            [first.account_id]
        )
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainContacts",
                            input: { domain_id: first.domain_id },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Success")
        const denied_write = await run(
            Effect.result(
                handlers.FoldkitRemoteMutate({
                    requestId: "write",
                    mutation: "RenameContact",
                    input: {
                        id: first.contact_id,
                        domain_id: first.domain_id,
                        name: "Changed",
                    },
                })
            )
        )
        expect(denied_write._tag).toBe("Failure")
        await pg.query(
            "UPDATE organization_members SET status = 'suspended' WHERE user_id = $1",
            [first.account_id]
        )
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainContacts",
                            input: { domain_id: first.domain_id },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
        await pg.query(
            "UPDATE organization_members SET status = 'active' WHERE user_id = $1",
            [first.account_id]
        )
        await pg.query(
            "UPDATE domains SET enabled_modules = '{}' WHERE id = $1",
            [first.domain_id]
        )
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainContacts",
                            input: { domain_id: first.domain_id },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
        await run(revoke_token(session.token))
    })

    it("makes create retries idempotent and rolls back conflicting addresses", async () => {
        const tenant = await seed("first")
        const session = await login("first")
        const principal = await run(authenticate_token(session.token))
        const handlers = contacts_remote_handlers({
            ...principal,
            domain_id: tenant.domain_id,
        })
        const input = {
            id: randomUUID(),
            domain_id: tenant.domain_id,
            name: "Ada",
            email: "ada@example.com",
        }
        for (let i = 0; i < 2; i++)
            await run(
                handlers.FoldkitRemoteMutate({
                    requestId: "same-create",
                    mutation: "CreateContact",
                    input,
                })
            )
        const failed = await run(
            Effect.result(
                handlers.FoldkitRemoteMutate({
                    requestId: "conflict",
                    mutation: "CreateContact",
                    input: { ...input, id: randomUUID() },
                })
            )
        )
        expect(failed._tag).toBe("Failure")
        const count = await pg.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM contacts"
        )
        expect(count.rows[0]?.count).toBe(2)
        const first = await run(
            handlers.FoldkitRemoteQuery({
                query: "DomainContacts",
                input: { domain_id: tenant.domain_id },
                window: { first: 1 },
            })
        )
        expect(first.edges).toHaveLength(1)
        expect(first.end._tag).toBe("Cursor")
        if (first.end._tag !== "Cursor") throw new Error("Missing cursor")
        const next = await run(
            handlers.FoldkitRemoteQuery({
                query: "DomainContacts",
                input: { domain_id: tenant.domain_id },
                window: { first: 1, after: first.end.cursor },
            })
        )
        expect(next.edges[0]?.id).not.toBe(first.edges[0]?.id)
        expect(next.end._tag).toBe("Terminal")
    })
})

describe("Contacts PostgreSQL action parity", () => {
    it("searches all profile fields and emails with literal text, scoped visibility and filtered cursors", async () => {
        const owner = await seed("search")
        const other = await seed("hidden")
        const session = await login("search")
        const layer = contacts_client_layer(
            `https://urm.test/api/rpc?domain_id=${owner.domain_id}`,
            `urm_account=${session.token}`,
            fetch_local
        )
        for (let index = 0; index < 28; index++) {
            const id = `search-${String(index).padStart(2, "0")}`
            await pg.query(
                "INSERT INTO contacts (id,name,tel,title,company,created_at,updated_at) VALUES ($1,$2,'555-0189','Researcher','100%_literal',1,1)",
                [id, `Searchable ${index}`]
            )
            await pg.query(
                "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at,deleted_at) VALUES ($1,$2,$1,$3,1,1,$4)",
                [
                    id,
                    index === 27 ? other.domain_id : owner.domain_id,
                    index === 26 ? "archived" : "active",
                    index === 26 ? 1 : null,
                ]
            )
        }
        await pg.query(
            "INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES ('secondary','search-25','secondary@example.com',false,1,1)"
        )
        const search = async (term: string, after: string | null = null) => {
            const projection = searched_page(owner.domain_id, after, term)
            const loaded = await Effect.runPromise(
                BrowserData.prefetch(
                    { remote: Remote.initial },
                    projection
                ).pipe(Effect.provide(layer))
            )
            const result = projection.read(loaded)
            if (result._tag !== "Ready") throw new Error("Search did not load")
            return result.value
        }
        const first = await search(" SEARCHABLE ")
        expect(first.items).toHaveLength(25)
        expect(first.hasNext).toBe(true)
        const second = await search(
            "searchable",
            first.items.at(-1)?.id ?? null
        )
        expect(second.items.map((item) => item.id)).toEqual(["search-25"])
        expect(second.hasNext).toBe(false)
        for (const term of ["555-0189", "RESEARCHER", "100%_literal", "%", "_"])
            expect((await search(term)).items.map((item) => item.id)).toEqual(
                first.items.map((item) => item.id)
            )
        expect(
            (await search("SECONDARY@")).items.map((item) => item.id)
        ).toEqual(["search-25"])
        expect((await search("absent")).items).toEqual([])
        expect((await search("' OR true --")).items).toEqual([])
        await pg.query("UPDATE contacts SET deleted_at=2 WHERE id='search-25'")
        expect((await search("secondary@")).items).toEqual([])
    }, 30_000)

    it("updates every profile field and swaps primary emails atomically, then removes only the current domain link", async () => {
        const owner = await seed("actions")
        const other = await seed("other")
        const session = await login("actions")
        const layer = contacts_client_layer(
            `https://urm.test/api/rpc?domain_id=${owner.domain_id}`,
            `urm_account=${session.token}`,
            fetch_local
        )
        const write = <A, E>(effect: Effect.Effect<A, E, RemoteClient>) =>
            Effect.runPromise(effect.pipe(Effect.provide(layer)))
        const id = randomUUID()
        const details = {
            name: "Ada",
            tel: "123",
            title: "Engineer",
            company: "Engine",
            email_addresses: [
                {
                    email: Schema.decodeUnknownSync(Email)("ada@example.com"),
                    is_primary: true,
                },
                {
                    email: Schema.decodeUnknownSync(Email)(
                        "ada.work@example.com"
                    ),
                    is_primary: false,
                },
            ],
        }
        await write(
            Remote.mutate(
                CreateRemoteContact,
                {
                    id,
                    domain_id: owner.domain_id,
                    ...details,
                    email: Schema.decodeUnknownSync(Email)("ada@example.com"),
                },
                randomUUID()
            )
        )
        const before = await pg.query<{ id: string }>(
            "SELECT id FROM contact_email_addresses WHERE email='ada.work@example.com'"
        )
        const changed = {
            ...details,
            name: "Ada Lovelace",
            tel: null,
            title: "Programmer",
            company: null,
            email_addresses: [
                {
                    email: Schema.decodeUnknownSync(Email)(
                        "ada.work@example.com"
                    ),
                    is_primary: true,
                },
                {
                    email: Schema.decodeUnknownSync(Email)(
                        "ada.new@example.com"
                    ),
                    is_primary: false,
                },
            ],
        }
        await write(
            Remote.mutate(
                UpdateRemoteContact,
                { id, domain_id: owner.domain_id, ...changed },
                randomUUID()
            )
        )
        const updated = await pg.query(
            "SELECT name,tel,title,company FROM contacts WHERE id=$1",
            [id]
        )
        expect(updated.rows[0]).toEqual({
            name: "Ada Lovelace",
            tel: null,
            title: "Programmer",
            company: null,
        })
        const emails = await pg.query(
            "SELECT id,email,is_primary FROM contact_email_addresses WHERE contact_id=$1 ORDER BY email",
            [id]
        )
        expect(emails.rows).toEqual([
            expect.objectContaining({
                email: Schema.decodeUnknownSync(Email)("ada.new@example.com"),
                is_primary: false,
            }),
            {
                id: before.rows[0]?.id,
                email: Schema.decodeUnknownSync(Email)("ada.work@example.com"),
                is_primary: true,
            },
        ])
        const conflict = await write(
            Effect.result(
                Remote.mutate(
                    UpdateRemoteContact,
                    {
                        id,
                        domain_id: owner.domain_id,
                        ...changed,
                        name: "Must roll back",
                        email_addresses: [
                            {
                                email: Schema.decodeUnknownSync(Email)(
                                    "other@example.com"
                                ),
                                is_primary: true,
                            },
                        ],
                    },
                    randomUUID()
                )
            )
        )
        expect(conflict._tag).toBe("Failure")
        expect(
            (await pg.query("SELECT name FROM contacts WHERE id=$1", [id]))
                .rows[0]
        ).toEqual({ name: "Ada Lovelace" })
        expect(
            (
                await pg.query(
                    "SELECT email,is_primary FROM contact_email_addresses WHERE contact_id=$1 ORDER BY email",
                    [id]
                )
            ).rows
        ).toEqual([
            {
                email: Schema.decodeUnknownSync(Email)("ada.new@example.com"),
                is_primary: false,
            },
            {
                email: Schema.decodeUnknownSync(Email)("ada.work@example.com"),
                is_primary: true,
            },
        ])
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            UpdateRemoteContact,
                            {
                                id,
                                domain_id: owner.domain_id,
                                ...changed,
                                email_addresses: [
                                    {
                                        email: Schema.decodeUnknownSync(Email)(
                                            "x@example.com"
                                        ),
                                        is_primary: false,
                                    },
                                ],
                            },
                            randomUUID()
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
        const other_link = randomUUID()
        await pg.query(
            "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',1,1)",
            [other_link, other.domain_id, id]
        )
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            DeleteRemoteContact,
                            { id: other_link, domain_id: owner.domain_id },
                            randomUUID()
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
        await write(
            Remote.mutate(
                DeleteRemoteContact,
                { id, domain_id: owner.domain_id },
                randomUUID()
            )
        )
        await write(
            Remote.mutate(
                DeleteRemoteContact,
                { id, domain_id: owner.domain_id },
                randomUUID()
            )
        )
        expect(
            (
                await pg.query("SELECT deleted_at FROM contacts WHERE id=$1", [
                    id,
                ])
            ).rows[0]
        ).toEqual({ deleted_at: null })
        expect(
            (
                await pg.query(
                    "SELECT email FROM contact_email_addresses WHERE contact_id=$1",
                    [id]
                )
            ).rows
        ).toHaveLength(2)
        const other_session = await login("other")
        const other_layer = contacts_client_layer(
            `https://urm.test/api/rpc?domain_id=${other.domain_id}`,
            `urm_account=${other_session.token}`,
            fetch_local
        )
        await Effect.runPromise(
            Remote.mutate(
                DeleteRemoteContact,
                { id: other_link, domain_id: other.domain_id },
                randomUUID()
            ).pipe(Effect.provide(other_layer))
        )
        expect(
            (
                await pg.query(
                    "SELECT email FROM contact_email_addresses WHERE contact_id=$1",
                    [id]
                )
            ).rows
        ).toHaveLength(0)
        expect(
            (
                await pg.query(
                    "SELECT deleted_at IS NOT NULL AS deleted FROM contacts WHERE id=$1",
                    [id]
                )
            ).rows[0]
        ).toEqual({ deleted: true })
        expect(
            (await pg.query("SELECT id FROM auth_accounts")).rows
        ).toHaveLength(2)
    })

    it("imports through the same HTTP boundary with durable receipts and all-or-nothing conflicts", async () => {
        const owner = await seed("importer")
        const session = await login("importer")
        const layer = contacts_client_layer(
            `https://urm.test/api/rpc?domain_id=${owner.domain_id}`,
            `urm_account=${session.token}`,
            fetch_local
        )
        const write = <A, E>(effect: Effect.Effect<A, E, RemoteClient>) =>
            Effect.runPromise(effect.pipe(Effect.provide(layer)))
        const input = {
            domain_id: owner.domain_id,
            source_id: "postgres:upload-1",
            rows: [
                {
                    name: "Ada",
                    email: "ADA@example.com",
                    tel: "123",
                    title: "Engineer",
                    company: "Engine",
                },
            ],
        }
        const first = await write(
            Remote.mutate(ImportRemoteContacts, input, randomUUID())
        )
        expect(first.output).toEqual({ imported: 1, already_imported: false })
        expect(
            (
                await write(
                    Remote.mutate(ImportRemoteContacts, input, randomUUID())
                )
            ).output
        ).toEqual({ imported: 1, already_imported: true })
        expect(
            (await pg.query("SELECT source_id FROM contact_import_receipts"))
                .rows
        ).toHaveLength(1)
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            ImportRemoteContacts,
                            {
                                ...input,
                                rows: [
                                    {
                                        name: "Changed",
                                        email: Schema.decodeUnknownSync(Email)(
                                            "different@example.com"
                                        ),
                                    },
                                ],
                            },
                            randomUUID()
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
        const conflict = await write(
            Effect.result(
                Remote.mutate(
                    ImportRemoteContacts,
                    {
                        ...input,
                        source_id: "postgres:upload-2",
                        rows: [
                            {
                                name: "New",
                                email: Schema.decodeUnknownSync(Email)(
                                    "new@example.com"
                                ),
                            },
                            {
                                name: "Duplicate",
                                email: Schema.decodeUnknownSync(Email)(
                                    "ada@example.com"
                                ),
                            },
                        ],
                    },
                    randomUUID()
                )
            )
        )
        expect(conflict._tag).toBe("Failure")
        expect(
            (
                await pg.query(
                    "SELECT id FROM contact_email_addresses WHERE email='new@example.com'"
                )
            ).rows
        ).toHaveLength(0)
        expect(
            (await pg.query("SELECT source_id FROM contact_import_receipts"))
                .rows
        ).toHaveLength(1)
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            ImportRemoteContacts,
                            { ...input, source_id: "postgres:upload-3" },
                            randomUUID()
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
    })
})

describe("PostgreSQL Members", () => {
    it("drives the existing Members forms through HTTP RPC without granting account access", async () => {
        const owner = await seed("members-browser")
        const session = await login("members-browser")
        const cookie = `urm_account=${session.token}`
        const fetch_members: typeof fetch = async (input, init) => {
            const request = new Request(input, init)
            request.headers.set("cookie", cookie)
            return run(
                new URL(request.url).pathname.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : new URL(request.url).pathname.startsWith("/api/uploads")
                      ? upload_request(request)
                      : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_members
        )
        const settle = async (
            result: ReturnType<typeof MembersBrowser.update>
        ) => {
            let model = result.model
            for (const command of result.commands ?? []) {
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                model = MembersBrowser.update(model, message).model
            }
            return model
        }
        let model = await settle(
            MembersBrowser.synchronize(MembersBrowser.initial, {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(model.error).toBeNull()
        model = await settle(
            MembersBrowser.update(
                model,
                MembersBrowser.Message.Interaction({
                    message: MembersManage.ClickedCreateMember(),
                })
            )
        )
        for (const message of [
            MembersManage.UpdatedMemberDraft({
                field: "first",
                value: " Ada ",
            }),
            MembersManage.UpdatedMemberDraft({
                field: "last",
                value: "Lovelace",
            }),
            MembersManage.UpdatedMemberDraft({
                field: "avatar",
                value: "https://example.com/ada.png",
            }),
            MembersManage.UpdatedMemberDraft({
                field: "twitter",
                value: "ada",
            }),
            MembersManage.UpdatedMemberDraft({
                field: "notes",
                value: "  Notes\nkept verbatim  ",
            }),
        ])
            model = MembersBrowser.update(
                model,
                MembersBrowser.Message.Interaction({ message })
            ).model
        model = MembersBrowser.update(
            model,
            MembersBrowser.Message.Interaction({
                message: MembersManage.GotAvatarDropMessage({
                    message: {
                        _tag: "DroppedFiles",
                        files: [
                            new File([png], "avatar.png", {
                                type: "image/png",
                            }),
                        ],
                    },
                }),
            })
        ).model
        model = await settle(
            MembersBrowser.update(
                model,
                MembersBrowser.Message.Interaction({
                    message: MembersManage.ClickedUploadAvatar(),
                })
            )
        )
        expect(model.upload_busy).toBe(false)
        expect(model.error).toBeNull()
        expect(model.draft.avatar).toMatch(/^\/api\/uploads\//)
        const avatar = model.draft.avatar
        const create_id = model.create_id
        model = await settle(
            MembersBrowser.update(
                model,
                MembersBrowser.Message.Interaction({
                    message: MembersManage.SubmittedMemberForm(),
                })
            )
        )
        expect(model.error).toBeNull()
        expect(MembersBrowser.records(model)).toMatchObject([
            {
                id: create_id,
                avatar,
                first: "Ada",
                last: "Lovelace",
                twitter: "ada",
                notes: "  Notes\nkept verbatim  ",
            },
        ])
        const member = MembersBrowser.records(model)[0]
        if (member === undefined) throw new Error("Member not created")
        model = MembersBrowser.update(
            model,
            MembersBrowser.Message.Interaction({
                message: MembersManage.ClickedEditMember({
                    memberId: member.id,
                }),
            })
        ).model
        model = MembersBrowser.update(
            model,
            MembersBrowser.Message.Interaction({
                message: MembersManage.UpdatedMemberDraft({
                    field: "last",
                    value: "Byron",
                }),
            })
        ).model
        model = await settle(
            MembersBrowser.update(
                model,
                MembersBrowser.Message.Interaction({
                    message: MembersManage.SubmittedMemberForm(),
                })
            )
        )
        expect(MembersBrowser.records(model)[0]?.last).toBe("Byron")
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1 AND organization_id=$2",
            [owner.account_id, owner.organization_id]
        )
        model = await settle(
            MembersBrowser.update(model, MembersBrowser.Message.Refreshed())
        )
        expect(model.can_write).toBe(false)
        expect(
            MembersBrowser.update(
                model,
                MembersBrowser.Message.Interaction({
                    message: MembersManage.ClickedDeleteMember({
                        memberId: member.id,
                    }),
                })
            ).commands
        ).toBeUndefined()
        await pg.query(
            "UPDATE organization_members SET role='owner' WHERE user_id=$1 AND organization_id=$2",
            [owner.account_id, owner.organization_id]
        )
        model = await settle(
            MembersBrowser.update(model, MembersBrowser.Message.Refreshed())
        )
        expect(model.can_write).toBe(true)
        model = await settle(
            MembersBrowser.update(
                model,
                MembersBrowser.Message.Interaction({
                    message: MembersManage.ClickedDeleteMember({
                        memberId: member.id,
                    }),
                })
            )
        )
        expect(model.error).toBeNull()
        expect(MembersBrowser.records(model)).toEqual([])
        expect(
            (await pg.query("SELECT id FROM auth_accounts")).rows
        ).toHaveLength(1)
        const memberships = await pg.query<{ kind: string; role: string }>(
            "SELECT o.kind,m.role FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1",
            [owner.account_id]
        )
        expect(memberships.rows).toHaveLength(2)
        expect(memberships.rows).toEqual(
            expect.arrayContaining([
                { kind: "customer", role: "owner" },
                { kind: "personal", role: "owner" },
            ])
        )
    }, 30_000)

    it("enforces scope and role on reads/writes and makes create/delete retries safe", async () => {
        const owner = await seed("members-owner")
        const other = await seed("members-other")
        const session = await login("members-owner")
        const principal = await run(authenticate_token(session.token))
        const handlers = members_remote_handlers({
            ...principal,
            domain_id: owner.domain_id,
        })
        const layer = Remote.clientLayer(handlers)
        const write = <A, E>(effect: Effect.Effect<A, E, RemoteClient>) =>
            run(effect.pipe(Effect.provide(layer)))
        const input = {
            id: randomUUID(),
            domain_id: owner.domain_id,
            first: "Grace",
            last: "Hopper",
            twitter: null,
            avatar: null,
            notes: null,
        }
        await write(Remote.mutate(CreateMember, input, "create"))
        await write(Remote.mutate(CreateMember, input, "retry"))
        expect((await pg.query("SELECT id FROM members")).rows).toHaveLength(1)
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            CreateMember,
                            { ...input, first: "Conflict" },
                            "conflict"
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            UpdateMember,
                            { ...input, domain_id: other.domain_id },
                            "foreign"
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
        const foreign_id = randomUUID()
        await pg.query(
            "INSERT INTO members (id,domain_id,first,last,created_at,updated_at) VALUES ($1,$2,'Foreign','Member',1,1)",
            [foreign_id, other.domain_id]
        )
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            UpdateMember,
                            { ...input, id: foreign_id },
                            "foreign-id"
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
        await write(
            Remote.mutate(
                DeleteMember,
                { id: foreign_id, domain_id: owner.domain_id },
                "foreign-delete"
            )
        )
        expect(
            (await pg.query("SELECT id FROM members WHERE id=$1", [foreign_id]))
                .rows
        ).toHaveLength(1)
        const foreign_read = await run(
            handlers.FoldkitRemoteRead({
                version: REMOTE_PROTOCOL_VERSION,
                requests: [
                    {
                        entity: "Member",
                        id: foreign_id,
                        fields: ["id", "first"],
                    },
                ],
            })
        )
        expect(JSON.stringify(foreign_read)).not.toContain("Foreign")
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainMembers",
                            input: { domain_id: other.domain_id },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            CreateMember,
                            { ...input, id: randomUUID(), first: " " },
                            "invalid"
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (
                await write(
                    Effect.result(
                        Remote.mutate(
                            DeleteMember,
                            { id: input.id, domain_id: owner.domain_id },
                            "readonly"
                        )
                    )
                )
            )._tag
        ).toBe("Failure")
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainMembers",
                            input: { domain_id: owner.domain_id },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Success")
        await pg.query(
            "UPDATE organization_members SET role='owner' WHERE user_id=$1",
            [owner.account_id]
        )
        await write(
            Remote.mutate(
                DeleteMember,
                { id: input.id, domain_id: owner.domain_id },
                "delete"
            )
        )
        await write(
            Remote.mutate(
                DeleteMember,
                { id: input.id, domain_id: owner.domain_id },
                "delete-again"
            )
        )
        await pg.query(
            "UPDATE organization_members SET status='suspended' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainMembers",
                            input: { domain_id: owner.domain_id },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
        const unauthenticated = await run(
            handle_rpc_request(query_request(owner.domain_id))
        )
        expect(await unauthenticated.text()).toContain("AuthorizationError")
        expect(
            (
                await run(
                    handle_rpc_request(
                        new Request("https://urm.test/api/rpc", {
                            method: "POST",
                        })
                    )
                )
            ).status
        ).toBe(403)
    }, 30_000)

    it("preserves the bounded 200-member list and newest-updated ordering", async () => {
        const owner = await seed("members-limit")
        const session = await login("members-limit")
        const principal = await run(authenticate_token(session.token))
        await pg.query(
            "INSERT INTO members (id,domain_id,first,last,created_at,updated_at) SELECT 'imported-' || n,$1,'Imported','Member',n,n FROM generate_series(1,201) n",
            [owner.domain_id]
        )
        const layer = Remote.clientLayer(
            members_remote_handlers({
                ...principal,
                domain_id: owner.domain_id,
            })
        )
        const projection = MembersBrowser.members_page(owner.domain_id)
        const loaded = await run(
            MembersBrowser.Data.prefetch(
                { remote: Remote.initial },
                projection
            ).pipe(Effect.provide(layer))
        )
        const result = projection.read(loaded)
        if (result._tag !== "Ready") throw new Error("Members not loaded")
        expect(result.value.items).toHaveLength(200)
        expect(result.value.items[0]?.id).toBe("imported-201")
        expect(result.value.items.at(-1)?.id).toBe("imported-2")
    }, 30_000)
})

describe("account-authenticated uploads", () => {
    it("stores private workspace images and rejects unauthorized uploads and reads", async () => {
        const owner = await seed("upload-owner")
        const stranger = await seed("upload-stranger")
        const owner_session = await login("upload-owner")
        const stranger_session = await login("upload-stranger")
        const cookie = `urm_account=${owner_session.token}`
        const put = (
            body: Uint8Array = png,
            content_type = "image/png",
            auth = cookie,
            csrf = true
        ) =>
            new Request(
                `https://urm.test/api/uploads?domain_id=${owner.domain_id}`,
                {
                    method: "POST",
                    headers: {
                        cookie: auth,
                        "content-type": content_type,
                        ...(csrf
                            ? { "x-requested-with": "XMLHttpRequest" }
                            : {}),
                    },
                    body: new Blob([Uint8Array.from(body)]),
                }
            )
        expect(
            (await run(upload_request(put(png, "image/png", "")))).status
        ).toBe(401)
        expect(
            (await run(upload_request(put(png, "image/png", cookie, false))))
                .status
        ).toBe(403)
        expect(
            (
                await run(
                    upload_request(
                        put(
                            png,
                            "image/png",
                            `urm_account=${stranger_session.token}`
                        )
                    )
                )
            ).status
        ).toBe(403)
        expect(
            (await run(upload_request(put(png, "image/svg+xml")))).status
        ).toBe(415)
        expect(
            (await run(upload_request(put(new Uint8Array([1, 2, 3]))))).status
        ).toBe(415)
        expect(
            (
                await run(
                    upload_request(put(new Uint8Array(image_upload_limit + 1)))
                )
            ).status
        ).toBe(413)
        expect(uploaded_objects.size).toBe(0)
        const uploaded = await run(upload_request(put()))
        expect(uploaded.status).toBe(201)
        const image = Schema.decodeUnknownSync(UploadedImage)(
            await uploaded.json()
        )
        expect([...uploaded_objects.keys()][0]).toContain(
            `domains/${owner.domain_id}/images/`
        )
        expect([...uploaded_objects.values()][0]).toEqual(png)
        const get = (auth: string) =>
            run(
                upload_request(
                    new Request(new URL(image.url, "https://urm.test"), {
                        headers: { cookie: auth },
                    })
                )
            )
        const opened = await get(cookie)
        expect(opened.status).toBe(302)
        expect(opened.headers.get("cache-control")).toBe("no-store")
        expect(opened.headers.get("location")).toContain(
            "https://storage.test/"
        )
        expect(
            (await get(`urm_account=${stranger_session.token}`)).status
        ).toBe(403)
        expect((await get("")).status).toBe(401)
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await run(upload_request(put()))).status).toBe(403)
        expect((await get(cookie)).status).toBe(302)
        await pg.query(
            "UPDATE organization_members SET status='suspended' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await get(cookie)).status).toBe(403)
        await run(revoke_token(owner_session.token))
        expect((await get(cookie)).status).toBe(401)
        expect(stranger.domain_id).not.toBe(owner.domain_id)
    })

    it("reports a storage failure without returning an image URL", async () => {
        const owner = await seed("storage-failure")
        const session = await login("storage-failure")
        const result = await run(
            handle_upload_request(
                new Request(
                    `https://urm.test/api/uploads?domain_id=${owner.domain_id}`,
                    {
                        method: "POST",
                        headers: {
                            cookie: `urm_account=${session.token}`,
                            "content-type": "image/png",
                            "x-requested-with": "XMLHttpRequest",
                        },
                        body: png,
                    }
                )
            ).pipe(
                Effect.provideService(UploadStorage, {
                    ...upload_storage,
                    put: () =>
                        Effect.fail(
                            new UploadError({
                                status: 503,
                                message:
                                    "Image storage is unavailable. Try again.",
                            })
                        ),
                })
            )
        )
        expect(result.status).toBe(503)
        expect(await result.json()).toEqual({
            error: "Image storage is unavailable. Try again.",
        })
    })
})

describe("PostgreSQL Media library", () => {
    it("uploads, edits, tags and deletes through the existing Media forms and shared RPC", async () => {
        const owner = await seed("media-browser")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Media']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("media-browser")
        const cookie = `urm_account=${session.token}`
        const fetch_media: typeof fetch = (input, init) => {
            const request = new Request(input, init)
            request.headers.set("cookie", cookie)
            const path = new URL(request.url).pathname
            return run(
                path.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : path.startsWith("/api/uploads")
                      ? upload_request(request)
                      : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_media
        )
        const settle = async ([
            initial,
            commands,
        ]: MediaBrowser.UpdateReturn) => {
            let model = initial
            for (const command of commands)
                model = MediaBrowser.update(
                    model,
                    await Effect.runPromise(
                        command.effect.pipe(Effect.provide(layer))
                    )
                )[0]
            return model
        }
        let model = await settle(
            MediaBrowser.synchronize(MediaBrowser.init("/media/library"), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(model.ui.error).toBeNull()
        model = await settle(
            MediaBrowser.update(model, {
                _tag: "RequestedUploadImages",
                files: [new File([png], "gallery.png", { type: "image/png" })],
            })
        )
        expect(model.ui.error).toBeNull()
        let image = MediaBrowser.project(model).images[0]
        if (image === undefined)
            throw new Error("Upload did not create an image")
        expect(image.url).toContain(`/api/uploads/${owner.domain_id}/media/`)
        expect(
            (await fetch_media(new URL(image.url, "https://urm.test"))).status
        ).toBe(302)
        const edits: ReadonlyArray<MediaBrowser.Message> = [
            { _tag: "OpenedImageEditor", imageId: image.id },
            { _tag: "EditingAltChanged", value: "Accessible description" },
            { _tag: "EditingTextChanged", value: "A caption" },
            { _tag: "EditingCategoryChanged", value: "events" },
            { _tag: "ClickedSaveImageEdits" },
        ]
        for (const message of edits)
            model = await settle(MediaBrowser.update(model, message))
        image = MediaBrowser.project(model).images[0]
        expect(image).toMatchObject({
            alt: "Accessible description",
            text: "A caption",
            category: "events",
        })
        if (image === undefined) throw new Error("Image disappeared")
        model = await settle(
            MediaBrowser.update(model, {
                _tag: "OpenedImageEditor",
                imageId: image.id,
            })
        )
        model = await settle(
            MediaBrowser.update(model, {
                _tag: "NewTagNameChanged",
                value: "Featured",
            })
        )
        model = await settle(
            MediaBrowser.update(model, { _tag: "SubmittedNewTag" })
        )
        expect(model.ui.error).toBeNull()
        expect(MediaBrowser.project(model).tags).toMatchObject([
            { name: "Featured" },
        ])
        expect(MediaBrowser.project(model).entityTags).toHaveLength(1)
        model = await settle(
            MediaBrowser.update(model, {
                _tag: "ClickedDeleteImage",
                imageId: image.id,
            })
        )
        expect(MediaBrowser.project(model).images).toHaveLength(0)
        expect(MediaBrowser.project(model).entityTags).toHaveLength(0)
        expect(MediaBrowser.project(model).tags).toHaveLength(1)
        // Metadata deletion retains storage bytes, just like the source implementation.
        expect(uploaded_objects.size).toBe(1)
    })

    it("enforces Media module scope, atomic reorders, tag isolation and video slug uniqueness", async () => {
        const owner = await seed("media-owner")
        const other = await seed("media-other")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Mail']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("media-owner")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const write = (action: MediaAction, domain_id = owner.domain_id) =>
            run(
                Effect.result(
                    handlers.FoldkitRemoteMutate({
                        requestId: randomUUID(),
                        mutation: "ChangeMedia",
                        input: { domain_id, action },
                    })
                )
            )
        const image: MediaAction = {
            _tag: "create_image",
            id: randomUUID(),
            url: "https://example.com/image.png",
            alt: "",
            text: "",
            category: null,
            width: null,
            height: null,
            order_position: 0,
        }
        expect((await write(image))._tag).toBe("Failure")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Media']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        expect((await write(image))._tag).toBe("Success")
        expect((await write(image))._tag).toBe("Success")
        expect(
            (
                await write({
                    ...image,
                    url: "https://example.com/different.png",
                })
            )._tag
        ).toBe("Failure")
        expect((await write(image, other.domain_id))._tag).toBe("Failure")
        expect(
            (
                await write({
                    _tag: "reorder_images",
                    positions: [
                        { id: image.id, order_position: 9 },
                        { id: "missing", order_position: 1 },
                    ],
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await pg.query<{ order_position: number }>(
                    "SELECT order_position FROM images WHERE id=$1",
                    [image.id]
                )
            ).rows[0]?.order_position
        ).toBe(0)
        await pg.query(
            "INSERT INTO tags (id,domain_id,name,color,created_at,updated_at) VALUES ('foreign-tag',$1,'Foreign','red',1,1)",
            [other.domain_id]
        )
        expect(
            (
                await write({
                    _tag: "add_tag",
                    image_id: image.id,
                    tag_id: "foreign-tag",
                })
            )._tag
        ).toBe("Failure")
        const video: MediaAction = {
            _tag: "create_video",
            id: randomUUID(),
            slug: "intro",
            title: "Intro",
            embed_url: "https://www.youtube.com/embed/abcdefghijk",
            thumbnail_src: "https://example.com/thumb.jpg",
            youtube_id: "abcdefghijk",
            order_position: 0,
        }
        expect((await write(video))._tag).toBe("Success")
        expect((await write(video))._tag).toBe("Success")
        expect((await write({ ...video, id: randomUUID() }))._tag).toBe(
            "Failure"
        )
        expect(
            (
                await write({
                    _tag: "update_video",
                    id: video.id,
                    slug: "welcome",
                    title: "Welcome",
                    embed_url: video.embed_url,
                    thumbnail_src: video.thumbnail_src,
                    youtube_id: null,
                })
            )._tag
        ).toBe("Success")
        expect(
            (
                await write({
                    _tag: "reorder_videos",
                    positions: [{ id: video.id, order_position: 4 }],
                })
            )._tag
        ).toBe("Success")
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await write({ _tag: "delete_video", id: video.id }))._tag).toBe(
            "Failure"
        )
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainMedia",
                            input: { domain_id: owner.domain_id },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Success")
        await pg.query(
            "UPDATE organization_members SET role='owner' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await write({ _tag: "delete_video", id: video.id }))._tag).toBe(
            "Success"
        )
        expect((await write({ _tag: "delete_video", id: video.id }))._tag).toBe(
            "Success"
        )
        await run(revoke_token(session.token))
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainMedia",
                            input: { domain_id: owner.domain_id },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
    })
})

describe("PostgreSQL Tags", () => {
    it("uses the original forms through shared RPC and isolates writes and managed tags", async () => {
        const owner = await seed("tags-browser")
        const other = await seed("tags-other")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Tags']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("tags-browser")
        const cookie = `urm_account=${session.token}`
        const save_requests: string[] = []
        const fetch_tags: typeof fetch = (input, init) => {
            const request = new Request(input, init)
            save_requests.push(new URL(request.url).pathname)
            request.headers.set("cookie", cookie)
            return run(
                new URL(request.url).pathname.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_tags
        )
        const settle = async ([
            initial,
            commands,
        ]: TagsBrowser.UpdateReturn) => {
            let model = initial
            const mutation_requests: string[][] = []
            for (const command of commands) {
                if (
                    ![
                        "LoadTagCatalog",
                        "CreateCatalogTag",
                        "ChangeTagCatalog",
                    ].includes(command.name)
                )
                    continue
                const request_start = save_requests.length
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                if (message._tag === "TagsSaved")
                    mutation_requests.push(
                        save_requests
                            .slice(request_start)
                            .filter((path) => !path.startsWith("/api/uploads"))
                    )

                model = TagsBrowser.update(model, message)[0]
            }
            for (const paths of mutation_requests)
                expect(paths).toEqual(["/api/rpc/"])
            return model
        }
        let model = await settle(
            TagsBrowser.synchronize(TagsBrowser.init(), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(model.ui.error).toBeNull()
        expect(
            TagsBrowser.project(model).tags.filter((tag) => tag.kind === "role")
        ).toHaveLength(4)
        const person = TagsBrowser.project(model).tags.find(
            (tag) => tag.kind === "person"
        )
        expect(person?.target_key).toBe(`user:${owner.account_id}`)
        model = await settle(
            TagsBrowser.update(model, {
                _tag: "CreateTagNameChanged",
                value: "Editorial",
            })
        )
        model = await settle(
            TagsBrowser.update(model, { _tag: "ClickedCreateTag" })
        )
        expect(model.ui.error).toBeNull()
        const tag = TagsBrowser.project(model).tags.find(
            (tag) => tag.name === "Editorial"
        )
        if (tag === undefined) throw new Error("Tag was not created")
        model = await settle(
            TagsBrowser.update(model, {
                _tag: "OpenedTagEditor",
                tagId: tag.id,
            })
        )
        model = await settle(
            TagsBrowser.update(model, {
                _tag: "EditingTagNameChanged",
                value: "Featured",
            })
        )
        model = await settle(
            TagsBrowser.update(model, {
                _tag: "EditingTagDescriptionChanged",
                value: "Caption",
            })
        )
        model = await settle(
            TagsBrowser.update(model, { _tag: "ClickedSaveTagEdits" })
        )
        expect(
            TagsBrowser.project(model).tags.find((item) => item.id === tag.id)
        ).toMatchObject({ name: "Featured", description: "Caption" })
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const write = (action: TagAction, domain_id = owner.domain_id) =>
            run(
                Effect.result(
                    handlers.FoldkitRemoteMutate({
                        requestId: randomUUID(),
                        mutation: "ChangeTags",
                        input: { domain_id, action },
                    })
                )
            )
        expect(
            (await write({ _tag: "delete", id: tag.id }, other.domain_id))._tag
        ).toBe("Failure")
        expect(
            (
                await write({
                    _tag: "create",
                    id: randomUUID(),
                    name: "Featured",
                    color: "red",
                    description: null,
                })
            )._tag
        ).toBe("Failure")
        if (person === undefined) throw new Error("Directory person missing")
        expect((await write({ _tag: "delete", id: person.id }))._tag).toBe(
            "Failure"
        )
        expect(
            (
                await write({
                    _tag: "update",
                    id: person.id,
                    name: "Override",
                    color: "red",
                    description: null,
                })
            )._tag
        ).toBe("Failure")
        await pg.query(
            "INSERT INTO entity_tags (id,domain_id,entity_type,entity_id,tag_id,created_at,updated_at) VALUES ('tags-link',$1,'images','image',$2,1,1)",
            [owner.domain_id, tag.id]
        )
        await pg.query(
            "INSERT INTO entity_tags (id,domain_id,entity_type,entity_id,tag_id,created_at,updated_at) SELECT 'bound-' || n,$1,'images','image-' || n,$2,1,1 FROM generate_series(1,500) n",
            [owner.domain_id, tag.id]
        )
        expect((await write({ _tag: "delete", id: tag.id }))._tag).toBe(
            "Failure"
        )
        expect(
            (await pg.query("SELECT id FROM tags WHERE id=$1", [tag.id])).rows
        ).toHaveLength(1)
        await pg.query(
            "DELETE FROM entity_tags WHERE domain_id=$1 AND id LIKE 'bound-%'",
            [owner.domain_id]
        )
        model = await settle(
            TagsBrowser.update(model, {
                _tag: "ClickedDeleteTag",
                tagId: tag.id,
            })
        )
        // The dialog's animation commands are UI-only; confirm via its ordinary message.
        model = await settle(
            TagsBrowser.update(model, { _tag: "ConfirmedDeleteTag" })
        )
        expect(model.ui.error).toBeNull()
        expect(
            TagsBrowser.project(model).tags.some((item) => item.id === tag.id)
        ).toBe(false)
        expect(
            (await pg.query("SELECT id FROM entity_tags WHERE id='tags-link'"))
                .rows
        ).toHaveLength(0)
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (
                await write({
                    _tag: "create",
                    id: randomUUID(),
                    name: "Forbidden",
                    color: "red",
                    description: null,
                })
            )._tag
        ).toBe("Failure")
        expect((await write({ _tag: "sync_directory" }))._tag).toBe("Success")
        await pg.query("UPDATE domains SET enabled_modules='{}' WHERE id=$1", [
            owner.domain_id,
        ])
        expect((await write({ _tag: "sync_directory" }))._tag).toBe("Failure")
    })
})

describe("PostgreSQL Bookmarks", () => {
    it("preserves the original form flow, URL uniqueness, scope and the 200-record bound", async () => {
        const owner = await seed("bookmarks-browser")
        const other = await seed("bookmarks-other")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Documents']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("bookmarks-browser")
        const save_requests: string[] = []
        const fetch_bookmarks: typeof fetch = (input, init) => {
            const request = new Request(input, init)
            save_requests.push(new URL(request.url).pathname)
            request.headers.set("cookie", `urm_account=${session.token}`)
            return run(
                new URL(request.url).pathname.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_bookmarks
        )
        const settle = async ([
            initial,
            commands,
        ]: BookmarksBrowser.UpdateReturn) => {
            let model = initial
            const mutation_requests: string[][] = []
            for (const command of commands) {
                const request_start = save_requests.length
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                if (message._tag === "BookmarksSaved")
                    mutation_requests.push(
                        save_requests
                            .slice(request_start)
                            .filter((path) => !path.startsWith("/api/uploads"))
                    )

                model = BookmarksBrowser.update(model, message)[0]
            }
            for (const paths of mutation_requests)
                expect(paths).toEqual(["/api/rpc/"])
            return model
        }
        let model = await settle(
            BookmarksBrowser.synchronize(BookmarksBrowser.init(), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(Option.isNone(model.ui.error)).toBe(true)
        for (const message of [
            { _tag: "UpdatedBookmarkTitle", value: "Docs" },
            { _tag: "UpdatedBookmarkHref", value: "#docs" },
            { _tag: "UpdatedBookmarkTags", value: "Docs, docs, Help" },
            { _tag: "SubmittedBookmark" },
        ].map((value) =>
            Schema.decodeUnknownSync(BookmarksBrowser.Message)(value)
        ))
            model = await settle(BookmarksBrowser.update(model, message))
        expect(Option.isNone(model.ui.error)).toBe(true)
        const bookmark = BookmarksBrowser.project(model).bookmarks[0]
        if (bookmark === undefined) throw new Error("Bookmark missing")
        expect(bookmark.tags).toEqual(["docs", "help"])
        expect(
            BookmarksBrowser.link_suggestions(
                BookmarksBrowser.project(model).bookmarks
            )[0]?.href
        ).toBe("#docs")
        model = await settle(
            BookmarksBrowser.update(model, {
                _tag: "ClickedEditBookmark",
                bookmark,
            })
        )
        model = await settle(
            BookmarksBrowser.update(model, {
                _tag: "UpdatedBookmarkTitle",
                value: "Reference",
            })
        )
        model = await settle(
            BookmarksBrowser.update(model, {
                _tag: "UpdatedBookmarkHref",
                value: "/reference",
            })
        )
        model = await settle(
            BookmarksBrowser.update(model, { _tag: "SubmittedBookmark" })
        )
        expect(BookmarksBrowser.project(model).bookmarks[0]).toMatchObject({
            title: "Reference",
            href: "/reference",
        })
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const write = (action: BookmarkAction, domain_id = owner.domain_id) =>
            run(
                Effect.result(
                    handlers.FoldkitRemoteMutate({
                        requestId: randomUUID(),
                        mutation: "ChangeBookmarks",
                        input: { domain_id, action },
                    })
                )
            )
        const create: BookmarkAction = {
            _tag: "create",
            id: randomUUID(),
            title: "Other",
            href: "#other",
            tags: [],
        }
        expect((await write(create))._tag).toBe("Success")
        expect((await write(create))._tag).toBe("Success")
        expect(
            (await write({ ...create, href: "/reference", id: randomUUID() }))
                ._tag
        ).toBe("Failure")
        expect(
            (await write({ ...create, href: "#foreign" }, other.domain_id))._tag
        ).toBe("Failure")
        expect(
            (
                await write({
                    ...create,
                    tags: ["x".repeat(51)],
                    id: randomUUID(),
                })
            )._tag
        ).toBe("Failure")
        model = await settle(
            BookmarksBrowser.update(model, {
                _tag: "ClickedDeleteBookmark",
                bookmark_id: bookmark.id,
            })
        )
        expect(
            BookmarksBrowser.project(model).bookmarks.some(
                (item) => item.id === bookmark.id
            )
        ).toBe(false)
        await pg.query(
            "INSERT INTO bookmarks (id,domain_id,title,href,tags,created_at,updated_at) SELECT 'bounded-' || n,$1,'Item ' || lpad(n::text,3,'0'),'#item-' || n,'{}',1,1 FROM generate_series(1,201) n",
            [owner.domain_id]
        )
        model = await settle(
            BookmarksBrowser.update(model, { _tag: "BookmarksRefreshed" })
        )
        expect(BookmarksBrowser.project(model).bookmarks).toHaveLength(200)
        expect(BookmarksBrowser.project(model).bookmarks[0]?.title).toBe(
            "Item 001"
        )
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await write({ _tag: "delete", id: create.id }))._tag).toBe(
            "Failure"
        )
        model = await settle(
            BookmarksBrowser.synchronize(model, {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: false,
            })
        )
        expect(Option.isNone(model.ui.error)).toBe(true)
        await pg.query("UPDATE domains SET enabled_modules='{}' WHERE id=$1", [
            owner.domain_id,
        ])
        model = await settle(
            BookmarksBrowser.update(model, { _tag: "BookmarksRefreshed" })
        )
        expect(Option.isSome(model.ui.error)).toBe(true)
    })
})

describe("PostgreSQL Documents", () => {
    it("round-trips editor content and templates through account RPC with scope and revision checks", async () => {
        const owner = await seed("documents-browser")
        const other = await seed("documents-other")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Documents']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("documents-browser")
        const save_requests: string[] = []
        const fetch_documents: typeof fetch = (input, init) => {
            const request = new Request(input, init)
            save_requests.push(new URL(request.url).pathname)
            request.headers.set("cookie", `urm_account=${session.token}`)
            const path = new URL(request.url).pathname
            return run(
                path.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : path.startsWith("/api/uploads")
                      ? upload_request(request)
                      : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_documents
        )
        const settle = async ([
            initial,
            commands,
        ]: DocumentsBrowser.UpdateReturn) => {
            let model = initial
            const mutation_requests: string[][] = []
            for (const command of commands) {
                const request_start = save_requests.length
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                if (message._tag === "DocumentsSaved")
                    mutation_requests.push(
                        save_requests
                            .slice(request_start)
                            .filter((path) => !path.startsWith("/api/uploads"))
                    )

                model = DocumentsBrowser.update(model, message)[0]
            }
            for (const paths of mutation_requests)
                expect(paths).toEqual(["/api/rpc/"])
            return model
        }
        let model = await settle(
            DocumentsBrowser.synchronize(
                DocumentsBrowser.init("/content/documents/new"),
                {
                    account_id: owner.account_id,
                    domain_id: owner.domain_id,
                    can_write: true,
                }
            )
        )
        expect(model.ui.load_status).toBe("ready")
        model = DocumentsBrowser.update(
            model,
            DocumentsFeature.UpdatedDocumentTitle({ value: "Private notes" })
        )[0]
        model = await settle(
            DocumentsBrowser.update(
                model,
                DocumentsFeature.ClickedSaveDocument()
            )
        )
        const document = DocumentsBrowser.project(model).documents[0]
        expect(document).toMatchObject({
            title: "Private notes",
            content_type: "rich_text_json",
            status: "draft",
        })
        if (document === undefined) throw new Error("Document was not saved")
        expect(JSON.parse(document.content)).toHaveProperty("schema_version", 1)
        expect(typeof document.updated_at).toBe("number")
        model = DocumentsBrowser.update(
            model,
            DocumentsFeature.ChangedDocumentTemplateMetadata({
                field: "name",
                value: "Reusable notes",
            })
        )[0]
        model = await settle(
            DocumentsBrowser.update(
                model,
                DocumentsFeature.SubmittedDocumentTemplate()
            )
        )
        const template = DocumentsBrowser.library(model)?.templates[0]
        expect(template).toMatchObject({
            name: "Reusable notes",
            revision: 1,
            content: document.content,
        })
        if (template === undefined) throw new Error("Template was not saved")
        model = await settle(
            DocumentsBrowser.update(
                model,
                DocumentsBrowser.UseTemplate({ template_id: template.id })
            )
        )
        expect(DocumentsBrowser.project(model).documents).toHaveLength(2)
        expect(
            DocumentsBrowser.project(model).documents.find(
                (item) => item.id !== document.id
            )?.template_source
        ).toMatchObject({
            template_id: `organization.document.${template.id}`,
            template_version: 1,
            provenance: "organization",
        })
        const sibling_id = randomUUID()
        await pg.query(
            "INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,updated_at,enabled_modules,publication_status,publication_access) SELECT $1,organization_id,created_by_user_id,'Sibling','documents-sibling',1,enabled_modules,'draft','public' FROM domains WHERE id=$2",
            [sibling_id, owner.domain_id]
        )
        const sibling = await settle(
            DocumentsBrowser.synchronize(
                DocumentsBrowser.init("/content/documents"),
                {
                    account_id: owner.account_id,
                    domain_id: sibling_id,
                    can_write: true,
                }
            )
        )
        expect(DocumentsBrowser.project(sibling).documents).toHaveLength(2)
        expect(DocumentsBrowser.library(sibling)?.templates).toHaveLength(1)
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const write = (action: DocumentAction, domain_id = owner.domain_id) =>
            run(
                Effect.result(
                    handlers.FoldkitRemoteMutate({
                        requestId: randomUUID(),
                        mutation: "ChangeDocuments",
                        input: { domain_id, action },
                    })
                )
            )
        const create: DocumentAction = {
            _tag: "create",
            id: randomUUID(),
            title: "Retry",
            content: document.content,
            content_type: "rich_text_json",
            status: "draft",
        }
        expect((await write(create))._tag).toBe("Success")
        expect((await write(create))._tag).toBe("Success")
        expect(
            (await write({ ...create, title: "Different retry" }))._tag
        ).toBe("Failure")
        expect(
            (await write({ ...create, id: randomUUID(), content: "{}" }))._tag
        ).toBe("Failure")
        expect(
            (
                await write({
                    _tag: "update",
                    id: document.id,
                    title: "Edited notes",
                    content: document.content,
                    content_type: "rich_text_json",
                    status: "active",
                })
            )._tag
        ).toBe("Success")
        const update_template: DocumentAction = {
            _tag: "save_template",
            id: template.id,
            expected_revision: 1,
            name: "Updated notes",
            description: template.description,
            tags: ["Docs", "docs"],
            title: template.title,
            content: template.content,
            content_type: template.content_type,
        }
        expect((await write(update_template))._tag).toBe("Success")
        expect(
            (await write({ ...update_template, name: "Stale overwrite" }))._tag
        ).toBe("Failure")
        expect(
            (await write({ _tag: "delete", id: document.id }, other.domain_id))
                ._tag
        ).toBe("Failure")
        const other_session = await login("documents-other")
        const other_handlers = api_handlers({
            ...(await run(authenticate_token(other_session.token))),
            domain_id: other.domain_id,
        })
        expect(
            (
                await run(
                    Effect.result(
                        other_handlers.FoldkitRemoteMutate({
                            requestId: randomUUID(),
                            mutation: "ChangeDocuments",
                            input: {
                                domain_id: other.domain_id,
                                action: { _tag: "delete", id: document.id },
                            },
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
        const image_url = await Effect.runPromise(
            Effect.gen(function* () {
                const api = yield* ContactsApi
                return yield* api.upload_image(
                    owner.domain_id,
                    new File([png], "document.png", { type: "image/png" }),
                    "Documents"
                )
            }).pipe(Effect.provide(layer))
        )
        expect(image_url).toContain("/documents/")
        expect(
            (await fetch_documents(new URL(image_url, "https://urm.test")))
                .status
        ).toBe(302)
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await write({ _tag: "delete", id: document.id }))._tag).toBe(
            "Failure"
        )
        await pg.query(
            "UPDATE organization_members SET role='owner' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await write({ _tag: "delete", id: document.id }))._tag).toBe(
            "Success"
        )
        await pg.query("UPDATE domains SET enabled_modules='{}' WHERE id=$1", [
            owner.domain_id,
        ])
        expect(
            (await write({ _tag: "delete_template", id: template.id }))._tag
        ).toBe("Failure")
    })
})

describe("PostgreSQL Blog", () => {
    it("saves posts and assignments atomically, preserves templates and enforces owner scope", async () => {
        const owner = await seed("blog-browser")
        const other = await seed("blog-other")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Blog']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const session = await login("blog-browser")
        const save_requests: string[] = []
        const fetch_blog: typeof fetch = (input, init) => {
            const request = new Request(input, init)
            save_requests.push(new URL(request.url).pathname)
            request.headers.set("cookie", `urm_account=${session.token}`)
            const path = new URL(request.url).pathname
            return run(
                path.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : path.startsWith("/api/uploads")
                      ? upload_request(request)
                      : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_blog
        )
        const settle = async ([
            initial,
            commands,
        ]: BlogBrowser.UpdateReturn) => {
            let model = initial
            const mutation_requests: string[][] = []
            for (const command of commands) {
                const request_start = save_requests.length
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                if (message._tag === "BlogSaved")
                    mutation_requests.push(
                        save_requests
                            .slice(request_start)
                            .filter((path) => !path.startsWith("/api/uploads"))
                    )

                model = BlogBrowser.update(model, message)[0]
            }
            for (const paths of mutation_requests)
                expect(paths).toEqual(["/api/rpc/"])
            return model
        }
        let model = await settle(
            BlogBrowser.synchronize(BlogBrowser.init("/blog/new"), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(model.ui.status).toBe("ready")
        const inputs: ReadonlyArray<BlogBrowser.Message> = [
            { _tag: "UpdatedBlogTitle", value: "First post" },
            { _tag: "UpdatedBlogAuthor", value: "Author" },
            { _tag: "UpdatedBlogExcerpt", value: "A short excerpt" },
            { _tag: "UpdatedBlogPublished", value: true },
            { _tag: "ClickedSaveBlogDraft" },
        ]
        for (const input of inputs)
            model = await settle(BlogBrowser.update(model, input))
        const post = BlogBrowser.library(model)?.posts[0]
        const assignment = BlogBrowser.library(model)?.assignments[0]
        expect(post).toMatchObject({
            title: "First post",
            editorial_state: "published",
            excerpt: "A short excerpt",
        })
        expect(assignment).toMatchObject({
            slug: "first-post",
            publication_state: "published",
        })
        if (post === undefined || assignment === undefined)
            throw new Error("Blog save failed")
        expect(typeof assignment.published_at).toBe("number")
        expect(JSON.parse(post.content)).toMatchObject({
            schema_version: 1,
            author: "Author",
        })
        expect(BlogBrowser.project(model).documents[0]?.published).toBe(true)
        model = BlogBrowser.update(
            model,
            BlogFeature.ChangedBlogTemplateMetadata({
                field: "name",
                value: "Post template",
            })
        )[0]
        model = await settle(
            BlogBrowser.update(model, BlogFeature.SubmittedBlogTemplate())
        )
        const template = BlogBrowser.library(model)?.templates[0]
        if (template === undefined) throw new Error("Blog template save failed")
        expect(template).toMatchObject({ title: "First post", revision: 1 })
        model = await settle(
            BlogBrowser.update(
                model,
                BlogBrowser.UseTemplate({ template_id: template.id })
            )
        )
        expect(BlogBrowser.library(model)?.posts).toHaveLength(2)
        expect(
            BlogBrowser.library(model)?.posts.find(
                (item) => item.id !== post.id
            )?.template_source
        ).toMatchObject({
            template_id: `organization.blog.${template.id}`,
            template_version: 1,
            provenance: "organization",
        })
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const write = (
            action: BlogAction,
            subdomain_slug: string | null = null,
            domain_id = owner.domain_id
        ) =>
            run(
                Effect.result(
                    handlers.FoldkitRemoteMutate({
                        requestId: randomUUID(),
                        mutation: "ChangeBlog",
                        input: { domain_id, subdomain_slug, action },
                    })
                )
            )
        const create: BlogAction = {
            _tag: "save",
            id: randomUUID(),
            is_new: true,
            title: "Another",
            content: post.content,
            content_type: post.content_type,
            excerpt: null,
            seo_title: null,
            seo_description: null,
            slug: "another",
            published: false,
        }
        expect((await write(create))._tag).toBe("Success")
        expect((await write(create))._tag).toBe("Success")
        expect(
            (await write({ ...create, id: randomUUID(), slug: "first-post" }))
                ._tag
        ).toBe("Failure")
        expect(
            (
                await pg.query("SELECT id FROM blog_posts WHERE domain_id=$1", [
                    owner.domain_id,
                ])
            ).rows
        ).toHaveLength(3)
        expect(
            (
                await write({
                    ...create,
                    id: post.id,
                    is_new: false,
                    title: "Must roll back",
                    slug: "another",
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await pg.query("SELECT title FROM blog_posts WHERE id=$1", [
                    post.id,
                ])
            ).rows[0]
        ).toEqual({ title: "First post" })
        expect(
            (await write({ ...create, id: randomUUID() }, "missing"))._tag
        ).toBe("Failure")
        expect((await write(create, null, other.domain_id))._tag).toBe(
            "Failure"
        )
        const subdomain_id = randomUUID()
        await pg.query(
            "INSERT INTO subdomains (id,domain_id,name,slug,kind,status,access,created_at,updated_at) VALUES ($1,$2,'Docs','docs','custom','draft','public',1,1)",
            [subdomain_id, owner.domain_id]
        )
        expect(
            (
                await write(
                    { ...create, id: randomUUID(), slug: "first-post" },
                    "docs"
                )
            )._tag
        ).toBe("Success")
        expect(
            (
                await write(
                    { _tag: "remove_assignment", id: assignment.id },
                    "docs"
                )
            )._tag
        ).toBe("Failure")
        const other_session = await login("blog-other")
        const other_handlers = api_handlers({
            ...(await run(authenticate_token(other_session.token))),
            domain_id: other.domain_id,
        })
        expect(
            (
                await run(
                    Effect.result(
                        other_handlers.FoldkitRemoteMutate({
                            requestId: randomUUID(),
                            mutation: "ChangeBlog",
                            input: {
                                domain_id: other.domain_id,
                                subdomain_slug: null,
                                action: {
                                    _tag: "from_template",
                                    id: randomUUID(),
                                    template_id: template.id,
                                },
                            },
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
        const template_update: BlogAction = {
            _tag: "save_template",
            id: template.id,
            expected_revision: 1,
            name: "Updated template",
            description: template.description,
            tags: ["Docs", "docs"],
            title: template.title,
            content: template.content,
            content_type: template.content_type,
            excerpt: template.excerpt,
            seo_title: template.seo_title,
            seo_description: template.seo_description,
        }
        expect((await write(template_update))._tag).toBe("Success")
        expect((await write(template_update))._tag).toBe("Failure")
        expect((await write({ _tag: "delete", id: post.id }))._tag).toBe(
            "Failure"
        )
        expect(
            (await write({ _tag: "remove_assignment", id: assignment.id }))._tag
        ).toBe("Success")
        expect((await write({ _tag: "delete", id: post.id }))._tag).toBe(
            "Success"
        )
        const image_url = await Effect.runPromise(
            Effect.gen(function* () {
                const api = yield* ContactsApi
                return yield* api.upload_image(
                    owner.domain_id,
                    new File([png], "blog.png", { type: "image/png" }),
                    "Blog"
                )
            }).pipe(Effect.provide(layer))
        )
        expect(image_url).toContain("/blog/")
        expect(
            (await fetch_blog(new URL(image_url, "https://urm.test"))).status
        ).toBe(302)
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (await write({ _tag: "delete_template", id: template.id }))._tag
        ).toBe("Failure")
        await pg.query("UPDATE domains SET enabled_modules='{}' WHERE id=$1", [
            owner.domain_id,
        ])
        expect((await write(create))._tag).toBe("Failure")
        expect(
            (await fetch_blog(new URL(image_url, "https://urm.test"))).status
        ).toBe(403)
    })
})

describe("PostgreSQL Pages and release capture", () => {
    it("preserves page invariants and builds immutable releases from PostgreSQL Blog posts", async () => {
        const owner = await seed("pages-release")
        const other = await seed("pages-other")
        const session = await login("pages-release")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const mutate = (mutation: string, input: unknown) =>
            run(
                Effect.result(
                    handlers.FoldkitRemoteMutate({
                        requestId: randomUUID(),
                        mutation,
                        input,
                    })
                )
            )
        const home = {
            _tag: "create",
            id: randomUUID(),
            title: "Home",
            content: "Welcome",
            content_type: "text",
            slug: null,
            navigation_label: "Home",
            show_in_navigation: true,
            is_homepage: true,
            publication_state: "published",
            seo_title: null,
            seo_description: null,
            noindex: false,
            template_source: null,
        }
        const scope = { domain_id: owner.domain_id, subdomain_slug: null }
        const save = (
            action: unknown,
            domain_id = owner.domain_id,
            subdomain_slug: string | null = null
        ) => mutate("ChangePages", { domain_id, subdomain_slug, action })
        expect((await save(home))._tag).toBe("Success")
        expect((await save(home))._tag).toBe("Success")
        expect((await save({ ...home, id: randomUUID() }))._tag).toBe("Failure")
        expect((await save(home, other.domain_id))._tag).toBe("Failure")
        expect(
            (
                await save(
                    { ...home, id: randomUUID() },
                    owner.domain_id,
                    "missing"
                )
            )._tag
        ).toBe("Failure")
        expect(
            (
                await save({
                    ...home,
                    id: randomUUID(),
                    is_homepage: false,
                    slug: "blog",
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await save({
                    _tag: "reorder",
                    positions: [
                        { id: home.id, order_position: 8 },
                        { id: "missing", order_position: 9 },
                    ],
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await pg.query("SELECT order_position FROM pages WHERE id=$1", [
                    home.id,
                ])
            ).rows[0]
        ).toMatchObject({ order_position: 0 })
        expect(
            (
                await mutate("ChangeBlog", {
                    ...scope,
                    action: {
                        _tag: "save",
                        id: randomUUID(),
                        is_new: true,
                        title: "Release post",
                        content: "Post body",
                        content_type: "text",
                        excerpt: "Summary",
                        seo_title: null,
                        seo_description: null,
                        slug: "release-post",
                        published: true,
                    },
                })
            )._tag
        ).toBe("Success")
        const key = randomUUID()
        expect(
            (
                await mutate("BuildPublication", {
                    ...scope,
                    idempotency_key: key,
                })
            )._tag
        ).toBe("Success")
        expect(
            (
                await mutate("BuildPublication", {
                    ...scope,
                    idempotency_key: key,
                })
            )._tag
        ).toBe("Success")
        const rows = await pg.query(
            "SELECT id,status,snapshot,artifact_checksum FROM publication_releases WHERE domain_id=$1",
            [owner.domain_id]
        )
        expect(rows.rows).toHaveLength(1)
        const release = Schema.decodeUnknownSync(
            Schema.Struct({
                id: Schema.String,
                status: Schema.String,
                artifact_checksum: Schema.String,
                snapshot: Schema.Struct({
                    pages: Schema.Array(Schema.Struct({ body: Schema.String })),
                    blog_posts: Schema.Array(
                        Schema.Struct({
                            path: Schema.String,
                            body: Schema.String,
                        })
                    ),
                }),
            })
        )(rows.rows[0])
        expect(release.status).toBe("ready")
        expect(release.artifact_checksum).toMatch(/^[a-f0-9]{64}$/)
        expect(release.snapshot.blog_posts).toEqual([
            { path: "/blog/release-post/", body: "Post body" },
        ])
        const output = await readFile(
            new URL(
                `../../../packages/ssg/dist/builds/pg-${release.id}/blog/release-post/index.html`,
                import.meta.url
            ),
            "utf8"
        )
        expect(output).toContain("Post body")
        expect(
            (await save({ ...home, _tag: "update", content: "Changed" }))._tag
        ).toBe("Success")
        expect(
            (
                await pg.query(
                    "SELECT snapshot->'pages'->0->>'body' AS body FROM publication_releases WHERE id=$1",
                    [release.id]
                )
            ).rows[0]
        ).toEqual({ body: "Welcome" })
        expect(
            (
                await save({
                    ...home,
                    _tag: "update",
                    content: `/api/uploads/${owner.domain_id}/pages/${randomUUID()}`,
                })
            )._tag
        ).toBe("Success")
        expect(
            (
                await mutate("BuildPublication", {
                    ...scope,
                    idempotency_key: randomUUID(),
                })
            )._tag
        ).toBe("Failure")
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await save({ ...home, _tag: "update" }))._tag).toBe("Failure")
        expect(
            (
                await mutate("BuildPublication", {
                    ...scope,
                    idempotency_key: randomUUID(),
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "PublicationPages",
                            input: scope,
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Success")
        await run(revoke_token(session.token))
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "PublicationReleases",
                            input: scope,
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
    })
})

describe("PostgreSQL Pages browser", () => {
    it("uses the existing page form through account RPC and keeps subdomain owners isolated", async () => {
        const owner = await seed("pages-browser")
        const session = await login("pages-browser")
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY[]::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const save_requests: string[] = []
        const fetch_pages: typeof fetch = (input, init) => {
            const request = new Request(input, init)
            save_requests.push(new URL(request.url).pathname)
            request.headers.set("cookie", `urm_account=${session.token}`)
            const path = new URL(request.url).pathname
            return run(
                path.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : path.startsWith("/api/uploads")
                      ? upload_request(request)
                      : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_pages
        )
        const settle = async ([
            initial,
            commands,
        ]: PagesBrowser.UpdateReturn) => {
            let model = initial
            const mutation_requests: string[][] = []
            for (const command of commands) {
                const request_start = save_requests.length
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                if (message._tag === "PagesSaved")
                    mutation_requests.push(
                        save_requests
                            .slice(request_start)
                            .filter((path) => !path.startsWith("/api/uploads"))
                    )

                model = PagesBrowser.update(model, message)[0]
            }
            for (const paths of mutation_requests)
                expect(paths).toEqual(["/api/rpc/"])
            return model
        }
        const url = (pathname: string) =>
            Url.make({
                protocol: "https:",
                host: "urm.test",
                port: Option.none(),
                pathname,
                search: Option.none(),
                hash: Option.none(),
            })
        let model = await settle(
            PagesBrowser.synchronize(PagesBrowser.init(url("/web/pages/new")), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(model.ui.is_loading).toBe(false)
        model = await settle(
            PagesBrowser.update(model, {
                _tag: "ChangedNewPageTitle",
                value: "About",
            })
        )
        const submitted = PagesBrowser.update(model, {
            _tag: "SubmittedNewPage",
        })
        expect(submitted[1].map((command) => command.name)).toEqual([
            "ChangePagesLibrary",
        ])
        model = await settle(submitted)
        expect(model.ui.error).toEqual(Option.none())
        const page = PagesBrowser.library(model)?.pages[0]
        if (page === undefined) throw new Error("Page save failed")
        expect(page).toMatchObject({
            title: "About",
            slug: "about",
            publication_state: "draft",
        })
        expect(
            PagesBrowser.content_page_id_for_path(`/content/web/${page.id}`)
        ).toEqual(Option.some(page.id))
        model = await settle(
            PagesBrowser.update(model, {
                _tag: "StartedEditingPage",
                page_id: Schema.decodeUnknownSync(PagesBrowser.Page.fields.id)(
                    page.id
                ),
            })
        )
        model = await settle(
            PagesBrowser.update(model, {
                _tag: "ToggledPageHomepage",
                value: true,
            })
        )
        model = await settle(
            PagesBrowser.update(model, {
                _tag: "ChangedPagePublicationState",
                value: "published",
            })
        )
        model = await settle(
            PagesBrowser.update(model, { _tag: "SubmittedPageEdit" })
        )
        expect(model.ui.error).toEqual(Option.none())
        expect(PagesBrowser.library(model)?.pages[0]).toMatchObject({
            is_homepage: true,
            slug: null,
            publication_state: "published",
        })
        const image = await Effect.runPromise(
            Effect.flatMap(ContactsApi, (api) =>
                api.upload_image(
                    owner.domain_id,
                    new File([png], "page.png", { type: "image/png" }),
                    "Pages"
                )
            ).pipe(Effect.provide(layer))
        )
        expect(image).toContain("/pages/")
        expect(
            (await fetch_pages(new URL(image, "https://urm.test"))).status
        ).toBe(302)
        await pg.query(
            "INSERT INTO subdomains (id,domain_id,name,slug,kind,status,access,created_at,updated_at) VALUES ($1,$2,'Docs','docs','documentation','draft','public',1,1)",
            [randomUUID(), owner.domain_id]
        )
        model = await settle(
            PagesBrowser.update(
                model,
                PagesBrowser.ChangedUrl({
                    url: url("/web/pages/subdomains/docs/new"),
                })
            )
        )
        expect(PagesBrowser.library(model)?.pages).toEqual([])
        model = await settle(
            PagesBrowser.update(model, {
                _tag: "ChangedNewPageTitle",
                value: "About",
            })
        )
        model = await settle(
            PagesBrowser.update(model, { _tag: "SubmittedNewPage" })
        )
        expect(PagesBrowser.library(model)?.pages[0]?.id).not.toBe(page.id)
        expect(PagesBrowser.library(model)?.pages[0]?.slug).toBe("about")
        model = await settle(
            PagesBrowser.update(
                model,
                PagesBrowser.ChangedUrl({
                    url: url("/web/pages/subdomains/missing/new"),
                })
            )
        )
        expect(PagesBrowser.library(model)).toBeUndefined()
        expect(Option.isSome(model.ui.error)).toBe(true)
        const [publishing, commands] = PublishingBrowser.synchronize(
            PublishingBrowser.init(),
            {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            }
        )
        const command = commands[0]
        if (command === undefined) throw new Error("Missing publication load")
        const loaded = await Effect.runPromise(
            command.effect.pipe(Effect.provide(layer))
        )
        const publication = PublishingBrowser.update(publishing, loaded)[0]
        expect(PublishingBrowser.library(publication)?.releases).toEqual([])
        expect(PublishingBrowser.project(publication).can_deploy).toBe(false)
        const [building, build_commands] = PublishingBrowser.update(
            publication,
            { _tag: "RequestedBuild" }
        )
        const build_command = build_commands[0]
        if (build_command === undefined)
            throw new Error("Missing build command")
        const build_result = await Effect.runPromise(
            build_command.effect.pipe(Effect.provide(layer))
        )
        const [built, build_feedback] = PublishingBrowser.update(
            building,
            build_result
        )
        expect(
            build_feedback.some(
                (command) => command.name === "PlayDeploymentSuccessAudio"
            )
        ).toBe(true)
        expect(built.ui.error).toEqual(Option.none())
        expect(PublishingBrowser.library(built)?.releases[0]?.status).toBe(
            "ready"
        )
        const publication_scene = {
            update: (
                model: PublishingBrowser.Model,
                message: PublishingBrowser.Message
            ) => {
                const [next, commands] = PublishingBrowser.update(
                    model,
                    message
                )
                return { model: next, commands }
            },
            view: (
                model: PublishingBrowser.Model,
                h: HtmlBuilder<PublishingBrowser.Message>
            ) =>
                h.submodel({
                    slotId: "test-publishing",
                    model,
                    view: PublishingBrowser.view,
                    viewInputs: {
                        domain_name: "Test publication",
                        domain_slug: "pages-browser",
                        subdomains: [],
                    },
                    toParentMessage: (message) => message,
                }),
        }
        Scene.scene(
            publication_scene,
            Scene.given(built),
            Scene.expect(
                Scene.role("button", { name: "Build release" })
            ).toBeEnabled(),
            Scene.expect(
                Scene.role("button", { name: "Deploy to development" })
            ).toBeEnabled(),
            Scene.expect(
                Scene.role("button", { name: "Promote to staging" })
            ).toBeDisabled()
        )
        const step_publication = async (
            model: PublishingBrowser.Model,
            message: PublishingBrowser.Message
        ) => {
            const [pending, commands] = PublishingBrowser.update(model, message)
            const command = commands[0]
            if (command === undefined)
                throw new Error("Missing publication command")
            const result = await Effect.runPromise(
                command.effect.pipe(Effect.provide(layer))
            )
            return PublishingBrowser.update(pending, result)
        }
        const built_release = PublishingBrowser.project(built).releases[0]
        if (built_release === undefined)
            throw new Error("Missing built release")
        const [queued, queue_commands] = await step_publication(built, {
            _tag: "RequestedDeployment",
            release_id: built_release._id,
            channel: "development",
        })
        expect(queue_commands.map((command) => command.name)).toEqual([
            "WaitForPublication",
        ])
        expect(PublishingBrowser.project(queued).jobs[0]?.status).toBe(
            "pending"
        )
        Scene.scene(
            publication_scene,
            Scene.given(queued),
            Scene.expect(
                Scene.role("button", { name: "Deploy to development" })
            ).toBeDisabled(),
            Scene.expect(
                Scene.role("button", { name: "Cancel deploy development" })
            ).toBeEnabled()
        )
        const queued_job = PublishingBrowser.project(queued).jobs[0]
        if (queued_job === undefined) throw new Error("Missing queued job")
        const mutate_development = (input: {
            release_id: string
            idempotency_key: string
            domain_id?: string
            subdomain_slug?: string | null
        }) =>
            Effect.runPromise(
                Effect.flatMap(ContactsApi, (api) =>
                    Remote.mutate(
                        DeployDevelopment,
                        {
                            domain_id: input.domain_id ?? owner.domain_id,
                            subdomain_slug: input.subdomain_slug ?? null,
                            release_id: input.release_id,
                            idempotency_key: input.idempotency_key,
                        },
                        randomUUID()
                    ).pipe(
                        Effect.provide(api.remote(owner.domain_id)),
                        Effect.result
                    )
                ).pipe(Effect.provide(layer))
            )
        const duplicate = await mutate_development({
            release_id: built_release._id,
            idempotency_key: queued_job.idempotency_key,
        })
        expect(duplicate._tag).toBe("Success")
        expect(
            (
                await mutate_development({
                    release_id: built_release._id,
                    idempotency_key: randomUUID(),
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await mutate_development({
                    release_id: built_release._id,
                    idempotency_key: randomUUID(),
                    domain_id: randomUUID(),
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await mutate_development({
                    release_id: built_release._id,
                    idempotency_key: randomUUID(),
                    subdomain_slug: "docs",
                })
            )._tag
        ).toBe("Failure")
        let uploads = 0
        const provider = PreviewDeployer.of({
            deploy: (descriptor) =>
                Effect.gen(function* () {
                    uploads += 1
                    expect(descriptor).toMatchObject({
                        channel: "development",
                        environment: "production",
                        release_id: built_release._id,
                        artifact_directory: `packages/ssg/dist/builds/pg-${built_release._id}`,
                    })
                    const manifest = yield* Effect.promise(() =>
                        readFile(
                            new URL(
                                `../../../${descriptor.artifact_directory}/manifest.json`,
                                import.meta.url
                            ),
                            "utf8"
                        )
                    )
                    expect(JSON.parse(manifest).release_id).toBe(
                        built_release._id
                    )
                    return {
                        resource_id: "test-resource",
                        worker_name: "test-worker",
                        url: `https://${descriptor.hostnames[0]}`,
                    }
                }),
        })
        expect(
            await run(
                run_development_job().pipe(
                    Effect.provideService(PreviewDeployer, provider)
                )
            )
        ).toBe(true)
        expect(
            await run(
                run_development_job().pipe(
                    Effect.provideService(PreviewDeployer, provider)
                )
            )
        ).toBe(false)
        expect(uploads).toBe(1)
        const [deployed, feedback] = await step_publication(queued, {
            _tag: "PublishingRefreshed",
        })
        expect(
            PublishingBrowser.project(deployed).deployments[0]
        ).toMatchObject({
            status: "succeeded",
            url: "https://dev.pages-browser.urm.dev",
        })
        expect(
            feedback.some(
                (command) => command.name === "PlayDeploymentSuccessAudio"
            )
        ).toBe(true)
        expect(deployed.watched_job).toBeNull()
        const [, repeated_feedback] = await step_publication(deployed, {
            _tag: "PublishingRefreshed",
        })
        expect(repeated_feedback).toEqual([])
        expect(deployed.promotions_available).toBe(true)
        Scene.scene(
            publication_scene,
            Scene.given(deployed),
            Scene.expect(
                Scene.role("button", { name: "Promote to staging" })
            ).toBeEnabled(),
            Scene.expect(
                Scene.role("button", { name: "Promote to production" })
            ).toBeDisabled()
        )
        const mutate_promotion = (
            channel: "staging" | "production",
            idempotency_key: string = randomUUID(),
            domain_id = owner.domain_id,
            release_id = built_release._id
        ) =>
            Effect.runPromise(
                Effect.flatMap(ContactsApi, (api) =>
                    Remote.mutate(
                        PromotePublication,
                        {
                            domain_id,
                            subdomain_slug: null,
                            release_id,
                            idempotency_key,
                            channel,
                        },
                        randomUUID()
                    ).pipe(
                        Effect.provide(api.remote(owner.domain_id)),
                        Effect.result
                    )
                ).pipe(Effect.provide(layer))
            )
        expect((await mutate_promotion("production"))._tag).toBe("Failure")
        expect(
            (await mutate_promotion("staging", randomUUID(), randomUUID()))._tag
        ).toBe("Failure")
        expect(
            (await mutate_promotion("staging", queued_job.idempotency_key))._tag
        ).toBe("Failure")
        expect(
            PublishingBrowser.update(deployed, {
                _tag: "RequestedDeployment",
                release_id: built_release._id,
                channel: "production",
            })[1]
        ).toEqual([])
        let promoted = deployed
        for (const channel of ["staging", "production"]) {
            if (channel !== "staging" && channel !== "production")
                throw new Error("Invalid test channel")
            const [pending_promotion] = await step_publication(promoted, {
                _tag: "RequestedDeployment",
                release_id: built_release._id,
                channel,
            })
            const job = PublishingBrowser.project(pending_promotion).jobs.find(
                (job) => job.channel === channel
            )
            if (job === undefined) throw new Error("Missing promotion job")
            expect(job.status).toBe("pending")
            expect(job.operation).toBe("promote")
            expect(
                (await mutate_promotion(channel, job.idempotency_key))._tag
            ).toBe("Success")
            const promotion_provider = PreviewDeployer.of({
                deploy: (descriptor) =>
                    Effect.sync(() => {
                        expect(descriptor.channel).toBe(channel)
                        expect(descriptor.release_id).toBe(built_release._id)
                        expect(descriptor.artifact_directory).toBe(
                            `packages/ssg/dist/builds/pg-${built_release._id}`
                        )
                        expect(descriptor.hostnames).toEqual([
                            `${channel === "staging" ? "staging." : ""}pages-browser.urm.dev`,
                        ])
                        return {
                            resource_id: "test-resource",
                            worker_name: "test-worker",
                            url: `https://${descriptor.hostnames[0]}`,
                        }
                    }),
            })
            await run(
                run_development_job().pipe(
                    Effect.provideService(PreviewDeployer, promotion_provider)
                )
            )
            const [completed, effects] = await step_publication(
                pending_promotion,
                { _tag: "PublishingRefreshed" }
            )
            promoted = completed
            expect(
                PublishingBrowser.project(completed).deployments.find(
                    (job) => job.channel === channel
                )
            ).toMatchObject({
                status: "succeeded",
                release_id: built_release._id,
                artifact_checksum:
                    PublishingBrowser.project(deployed).deployments[0]
                        ?.artifact_checksum,
            })
            expect(
                effects.some(
                    (command) => command.name === "PlayDeploymentSuccessAudio"
                )
            ).toBe(true)
            expect(JSON.stringify(completed.ui.toast)).toContain(
                channel === "staging"
                    ? "Staging deployment complete"
                    : "Production deployment complete"
            )
            expect(
                (
                    await step_publication(completed, {
                        _tag: "PublishingRefreshed",
                    })
                )[1]
            ).toEqual([])
        }
        // An older development-only server keeps development usable and promotions disabled.
        const development_server = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            async (input, init) => {
                const request = new Request(input, init)
                const body =
                    request.method === "POST"
                        ? await request.clone().text()
                        : ""
                if (body.includes("PublicationPromotionJobs"))
                    return new Response("Unknown query", { status: 400 })
                return fetch_pages(input, init)
            }
        )
        const [old_pending, old_commands] = PublishingBrowser.synchronize(
            PublishingBrowser.init(),
            {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            }
        )
        const old_command = old_commands[0]
        if (old_command === undefined)
            throw new Error("Missing compatibility load")
        const old_loaded = await Effect.runPromise(
            old_command.effect.pipe(Effect.provide(development_server))
        )
        const old_model = PublishingBrowser.update(old_pending, old_loaded)[0]
        expect(old_model.promotions_available).toBe(false)
        Scene.scene(
            publication_scene,
            Scene.given(old_model),
            Scene.expect(
                Scene.role("button", { name: "Deploy to development" })
            ).toBeEnabled(),
            Scene.expect(
                Scene.role("button", { name: "Promote to staging" })
            ).toBeDisabled(),
            Scene.expect(
                Scene.role("button", { name: "Promote to production" })
            ).toBeDisabled()
        )
        // Queued cancellation is durable and never invokes the provider.
        const [to_cancel] = await step_publication(deployed, {
            _tag: "RequestedDeployment",
            release_id: built_release._id,
            channel: "development",
        })
        const cancel_job = PublishingBrowser.project(to_cancel).jobs[0]
        if (cancel_job === undefined)
            throw new Error("Missing cancellation job")
        const [cancelled] = await step_publication(to_cancel, {
            _tag: "RequestedCancellation",
            job_id: cancel_job._id,
        })
        expect(PublishingBrowser.project(cancelled).jobs[0]?.status).toBe(
            "cancelled"
        )
        expect(
            await run(
                run_development_job().pipe(
                    Effect.provideService(PreviewDeployer, provider)
                )
            )
        ).toBe(false)
        // Running cancellation interrupts the provider and preserves uncertainty.
        const [to_stop] = await step_publication(cancelled, {
            _tag: "RequestedDeployment",
            release_id: built_release._id,
            channel: "development",
        })
        let signal_started = () => {}
        const started = new Promise<void>((resolve) => {
            signal_started = resolve
        })
        let upload_stopped = false
        const running = run(
            run_development_job().pipe(
                Effect.provideService(PreviewDeployer, {
                    deploy: () =>
                        Effect.sync(signal_started).pipe(
                            Effect.andThen(Effect.never),
                            Effect.onInterrupt(() =>
                                Effect.sync(() => {
                                    upload_stopped = true
                                })
                            )
                        ),
                })
            )
        )
        await started
        const [uploading] = await step_publication(to_stop, {
            _tag: "PublishingRefreshed",
        })
        const running_job = PublishingBrowser.project(uploading).jobs[0]
        if (running_job === undefined) throw new Error("Missing running job")
        expect(running_job.status).toBe("running")
        Scene.scene(
            publication_scene,
            Scene.given(uploading),
            Scene.expect(
                Scene.role("button", { name: "Cancel deploy development" })
            ).toBeEnabled()
        )
        const [stopping] = await step_publication(uploading, {
            _tag: "RequestedCancellation",
            job_id: running_job._id,
        })
        await running
        expect(upload_stopped).toBe(true)
        const [stopped, stopped_feedback] = await step_publication(stopping, {
            _tag: "PublishingRefreshed",
        })
        expect(PublishingBrowser.project(stopped).jobs[0]?.status).toBe(
            "cancelled"
        )
        expect(Option.getOrNull(stopped.ui.error)).toContain(
            "Cloudflare may already have applied"
        )
        expect(stopped_feedback).toEqual([])
        // Safe provider failures survive HTTP/RPC and appear in the original UI.
        const [to_fail] = await step_publication(cancelled, {
            _tag: "RequestedDeployment",
            release_id: built_release._id,
            channel: "development",
        })
        await run(
            run_development_job().pipe(
                Effect.provideService(PreviewDeployer, {
                    deploy: () =>
                        Effect.fail(
                            new PreviewDeploymentError({
                                operation: "test",
                                reason: "secret provider output",
                            })
                        ),
                })
            )
        )
        const [failed, failure_feedback] = await step_publication(to_fail, {
            _tag: "PublishingRefreshed",
        })
        expect(Option.getOrNull(failed.ui.error)).toContain(
            "Publication deployment failed"
        )
        expect(JSON.stringify(PublishingBrowser.project(failed))).not.toContain(
            "secret provider output"
        )
        expect(failure_feedback).toEqual([])
        // A previously running job is marked uncertain, never uploaded again.
        const [interrupted] = await step_publication(failed, {
            _tag: "RequestedDeployment",
            release_id: built_release._id,
            channel: "development",
        })
        await pg.query(
            "UPDATE publication_deployment_jobs SET status='running',updated_at=$1 WHERE id=$2",
            [Date.now() - 16 * 60_000, interrupted.watched_job]
        )
        expect(
            await run(
                run_development_job().pipe(
                    Effect.provideService(PreviewDeployer, provider)
                )
            )
        ).toBe(false)
        const [recovered] = await step_publication(interrupted, {
            _tag: "PublishingRefreshed",
        })
        expect(Option.getOrNull(recovered.ui.error)).toContain("server stopped")
        expect(uploads).toBe(1)
        // A queued job must recheck authority before touching the provider.
        const [revoked_job] = await step_publication(recovered, {
            _tag: "RequestedDeployment",
            release_id: built_release._id,
            channel: "development",
        })
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (
                await mutate_development({
                    release_id: built_release._id,
                    idempotency_key: randomUUID(),
                })
            )._tag
        ).toBe("Failure")
        await run(
            run_development_job().pipe(
                Effect.provideService(PreviewDeployer, provider)
            )
        )
        expect(uploads).toBe(1)
        const [access_failed] = await step_publication(revoked_job, {
            _tag: "PublishingRefreshed",
        })
        expect(PublishingBrowser.project(access_failed).jobs[0]?.status).toBe(
            "failed"
        )
        await pg.query(
            "UPDATE organization_members SET role='owner' WHERE user_id=$1",
            [owner.account_id]
        )
        // A client with the new optional jobs query can still build against the old contract.
        const previous_server = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            async (input, init) => {
                const request = new Request(input, init)
                const body =
                    request.method === "POST"
                        ? await request.clone().text()
                        : ""
                if (
                    body.includes("PublicationPromotionJobs") ||
                    body.includes("PublicationJobs") ||
                    body.includes("PublishingJobs")
                )
                    return new Response("Unknown query", { status: 400 })
                return fetch_pages(input, init)
            }
        )
        const [compat_loading, compat_commands] = PublishingBrowser.synchronize(
            PublishingBrowser.init(),
            {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            }
        )
        const compat_command = compat_commands[0]
        if (compat_command === undefined)
            throw new Error("Missing compatibility load")
        const compat_result = await Effect.runPromise(
            compat_command.effect.pipe(Effect.provide(previous_server))
        )
        const compatible = PublishingBrowser.update(
            compat_loading,
            compat_result
        )[0]
        expect(PublishingBrowser.library(compatible)?.releases[0]?.status).toBe(
            "ready"
        )
        expect(PublishingBrowser.project(compatible).can_build).toBe(true)
        expect(PublishingBrowser.project(compatible).can_deploy).toBe(false)
        Scene.scene(
            publication_scene,
            Scene.given(compatible),
            Scene.expect(
                Scene.role("button", { name: "Build release" })
            ).toBeEnabled()
        )
        const build_failure = async () => {
            const [pending, commands] = PublishingBrowser.update(built, {
                _tag: "RequestedBuild",
            })
            const command = commands[0]
            if (command === undefined) throw new Error("Missing retry build")
            const result = await Effect.runPromise(
                command.effect.pipe(Effect.provide(layer))
            )
            return Option.getOrNull(
                PublishingBrowser.update(pending, result)[0].ui.error
            )
        }
        await pg.query(
            "UPDATE pages SET content_type='landing_json',content=$1 WHERE id=$2",
            [JSON.stringify(urm_marketing_landing_page), page.id]
        )
        expect(await build_failure()).toContain(
            "bundled logos, which can only be built for urm.urm.dev"
        )
        await pg.query(
            "UPDATE pages SET publication_state='draft' WHERE id=$1",
            [page.id]
        )
        expect(await build_failure()).toContain(
            'The homepage "About" is draft.'
        )
        await pg.query("UPDATE pages SET content=$1 WHERE id=$2", [
            JSON.stringify(marketing_starter_landing_page),
            page.id,
        ])
        model = await settle(
            PagesBrowser.synchronize(PagesBrowser.init(url("/web/pages")), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        const landing = PagesBrowser.library(model)?.pages.find(
            (candidate) => candidate.id === page.id
        )
        if (landing === undefined) throw new Error("Expected homepage draft")
        expect(landing.is_homepage).toBe(true)
        expect(landing.publication_state).toBe("draft")
        const publication_controls = (is_editing: boolean) => ({
            update: (
                model: PagesBrowser.Model,
                message: PagesBrowser.Message
            ) => {
                const [next, commands] = PagesBrowser.update(model, message)
                return { model: next, commands }
            },
            view: (
                model: PagesBrowser.Model,
                h: HtmlBuilder<PagesBrowser.Message>
            ) =>
                h.submodel({
                    slotId: "test-landing-publication",
                    model,
                    view: PagesBrowser.publicationControlsView,
                    viewInputs: { page_id: landing.id, is_editing },
                    toParentMessage: (message) => message,
                }),
        })
        Scene.scene(
            publication_controls(false),
            Scene.given(model),
            Scene.expect(
                Scene.role("button", { name: "Publish homepage" })
            ).toBeEnabled()
        )
        Scene.scene(
            publication_controls(true),
            Scene.given(model),
            Scene.expect(
                Scene.role("button", { name: "Publish homepage" })
            ).toBeDisabled()
        )
        model = await settle(
            PagesBrowser.update(
                model,
                PagesBrowser.RequestedPagePublication({
                    id: landing.id,
                    publication_state: "published",
                })
            )
        )
        Scene.scene(
            publication_controls(false),
            Scene.given(model),
            Scene.expect(
                Scene.role("button", { name: "Return to draft" })
            ).toBeEnabled()
        )
        expect(
            PagesBrowser.library(model)?.pages.find(
                (candidate) => candidate.id === landing.id
            )
        ).toMatchObject({ is_homepage: true, publication_state: "published" })
        expect(await build_failure()).toBeNull()
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const wrong_owner = await run(
            Effect.result(
                api_handlers(principal).FoldkitRemoteMutate({
                    requestId: randomUUID(),
                    mutation: "ChangePages",
                    input: {
                        domain_id: owner.domain_id,
                        subdomain_slug: "docs",
                        action: { _tag: "select_homepage", id: landing.id },
                    },
                })
            )
        )
        expect(wrong_owner._tag).toBe("Failure")
    }, 30_000)
})

describe("PostgreSQL publication assets", () => {
    it("publishes subdomains through browser RPC with isolated preview/live jobs and owner catalog", async () => {
        const owner = await seed("subdomain-publish")
        const session = await login("subdomain-publish")
        const subdomain_id = randomUUID()
        const sibling_id = randomUUID()
        await pg.query(
            "INSERT INTO subdomains (id,domain_id,name,slug,kind,status,access,created_at,updated_at) VALUES ($1,$3,'Docs','docs','documentation','draft','public',1,1),($2,$3,'Survey','survey','survey','draft','public',2,2)",
            [subdomain_id, sibling_id, owner.domain_id]
        )
        await pg.query(
            "INSERT INTO pages (id,domain_id,subdomain_id,title,content,content_type,slug,navigation_label,show_in_navigation,order_position,is_homepage,publication_state,noindex,created_at,updated_at) VALUES ($1,$2,$3,'Docs','# Documentation','markdown',NULL,'Docs',true,0,true,'published',false,1,1)",
            [randomUUID(), owner.domain_id, subdomain_id]
        )
        const fetch_publication: typeof fetch = (input, init) => {
            const request = new Request(input, init)
            request.headers.set("cookie", `urm_account=${session.token}`)
            return run(
                new URL(request.url).pathname.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_publication
        )
        const settle = async (transition: PublishingBrowser.UpdateReturn) => {
            const [pending, commands] = transition
            const command = commands[0]
            if (command === undefined)
                throw new Error("Missing publishing command")
            const message = await Effect.runPromise(
                command.effect.pipe(Effect.provide(layer))
            )
            return PublishingBrowser.update(pending, message)
        }
        const step = (
            model: PublishingBrowser.Model,
            message: PublishingBrowser.Message
        ) => settle(PublishingBrowser.update(model, message))
        const [root] = await settle(
            PublishingBrowser.synchronize(PublishingBrowser.init(), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(
            PublishingBrowser.publication_owners(root).map(
                (owner) => owner.slug
            )
        ).toEqual(["survey", "docs"])
        expect(
            PublishingBrowser.update(root, {
                _tag: "SelectedOwner",
                subdomain_id: "missing",
            })[0]
        ).toBe(root)
        const [selected] = await step(root, {
            _tag: "SelectedOwner",
            subdomain_id,
        })
        expect(selected.subdomain_slug).toBe("docs")
        const [built] = await step(selected, { _tag: "RequestedBuild" })
        const release = PublishingBrowser.project(built).releases[0]
        if (release === undefined) throw new Error("Missing subdomain release")
        const scene = {
            model: PublishingBrowser.Model,
            message: PublishingBrowser.Message,
            update: (model: PublishingBrowser.Model) => ({ model }),
            view: (
                model: PublishingBrowser.Model,
                h: HtmlBuilder<PublishingBrowser.Message>
            ) =>
                h.submodel({
                    slotId: "subdomain-publishing",
                    model,
                    view: PublishingBrowser.view,
                    // The canonical owner catalog must override legacy/empty inputs.
                    viewInputs: {
                        domain_name: "Subdomain publication",
                        domain_slug: "subdomain-publish",
                        subdomains: [],
                    },
                    toParentMessage: (message) => message,
                }),
        }
        Scene.scene(
            scene,
            Scene.given(built),
            Scene.expect(
                Scene.role("button", { name: "Preview site" })
            ).toBeEnabled(),
            Scene.expect(
                Scene.role("button", { name: "Publish live" })
            ).toBeDisabled()
        )
        const mutate = (
            mode: "preview" | "live",
            idempotency_key: string = randomUUID(),
            slug = "docs",
            release_id: string = release._id
        ) =>
            Effect.runPromise(
                Effect.flatMap(ContactsApi, (api) =>
                    Remote.mutate(
                        DeploySubdomain,
                        {
                            domain_id: owner.domain_id,
                            subdomain_slug: slug,
                            release_id,
                            idempotency_key,
                            mode,
                        },
                        randomUUID()
                    ).pipe(
                        Effect.provide(api.remote(owner.domain_id)),
                        Effect.result
                    )
                ).pipe(Effect.provide(layer))
            )
        expect((await mutate("live"))._tag).toBe("Failure")
        expect((await mutate("preview", randomUUID(), "missing"))._tag).toBe(
            "Failure"
        )
        expect((await mutate("preview", randomUUID(), "survey"))._tag).toBe(
            "Failure"
        )
        const [queued, queue_effects] = await step(built, {
            _tag: "RequestedPreview",
            release_id: release._id,
        })
        const job = PublishingBrowser.project(queued).jobs[0]
        if (job === undefined) throw new Error("Missing preview job")
        expect(job).toMatchObject({
            channel: "live",
            operation: "preview",
            subdomain_id,
            status: "pending",
        })
        expect(
            queue_effects.some(
                (command) => command.name === "PlayDeploymentSuccessAudio"
            )
        ).toBe(false)
        expect((await mutate("preview", job.idempotency_key))._tag).toBe(
            "Success"
        )
        expect((await mutate("live", job.idempotency_key))._tag).toBe("Failure")
        expect((await mutate("preview"))._tag).toBe("Failure")
        const [root_during_preview] = await step(queued, {
            _tag: "SelectedOwner",
            subdomain_id: "",
        })
        expect(PublishingBrowser.project(root_during_preview).jobs).toEqual([])
        expect(PublishingBrowser.project(root_during_preview).releases).toEqual(
            []
        )
        expect(
            PublishingBrowser.update(root_during_preview, {
                _tag: "PublishingLoaded",
                epoch: queued.epoch,
                remote: queued.remote,
                built: false,
                job_id: job._id,
            })[0]
        ).toBe(root_during_preview)
        let uploads = 0
        const provider = PreviewDeployer.of({
            deploy: (descriptor) =>
                Effect.sync(() => {
                    uploads += 1
                    expect(descriptor.subdomain_id).toBe(subdomain_id)
                    expect(descriptor.release_id).toBe(release._id)
                    expect(descriptor.artifact_directory).toBe(
                        `packages/ssg/dist/builds/pg-${release._id}`
                    )
                    if (descriptor.environment === "preview") {
                        expect(descriptor.channel).toBeUndefined()
                        expect(descriptor.hostnames).toEqual([])
                    } else {
                        expect(descriptor.channel).toBe("live")
                        expect(descriptor.hostnames).toEqual([
                            "docs.subdomain-publish.urm.dev",
                        ])
                    }
                    return {
                        resource_id: "resource",
                        worker_name: "worker",
                        url: "https://docs-preview.workers.dev",
                    }
                }),
        })
        await run(
            run_development_job().pipe(
                Effect.provideService(PreviewDeployer, provider)
            )
        )
        const [previewed, preview_effects] = await step(queued, {
            _tag: "PublishingRefreshed",
        })
        expect(
            PublishingBrowser.project(previewed).deployments[0]
        ).toMatchObject({
            is_preview: true,
            url: "https://docs-preview.workers.dev",
            status: "succeeded",
        })
        expect(
            preview_effects.some(
                (command) => command.name === "PlayDeploymentSuccessAudio"
            )
        ).toBe(true)
        expect(
            (
                await pg.query(
                    "SELECT live_release_id FROM subdomains WHERE id=$1",
                    [subdomain_id]
                )
            ).rows
        ).toEqual([{ live_release_id: null }])
        Scene.scene(
            scene,
            Scene.given(previewed),
            Scene.expect(
                Scene.role("button", { name: "Publish live" })
            ).toBeEnabled()
        )
        const [live_pending] = await step(previewed, {
            _tag: "RequestedDeployment",
            release_id: release._id,
            channel: "live",
        })
        await run(
            run_development_job().pipe(
                Effect.provideService(PreviewDeployer, provider)
            )
        )
        const [live, live_effects] = await step(live_pending, {
            _tag: "PublishingRefreshed",
        })
        expect(PublishingBrowser.project(live).deployments[0]).toMatchObject({
            is_preview: false,
            channel: "live",
            status: "succeeded",
            url: "https://docs.subdomain-publish.urm.dev",
        })
        expect(
            live_effects.some(
                (command) => command.name === "PlayDeploymentSuccessAudio"
            )
        ).toBe(true)
        expect(
            (
                await pg.query(
                    "SELECT live_release_id,live_deployment_id FROM subdomains WHERE id=$1",
                    [subdomain_id]
                )
            ).rows
        ).toEqual([
            {
                live_release_id: release._id,
                live_deployment_id:
                    PublishingBrowser.project(live).jobs[0]?._id,
            },
        ])
        expect(uploads).toBe(2)
        expect((await step(live, { _tag: "PublishingRefreshed" }))[1]).toEqual(
            []
        )
        // A new cancelled preview invalidates the preview gate without altering the live pointer.
        const [cancel_pending] = await step(live, {
            _tag: "RequestedPreview",
            release_id: release._id,
        })
        const cancel_id = PublishingBrowser.project(cancel_pending).jobs[0]?._id
        if (cancel_id === undefined) throw new Error("Missing cancellation job")
        const [cancelled] = await step(cancel_pending, {
            _tag: "RequestedCancellation",
            job_id: cancel_id,
        })
        expect(PublishingBrowser.project(cancelled).jobs[0]?.status).toBe(
            "cancelled"
        )
        expect(
            await run(
                run_development_job().pipe(
                    Effect.provideService(PreviewDeployer, provider)
                )
            )
        ).toBe(false)
        expect((await mutate("live"))._tag).toBe("Failure")
        Scene.scene(
            scene,
            Scene.given(cancelled),
            Scene.expect(
                Scene.role("button", { name: "Publish live" })
            ).toBeDisabled()
        )
        for (const [column, value] of [
            ["access", "password"],
            ["status", "disabled"],
        ]) {
            // Column choices are fixed by this test; production queries use Drizzle SQL.
            await pg.query(`UPDATE subdomains SET ${column}=$1 WHERE id=$2`, [
                value,
                subdomain_id,
            ])
            expect((await mutate("preview"))._tag).toBe("Failure")
            await pg.query(
                "UPDATE subdomains SET access='public',status='draft' WHERE id=$1",
                [subdomain_id]
            )
        }
        await pg.query("UPDATE subdomains SET expires_at=1 WHERE id=$1", [
            subdomain_id,
        ])
        expect((await mutate("preview"))._tag).toBe("Failure")
        await pg.query("UPDATE subdomains SET expires_at=NULL WHERE id=$1", [
            subdomain_id,
        ])
        const [access_pending] = await step(cancelled, {
            _tag: "RequestedPreview",
            release_id: release._id,
        })
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await mutate("preview"))._tag).toBe("Failure")
        await run(
            run_development_job().pipe(
                Effect.provideService(PreviewDeployer, provider)
            )
        )
        expect(uploads).toBe(2)
        const [access_failed] = await step(access_pending, {
            _tag: "PublishingRefreshed",
        })
        expect(PublishingBrowser.project(access_failed).jobs[0]?.status).toBe(
            "failed"
        )
        expect(
            PublishingBrowser.update(
                { ...access_failed, can_write: false },
                { _tag: "RequestedPreview", release_id: release._id }
            )[1]
        ).toEqual([])
    }, 30_000)

    it("copies only captured workspace images and keeps completed artifacts independent of source edits", async () => {
        const owner = await seed("release-assets")
        const other = await seed("release-assets-other")
        const session = await login("release-assets")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const scope = { domain_id: owner.domain_id, subdomain_slug: null }
        const source_id = randomUUID()
        const source = `/api/uploads/${owner.domain_id}/pages/${source_id}`
        const key = `domains/${owner.domain_id}/pages/images/${source_id}`
        const page_id = randomUUID()
        const image_id = randomUUID()
        const document = (src: string) =>
            JSON.stringify({
                schema_version: 1,
                document: {
                    type: "doc",
                    children: [
                        { type: "image", src, alt: "Published photograph" },
                        { type: "image", src, alt: "Same image again" },
                    ],
                },
            })
        const save = (
            content: string,
            content_type = "rich_text_json",
            is_new = false
        ) =>
            run(
                handlers.FoldkitRemoteMutate({
                    requestId: randomUUID(),
                    mutation: "ChangePages",
                    input: {
                        ...scope,
                        action: {
                            _tag: is_new ? "create" : "update",
                            id: page_id,
                            title: "Images",
                            content,
                            content_type,
                            slug: null,
                            navigation_label: "Home",
                            show_in_navigation: true,
                            is_homepage: true,
                            publication_state: "published",
                            seo_title: null,
                            seo_description: null,
                            noindex: false,
                            template_source: null,
                        },
                    },
                })
            )
        await save(document(source), "rich_text_json", true)
        await run(
            handlers.FoldkitRemoteMutate({
                requestId: randomUUID(),
                mutation: "ChangeBlog",
                input: {
                    ...scope,
                    action: {
                        _tag: "save",
                        id: randomUUID(),
                        is_new: true,
                        title: "Image post",
                        content: document(source),
                        content_type: "rich_text_json",
                        excerpt: null,
                        seo_title: null,
                        seo_description: null,
                        slug: "image-post",
                        published: true,
                    },
                },
            })
        )
        const reads: string[] = []
        let missing = false
        const storage = ReleaseAssetStorage.of({
            read: (requested_key) =>
                Effect.suspend(() => {
                    reads.push(requested_key)
                    return missing || requested_key !== key
                        ? Effect.fail(
                              new PublishingError({
                                  message: "Missing test image",
                              })
                          )
                        : Effect.succeed({
                              bytes: png,
                              content_type: "image/png",
                          })
                }),
        })
        const build = (idempotency_key = randomUUID()) =>
            run(
                build_publication(principal, {
                    ...scope,
                    idempotency_key,
                }).pipe(
                    Effect.provide(SiteBuildWriterLive),
                    Effect.provideService(ReleaseAssetStorage, storage)
                )
            )
        const idempotency_key = randomUUID()
        const release_id = await build(idempotency_key)
        expect(await build(idempotency_key)).toBe(release_id)
        expect(reads).toEqual([key])
        const release = (
            await run(
                Effect.flatMap(PublishingRepository, (repository) =>
                    repository.load_library(principal, null)
                )
            )
        ).releases[0]
        expect(release?.status).toBe("ready")
        expect(JSON.stringify(release?.snapshot)).not.toContain("/api/uploads/")
        const manifest = Schema.decodeUnknownSync(
            Schema.fromJsonString(SiteBuildManifest)
        )(
            await readFile(
                new URL(
                    `../../../packages/ssg/dist/builds/pg-${release_id}/manifest.json`,
                    import.meta.url
                ),
                "utf8"
            )
        )
        const asset = manifest.assets?.find(
            (asset) => asset.media_type === "image/png"
        )
        if (asset === undefined) throw new Error("Published image missing")
        expect(asset.sha256).toBe(
            createHash("sha256").update(png).digest("hex")
        )
        expect(
            await readFile(
                new URL(
                    `../../../packages/ssg/dist/builds/pg-${release_id}/${asset.output_path}`,
                    import.meta.url
                )
            )
        ).toEqual(Buffer.from(png))
        const html = await readFile(
            new URL(
                `../../../packages/ssg/dist/builds/pg-${release_id}/index.html`,
                import.meta.url
            ),
            "utf8"
        )
        expect(html).toContain(`/${asset.output_path}`)
        expect(html).not.toContain("/api/uploads/")
        const captured = await pg.query(
            "SELECT asset_sources FROM publication_releases WHERE id=$1",
            [release_id]
        )
        expect(
            Schema.decodeUnknownSync(
                Schema.Struct({
                    asset_sources: Schema.Array(ReleaseAssetSource),
                })
            )(captured.rows[0]).asset_sources
        ).toEqual([{ key, output_path: asset.output_path }])

        await pg.query(
            "INSERT INTO images (id,domain_id,url,alt,text,order_position,created_at,updated_at) VALUES ($1,$2,$3,'','',0,1,1)",
            [image_id, owner.domain_id, source]
        )
        const landing = (id: string) =>
            JSON.stringify({
                schema_version: 1,
                blocks: [
                    {
                        _tag: "Hero",
                        id: "hero",
                        heading: "Hello",
                        body: "",
                        actions: [],
                        image: {
                            _tag: "DomainImage",
                            image_id: id,
                            alt: "Landing photograph",
                        },
                    },
                ],
            })
        await save(landing(image_id), "landing_json")
        const landing_release = await build()
        expect(
            await readFile(
                new URL(
                    `../../../packages/ssg/dist/builds/pg-${landing_release}/index.html`,
                    import.meta.url
                ),
                "utf8"
            )
        ).toContain(`/${asset.output_path}`)
        await pg.query("UPDATE images SET domain_id=$1 WHERE id=$2", [
            other.domain_id,
            image_id,
        ])
        await expect(build()).rejects.toBeDefined()
        expect(reads).toHaveLength(2)

        for (const invalid of [
            `/api/uploads/${other.domain_id}/pages/${source_id}`,
            `${source}?token=secret`,
            `https://untrusted.test${source}`,
            "https://storage.test/image?X-Amz-Signature=secret",
        ]) {
            await save(document(invalid))
            await expect(build()).rejects.toBeDefined()
        }
        expect(reads).toHaveLength(2)
        await save(document(source))
        missing = true
        await expect(build()).rejects.toBeDefined()
        const failed = await pg.query(
            "SELECT status FROM publication_releases WHERE domain_id=$1 ORDER BY created_at DESC LIMIT 1",
            [owner.domain_id]
        )
        expect(failed.rows[0]).toEqual({ status: "failed" })
        expect(
            await readFile(
                new URL(
                    `../../../packages/ssg/dist/builds/pg-${release_id}/${asset.output_path}`,
                    import.meta.url
                )
            )
        ).toEqual(Buffer.from(png))

        await run(revoke_token(session.token))
        const previous_reads = reads.length
        await expect(build()).rejects.toBeDefined()
        expect(reads).toHaveLength(previous_reads)
    })
})

describe("PostgreSQL publication configuration", () => {
    it("captures layouts, private logos, ordered navigation and Blog inclusion with owner isolation", async () => {
        const owner = await seed("configuration")
        const other = await seed("configuration-other")
        const session = await login("configuration")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const scope = { domain_id: owner.domain_id, subdomain_slug: null }
        const mutate = (mutation: string, input: unknown) =>
            run(
                handlers.FoldkitRemoteMutate({
                    requestId: randomUUID(),
                    mutation,
                    input,
                })
            )
        const home_id = randomUUID()
        const image_id = randomUUID()
        const image_url = `/api/uploads/${owner.domain_id}/pages/${image_id}`
        const home = {
            _tag: "create",
            id: home_id,
            title: "Home",
            content: "Welcome",
            content_type: "text",
            slug: null,
            navigation_label: "Start",
            show_in_navigation: true,
            is_homepage: true,
            publication_state: "published",
            seo_title: null,
            seo_description: null,
            noindex: false,
            template_source: null,
        }
        await mutate("ChangePages", { ...scope, action: home })
        await mutate("ChangeBlog", {
            ...scope,
            action: {
                _tag: "save",
                id: randomUUID(),
                is_new: true,
                title: "News",
                content: "News",
                content_type: "text",
                excerpt: null,
                seo_title: null,
                seo_description: null,
                slug: "news",
                published: true,
            },
        })
        const layout = {
            _tag: "save_layout",
            theme_id: "nord",
            appearance: "dark",
            site_title: "Published title",
            show_site_title: true,
            social_links: [],
            logo_light_url: image_url,
            logo_dark_url: null,
            favicon_light_url: image_url,
            favicon_dark_url: null,
        }
        const configure = (
            action: unknown,
            domain_id = owner.domain_id,
            subdomain_slug: string | null = null
        ) =>
            mutate("ChangePublicationConfiguration", {
                domain_id,
                subdomain_slug,
                action,
            })
        await configure(layout)
        await expect(configure(layout, other.domain_id)).rejects.toBeDefined()
        await expect(
            configure(layout, owner.domain_id, "unknown")
        ).rejects.toBeDefined()
        await expect(
            configure({
                ...layout,
                logo_light_url: `/api/uploads/${other.domain_id}/pages/${image_id}`,
            })
        ).rejects.toBeDefined()
        await configure({ _tag: "initialize_navigation" })
        const rows = await pg.query(
            "SELECT navigation FROM publication_configurations WHERE domain_id=$1",
            [owner.domain_id]
        )
        const navigation = Schema.decodeUnknownSync(
            Schema.Struct({
                navigation: Schema.Array(Schema.Struct({ id: Schema.String })),
            })
        )(rows.rows[0]).navigation
        expect(navigation).toHaveLength(2)
        await expect(
            configure({
                _tag: "reorder_navigation",
                ids: [navigation[0]?.id, "missing"],
            })
        ).rejects.toBeDefined()
        await configure({
            _tag: "reorder_navigation",
            ids: navigation.map((item) => item.id).reverse(),
        })
        const source_key = `domains/${owner.domain_id}/pages/images/${image_id}`
        const storage = ReleaseAssetStorage.of({
            read: (key) =>
                key === source_key
                    ? Effect.succeed({ bytes: png, content_type: "image/png" })
                    : Effect.fail(
                          new PublishingError({ message: "Wrong image" })
                      ),
        })
        const build = () =>
            run(
                build_publication(principal, {
                    ...scope,
                    idempotency_key: randomUUID(),
                }).pipe(
                    Effect.provide(SiteBuildWriterLive),
                    Effect.provideService(ReleaseAssetStorage, storage)
                )
            )
        const id = await build()
        const library = await run(
            Effect.flatMap(PublishingRepository, (repository) =>
                repository.load_library(principal, null)
            )
        )
        const release = library.releases.find((release) => release.id === id)
        expect(release?.snapshot.layout).toMatchObject({
            name: "Published title",
            theme: { theme_id: "nord", appearance: "dark" },
            navigation: [
                { label: "Blog", path: "/blog/" },
                { label: "Start", path: "/" },
            ],
        })
        expect(release?.snapshot.layout?.logo_light_url).toMatch(
            /^\/assets\/published-/
        )
        const html = await readFile(
            new URL(
                `../../../packages/ssg/dist/builds/pg-${id}/index.html`,
                import.meta.url
            ),
            "utf8"
        )
        expect(html).toContain('rel="icon"')
        expect(html).toContain(release?.snapshot.layout?.logo_light_url)
        expect(html).toContain("Published title")
        await configure({
            _tag: "save_module",
            module_id: "blog",
            included: false,
        })
        const without_blog = await build()
        const updated = await run(
            Effect.flatMap(PublishingRepository, (repository) =>
                repository.load_library(principal, null)
            )
        )
        expect(
            updated.releases.find((release) => release.id === without_blog)
                ?.snapshot.blog_posts
        ).toEqual([])
        expect(
            updated.releases.find((release) => release.id === without_blog)
                ?.snapshot.layout?.navigation
        ).toEqual([{ label: "Start", path: "/" }])
        expect(
            updated.releases.find((release) => release.id === id)?.snapshot
                .blog_posts
        ).toHaveLength(1)
        const extra_page = randomUUID()
        await mutate("ChangePages", {
            ...scope,
            action: {
                ...home,
                id: extra_page,
                title: "About",
                slug: "about",
                is_homepage: false,
                navigation_label: "About",
            },
        })
        const appended = await pg.query(
            "SELECT navigation FROM publication_configurations WHERE domain_id=$1",
            [owner.domain_id]
        )
        expect(JSON.stringify(appended.rows)).toContain(extra_page)
        await mutate("ChangePages", {
            ...scope,
            action: { _tag: "remove", id: extra_page },
        })
        const removed = await pg.query(
            "SELECT navigation FROM publication_configurations WHERE domain_id=$1",
            [owner.domain_id]
        )
        expect(JSON.stringify(removed.rows)).not.toContain(extra_page)
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        await expect(configure(layout)).rejects.toBeDefined()
        const read = await run(
            handlers.FoldkitRemoteQuery({
                query: "PublicationConfiguration",
                input: scope,
                window: {},
            })
        )
        expect(read).toBeDefined()
        await run(revoke_token(session.token))
        await expect(
            run(
                handlers.FoldkitRemoteQuery({
                    query: "PublicationConfiguration",
                    input: scope,
                    window: {},
                })
            )
        ).rejects.toBeDefined()
    })
})

describe("PostgreSQL layout browser", () => {
    it("saves the retained appearance, navigation and image controls through account RPC", async () => {
        const owner = await seed("layout-browser")
        const session = await login("layout-browser")
        const homepage_id = randomUUID()
        await run(
            api_handlers({
                ...(await run(authenticate_token(session.token))),
                domain_id: owner.domain_id,
            }).FoldkitRemoteMutate({
                requestId: randomUUID(),
                mutation: "ChangePages",
                input: {
                    domain_id: owner.domain_id,
                    subdomain_slug: null,
                    action: {
                        _tag: "create",
                        id: homepage_id,
                        title: "Preview home",
                        content: "# Preview content",
                        content_type: "markdown",
                        slug: null,
                        navigation_label: "Home",
                        show_in_navigation: true,
                        is_homepage: true,
                        publication_state: "published",
                        seo_title: null,
                        seo_description: null,
                        noindex: false,
                        template_source: null,
                    },
                },
            })
        )
        const preview_post_id = randomUUID()
        await run(
            api_handlers({
                ...(await run(authenticate_token(session.token))),
                domain_id: owner.domain_id,
            }).FoldkitRemoteMutate({
                requestId: randomUUID(),
                mutation: "ChangeBlog",
                input: {
                    domain_id: owner.domain_id,
                    subdomain_slug: null,
                    action: {
                        _tag: "save",
                        id: preview_post_id,
                        is_new: true,
                        title: "Preview blog post",
                        content: "Published body",
                        content_type: "text",
                        excerpt: null,
                        seo_title: null,
                        seo_description: null,
                        slug: "preview-post",
                        published: true,
                    },
                },
            })
        )
        const save_requests: string[] = []
        const fetch_layout: typeof fetch = (input, init) => {
            const request = new Request(input, init)
            save_requests.push(new URL(request.url).pathname)
            request.headers.set("cookie", `urm_account=${session.token}`)
            const path = new URL(request.url).pathname
            return run(
                path.startsWith("/auth/")
                    ? handle_auth_request(request)
                    : path.startsWith("/api/uploads")
                      ? upload_request(request)
                      : handle_rpc_request(request)
            )
        }
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            fetch_layout
        )
        const domain_id = Option.some(
            Schema.decodeUnknownSync(DomainId)(owner.domain_id)
        )
        const settle = async ([
            initial,
            commands,
        ]: LayoutBrowser.UpdateReturn) => {
            let model = initial
            const mutation_requests: string[][] = []
            const pending_commands = [...commands]
            for (const command of pending_commands) {
                const request_start = save_requests.length
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                if (message._tag === "ConfigurationSaved")
                    mutation_requests.push(
                        save_requests
                            .slice(request_start)
                            .filter((path) => !path.startsWith("/api/uploads"))
                    )

                const result = LayoutBrowser.update(
                    model,
                    message,
                    domain_id,
                    []
                )
                model = result[0]
                pending_commands.push(...result[1])
            }
            for (const paths of mutation_requests)
                expect(paths).toEqual(["/api/rpc/"])
            return model
        }
        const url = Url.make({
            protocol: "https:",
            host: "urm.test",
            port: Option.none(),
            pathname: "/design/layouts/main-layout",
            search: Option.none(),
            hash: Option.none(),
        })
        let model = await settle(
            LayoutBrowser.synchronize(LayoutBrowser.init(url), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(model.pending).toBe(false)
        expect(LayoutBrowser.configuration(model)).toBeDefined()
        expect(LayoutBrowser.project(model).editor.preview_blog_posts).toEqual([
            {
                id: preview_post_id,
                title: "Preview blog post",
                slug: "preview-post",
                published: true,
            },
        ])
        expect(
            LayoutBrowser.project(model).editor.preview_blog_unavailable
        ).toBe(false)

        expect(
            Option.getOrNull(
                LayoutBrowser.project(model).editor.preview_document
            )?.title
        ).toBe("Preview home")
        expect(Option.getOrNull(model.ui.editor.preview_page_id)).toBe(
            homepage_id
        )
        expect(Option.isSome(model.ui.editor.preview_markdown)).toBe(true)
        const update = (message: LayoutBrowser.Message) =>
            LayoutBrowser.update(model, message, domain_id, [])
        model = await settle(
            update(
                LayoutBrowser.GotLayoutEditorMessage({
                    message: {
                        _tag: "ChangedSiteTitle",
                        value: "Browser site",
                    },
                })
            )
        )
        model = await settle(
            update(
                LayoutBrowser.GotLayoutEditorMessage({
                    message: { _tag: "ChangedSiteTheme", value: "nord" },
                })
            )
        )
        model = await settle(
            update(
                LayoutBrowser.GotLayoutEditorMessage({
                    message: { _tag: "RequestedSaveSiteAppearance" },
                })
            )
        )
        expect(LayoutBrowser.configuration(model)?.layout).toMatchObject({
            site_title: "Browser site",
            theme_id: "nord",
        })
        model = await settle(
            update(
                LayoutBrowser.GotLayoutEditorMessage({
                    message: {
                        _tag: "GotLightLogoDropMessage",
                        message: {
                            _tag: "DroppedFiles",
                            files: [
                                new File([png], "logo.png", {
                                    type: "image/png",
                                }),
                            ],
                        },
                    },
                })
            )
        )
        const logo_url =
            LayoutBrowser.configuration(model)?.layout?.logo_light_url
        expect(logo_url).toContain("/pages/")
        expect(
            LayoutBrowser.project(model).images.map((image) => image.url)
        ).toContain(logo_url)
        expect(model.ui.editor.logo_uploading).toEqual(Option.none())
        model = await settle(
            update(
                LayoutBrowser.GotLayoutEditorMessage({
                    message: {
                        _tag: "GotLightFaviconDropMessage",
                        message: {
                            _tag: "DroppedFiles",
                            files: [
                                new File([png], "favicon.png", {
                                    type: "image/png",
                                }),
                            ],
                        },
                    },
                })
            )
        )
        expect(
            LayoutBrowser.configuration(model)?.layout?.favicon_light_url
        ).toContain("/pages/")
        model = await settle(
            update({ _tag: "RequestedInitializePublicationNavigation" })
        )
        const item = LayoutBrowser.project(model).navigation_items[0]
        if (item === undefined) throw new Error("Expected Blog navigation")
        model = await settle(
            update({
                _tag: "RequestedTogglePublicationNavigation",
                navigation_item_id: item._id,
            })
        )
        expect(LayoutBrowser.configuration(model)?.navigation[0]?.visible).toBe(
            false
        )
        model = await settle(
            update(
                LayoutBrowser.GotLayoutEditorMessage({
                    message: {
                        _tag: "RequestedRemoveLayoutLogo",
                        variant: "light",
                    },
                })
            )
        )
        expect(
            LayoutBrowser.configuration(model)?.layout?.logo_light_url
        ).toBeNull()
        model = await settle(
            update(
                LayoutBrowser.GotLayoutEditorMessage({
                    message: {
                        _tag: "GotLightFaviconDropMessage",
                        message: {
                            _tag: "DroppedFiles",
                            files: [
                                new File(["invalid"], "bad.png", {
                                    type: "image/png",
                                }),
                            ],
                        },
                    },
                })
            )
        )
        expect(model.pending).toBe(false)
        expect(model.ui.editor.favicon_uploading).toEqual(Option.none())
        expect(Option.isSome(model.ui.editor.error)).toBe(true)
        const readonly = { ...model, can_write: false }
        expect(
            LayoutBrowser.update(
                readonly,
                LayoutBrowser.GotLayoutEditorMessage({
                    message: { _tag: "RequestedSaveSiteAppearance" },
                }),
                domain_id,
                []
            )[1]
        ).toEqual([])
    })
})

describe("PostgreSQL subdomains and Events", () => {
    it("creates subdomains through Remote and guards ownership, reserved names and dependent content", async () => {
        const owner = await seed("subdomains-crud")
        const other = await seed("subdomains-other")
        const session = await login("subdomains-crud")
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const settle = async ([
            initial,
            commands,
        ]: SubdomainsBrowser.UpdateReturn) => {
            let model = initial
            for (const command of commands) {
                if (command.name !== "LoadSubdomainCatalog")
                    throw new Error("Unexpected legacy command")
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                model = SubdomainsBrowser.update(model, message)[0]
            }
            return model
        }
        let model = await settle(
            SubdomainsBrowser.synchronize(SubdomainsBrowser.init(), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(SubdomainsBrowser.library(model)?.subdomains).toEqual([])
        model = SubdomainsBrowser.update(
            model,
            SubdomainsBrowser.ChangedNewSubdomainName({ value: "Handbook" })
        )[0]
        model = SubdomainsBrowser.update(
            model,
            SubdomainsBrowser.ChangedNewSubdomainSlug({ value: "handbook" })
        )[0]
        model = await settle(
            SubdomainsBrowser.update(
                model,
                SubdomainsBrowser.SubmittedNewSubdomain()
            )
        )
        const row = SubdomainsBrowser.library(model)?.subdomains[0]
        expect(row).toMatchObject({
            name: "Handbook",
            slug: "handbook",
            domain_id: owner.domain_id,
        })
        if (row === undefined) throw new Error("Subdomain save failed")
        expect(model.ui.new_subdomain_name).toBe("")
        const write = (action: SubdomainAction, domain_id = owner.domain_id) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    return yield* Remote.mutate(
                        ChangeSubdomains,
                        { domain_id, action },
                        randomUUID()
                    ).pipe(Effect.provide(api.remote(domain_id)), Effect.exit)
                }).pipe(Effect.provide(layer))
            )
        expect(
            (await write({ ...row, _tag: "update", name: "Manual" }))._tag
        ).toBe("Success")
        expect(
            (
                await write({
                    ...row,
                    _tag: "create",
                    id: randomUUID(),
                    slug: "mail",
                })
            )._tag
        ).toBe("Failure")
        expect(
            (await write({ _tag: "delete", id: row.id }, other.domain_id))._tag
        ).toBe("Failure")
        await pg.query(
            "INSERT INTO publication_configurations (id,domain_id,subdomain_id) VALUES ($1,$2,$3)",
            [randomUUID(), owner.domain_id, row.id]
        )
        expect((await write({ _tag: "delete", id: row.id }))._tag).toBe(
            "Failure"
        )
        await pg.query(
            "DELETE FROM publication_configurations WHERE subdomain_id=$1",
            [row.id]
        )
        expect((await write({ _tag: "delete", id: row.id }))._tag).toBe(
            "Success"
        )
        expect(
            SubdomainsBrowser.update(
                SubdomainsBrowser.clear_subdomains(model),
                {
                    _tag: "SubdomainsLoaded",
                    epoch: model.epoch,
                    remote: model.remote,
                    operation: "load",
                }
            )[0].domain_id
        ).toBe("")
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (await write({ ...row, _tag: "create", id: randomUUID() }))._tag
        ).toBe("Failure")
    }, 30_000)

    it("preserves Events forms, menu cents, reorder and cascade with account and module authorization", async () => {
        vi.stubGlobal("window", {
            location: { protocol: "https:", host: "urm.test" },
        })
        const owner = await seed("events-browser")
        const other = await seed("events-other")
        const session = await login("events-browser")
        const save_requests: string[] = []
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                save_requests.push(new URL(request.url).pathname)
                request.headers.set("cookie", `urm_account=${session.token}`)
                const path = new URL(request.url).pathname
                return run(
                    path.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : path.startsWith("/api/uploads")
                          ? upload_request(request)
                          : handle_rpc_request(request)
                )
            }
        )
        const navigation_hrefs: unknown[] = []
        const settle = async ([
            initial,
            commands,
        ]: EventsBrowser.UpdateReturn) => {
            let model = initial
            const mutation_requests: string[][] = []
            for (const command of commands) {
                const request_start = save_requests.length
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                if (message._tag === "EventCatalogSaved")
                    mutation_requests.push(
                        save_requests
                            .slice(request_start)
                            .filter((path) => !path.startsWith("/api/uploads"))
                    )

                const [updated, feedback] = EventsBrowser.update(model, message)
                navigation_hrefs.push(
                    ...feedback
                        .filter(
                            (command) =>
                                command.name === "NavigateDesktopEvents"
                        )
                        .map((command) => command.args)
                )
                model = updated
            }
            for (const paths of mutation_requests)
                expect(paths).toEqual(["/api/rpc/"])
            return model
        }
        let model = await settle(
            EventsBrowser.synchronize(EventsBrowser.init("/events/new"), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(EventsBrowser.library(model)?.events).toEqual([])
        const fields: ReadonlyArray<EventsFeature.MessageType> = [
            { _tag: "UpdatedEventDraft", field: "title", value: "Dinner" },
            { _tag: "UpdatedEventDraft", field: "date", value: "2026-10-01" },
            { _tag: "UpdatedEventDraft", field: "start_time", value: "18:30" },
            {
                _tag: "UpdatedEventDraft",
                field: "venue_name",
                value: "Town Hall",
            },
            { _tag: "UpdatedEventDraft", field: "latitude", value: "51.5" },
            { _tag: "UpdatedEventDraft", field: "longitude", value: "-0.12" },
        ]
        for (const input of fields)
            model = EventsBrowser.update(model, input)[0]
        model = await settle(
            EventsBrowser.update(model, { _tag: "SubmittedEventForm" })
        )
        const event = EventsBrowser.library(model)?.events[0]
        expect(event).toMatchObject({
            title: "Dinner",
            date: Date.UTC(2026, 9, 1),
        })
        if (event === undefined)
            throw new Error(model.ui.error ?? "Event save failed")
        expect(model.ui.submitting).toBe(false)
        expect(navigation_hrefs).toContainEqual({ href: `/events/${event.id}` })
        const write = (action: EventAction, domain_id = owner.domain_id) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    return yield* Remote.mutate(
                        ChangeEvents,
                        { domain_id, action },
                        randomUUID()
                    ).pipe(Effect.provide(api.remote(domain_id)), Effect.exit)
                }).pipe(Effect.provide(layer))
            )
        model = EventsBrowser.changed_url(
            model,
            Url.make({
                protocol: "https:",
                host: "urm.test",
                port: Option.none(),
                pathname: "/events/menu/new",
                search: Option.none(),
                hash: Option.none(),
            }),
            "/events/menu/new",
            Option.none()
        )[0]
        const menu_fields: ReadonlyArray<EventsFeature.MessageType> = [
            { _tag: "UpdatedMenuDraft", field: "event_id", value: event.id },
            { _tag: "UpdatedMenuDraft", field: "title", value: "Soup" },
            { _tag: "UpdatedMenuDraft", field: "slug", value: "soup" },
            { _tag: "UpdatedMenuDraft", field: "category", value: "Starter" },
            { _tag: "UpdatedMenuDraft", field: "price", value: "12.34" },
        ]
        for (const input of menu_fields)
            model = EventsBrowser.update(model, input)[0]
        model = await settle(
            EventsBrowser.update(model, { _tag: "SubmittedMenuForm" })
        )
        const item = EventsBrowser.library(model)?.menu_items[0]
        expect(item).toMatchObject({
            title: "Soup",
            price: 1234,
            event_id: event.id,
        })
        if (item === undefined)
            throw new Error(model.ui.error ?? "Menu save failed")
        expect(EventsBrowser.project(model).menuItems[0]?.price).toBe("12.34")
        expect(navigation_hrefs).toContainEqual({ href: "/events/menu" })
        await expect(
            pg.query("UPDATE event_menu_items SET domain_id=$1 WHERE id=$2", [
                other.domain_id,
                item.id,
            ])
        ).rejects.toMatchObject({ code: "23503" })
        expect(
            (
                await write({
                    ...event,
                    _tag: "update_event",
                    title: "Updated dinner",
                })
            )._tag
        ).toBe("Success")
        expect(
            (await write({ ...item, _tag: "update_menu", price: 1500 }))._tag
        ).toBe("Success")
        expect(
            (
                await write({
                    ...item,
                    _tag: "create_menu",
                    id: randomUUID(),
                    event_id: "foreign-event",
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await write({
                    _tag: "reorder_menu",
                    category: "Starter",
                    ids: [item.id],
                })
            )._tag
        ).toBe("Success")
        expect(
            (
                await write({
                    _tag: "reorder_menu",
                    category: "Main",
                    ids: [item.id],
                })
            )._tag
        ).toBe("Success")
        expect(
            (
                await write({
                    _tag: "reorder_menu",
                    category: "Starter",
                    ids: [item.id, item.id],
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await write({
                    _tag: "reorder_menu",
                    category: "Starter",
                    ids: [item.id, "foreign-item"],
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await pg.query(
                    "SELECT category FROM event_menu_items WHERE id=$1",
                    [item.id]
                )
            ).rows
        ).toEqual([{ category: "Main" }])
        expect(
            (
                await write(
                    { _tag: "delete_event", id: event.id },
                    other.domain_id
                )
            )._tag
        ).toBe("Failure")
        const image_url = await Effect.runPromise(
            Effect.gen(function* () {
                const api = yield* ContactsApi
                return yield* api.upload_image(
                    owner.domain_id,
                    new File([png], "dinner.png", { type: "image/png" }),
                    "Events"
                )
            }).pipe(Effect.provide(layer))
        )
        expect(image_url).toContain(`/api/uploads/${owner.domain_id}/events/`)
        expect(
            (
                await run(
                    upload_request(
                        new Request(`https://urm.test${image_url}`, {
                            headers: { cookie: `urm_account=${session.token}` },
                        })
                    )
                )
            ).status
        ).toBe(302)
        const stale = EventsBrowser.update(EventsBrowser.clear(model), {
            _tag: "EventCatalogLoaded",
            epoch: model.epoch,
            remote: model.remote,
        })[0]
        expect(EventsBrowser.library(stale)).toBeUndefined()
        await pg.query("UPDATE domains SET enabled_modules='{}' WHERE id=$1", [
            owner.domain_id,
        ])
        expect((await write({ _tag: "delete_event", id: event.id }))._tag).toBe(
            "Failure"
        )
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Events']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await write({ _tag: "delete_event", id: event.id }))._tag).toBe(
            "Failure"
        )
        await pg.query(
            "UPDATE organization_members SET role='owner' WHERE user_id=$1",
            [owner.account_id]
        )
        expect((await write({ _tag: "delete_event", id: event.id }))._tag).toBe(
            "Success"
        )
        expect(
            (
                await pg.query(
                    "SELECT id FROM event_menu_items WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows
        ).toEqual([])
    }, 30_000)
})

describe("PostgreSQL Events publishing", () => {
    it("opts publications into immutable published Events and menus with scoped assets", async () => {
        const owner = await seed("event-publication")
        const other = await seed("event-private")
        const session = await login("event-publication")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const scope = { domain_id: owner.domain_id, subdomain_slug: null }
        const mutate = (mutation: string, action: unknown) =>
            run(
                handlers.FoldkitRemoteMutate({
                    requestId: randomUUID(),
                    mutation,
                    input: { ...scope, action },
                })
            )
        await mutate("ChangePages", {
            _tag: "create",
            id: randomUUID(),
            title: "Home",
            content: "Welcome",
            content_type: "text",
            slug: null,
            navigation_label: "Home",
            show_in_navigation: true,
            is_homepage: true,
            publication_state: "published",
            seo_title: null,
            seo_description: null,
            noindex: false,
            template_source: null,
        })
        const event_id = randomUUID()
        const image_id = randomUUID()
        const image_url = `/api/uploads/${owner.domain_id}/events/${image_id}`
        const event = {
            _tag: "create_event",
            id: event_id,
            title: "Public dinner",
            description: "Dinner details",
            date: Date.UTC(2026, 9, 1),
            start_time: "18:30",
            end_time: "",
            venue_name: "Hall",
            venue_url: "",
            latitude: "51.5",
            longitude: "-0.12",
            tickets_url: "",
            image_url,
            published: true,
        }
        await mutate("ChangeEvents", event)
        const draft_id = randomUUID()
        await mutate("ChangeEvents", {
            ...event,
            id: draft_id,
            title: "Draft event",
            published: false,
        })
        const menu = {
            _tag: "create_menu",
            id: randomUUID(),
            event_id,
            title: "Public soup",
            description: "Warm soup",
            content: "Seasonal vegetables",
            price: 1234,
            category: "Starter",
            served_at: ["dinner"],
            slug: "soup",
            image_url,
            dietary_labels: "Vegetarian",
            allergens: "Milk",
            published: true,
            order_position: 0,
        }
        await mutate("ChangeEvents", menu)
        await mutate("ChangeEvents", {
            ...menu,
            id: randomUUID(),
            title: "Draft menu",
            published: false,
        })
        await mutate("ChangeEvents", {
            ...menu,
            id: randomUUID(),
            event_id: draft_id,
            title: "Unpublished parent menu",
        })
        const capture = () =>
            run(
                Effect.flatMap(PublishingRepository, (repository) =>
                    repository.capture(principal, null, randomUUID())
                )
            )
        expect((await capture()).release.snapshot.events).toEqual([])
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const url = Url.make({
            protocol: "https:",
            host: "urm.test",
            port: Option.none(),
            pathname: "/web/pages",
            search: Option.none(),
            hash: Option.none(),
        })
        const settle_pages = async ([
            initial,
            commands,
        ]: PagesBrowser.UpdateReturn) => {
            let model = initial
            for (const command of commands)
                model = PagesBrowser.update(
                    model,
                    await Effect.runPromise(
                        command.effect.pipe(Effect.provide(layer))
                    )
                )[0]
            return model
        }
        let pages = await settle_pages(
            PagesBrowser.synchronize(PagesBrowser.init(url), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        const pages_scene = {
            update: (
                model: PagesBrowser.Model,
                message: PagesBrowser.Message
            ) => {
                const [next, commands] = PagesBrowser.update(model, message)
                return { model: next, commands }
            },
            view: (
                model: PagesBrowser.Model,
                h: HtmlBuilder<PagesBrowser.Message>
            ) =>
                h.submodel({
                    slotId: "test-pages",
                    model,
                    view: PagesBrowser.view,
                    viewInputs: {
                        domain_name: "Event publication",
                        domain_slug: "event-publication",
                        subdomains: [],
                        link_suggestions: [],
                        blog_enabled: true,
                        blog_published_count: 0,
                        events_enabled: true,
                        events_published_count: 1,
                    },
                    toParentMessage: (message) => message,
                }),
        }
        Scene.scene(
            pages_scene,
            Scene.given(pages),
            Scene.expect(
                Scene.text("1 published event. Excluded from this site.")
            ).toExist(),
            Scene.expect(
                Scene.role("button", { name: "Add to Pages" })
            ).toBeEnabled()
        )
        Scene.scene(
            pages_scene,
            Scene.given({ ...pages, can_write: false }),
            Scene.expect(
                Scene.role("button", { name: "Add to Pages" })
            ).toBeDisabled()
        )
        pages = await settle_pages(
            PagesBrowser.update(pages, {
                _tag: "RequestedSetPublicationModule",
                module_id: "events",
                included: true,
            })
        )
        expect(
            PagesBrowser.project(pages).publication_modules.find(
                (module) => module.module_id === "events"
            )?.included
        ).toBe(true)
        const settle_layout = async ([
            initial,
            commands,
        ]: LayoutBrowser.UpdateReturn) => {
            let model = initial
            for (const command of commands)
                model = LayoutBrowser.update(
                    model,
                    await Effect.runPromise(
                        command.effect.pipe(Effect.provide(layer))
                    ),
                    Option.none(),
                    []
                )[0]
            return model
        }
        let layout = await settle_layout(
            LayoutBrowser.synchronize(LayoutBrowser.init(url), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(
            LayoutBrowser.project(layout).editor.preview_events.some(
                (row) => row.id === event_id
            )
        ).toBe(true)
        layout = await settle_layout(
            LayoutBrowser.update(
                layout,
                {
                    _tag: "RequestedAddEventsNavigation",
                },
                Option.none(),
                []
            )
        )
        expect(
            LayoutBrowser.configuration(layout)?.navigation.some(
                (item) =>
                    item.target._tag === "module" &&
                    item.target.module_id === "events"
            )
        ).toBe(true)
        const key = `domains/${owner.domain_id}/events/images/${image_id}`
        const reads: string[] = []
        const storage = ReleaseAssetStorage.of({
            read: (requested) => {
                reads.push(requested)
                return requested === key
                    ? Effect.succeed({ bytes: png, content_type: "image/png" })
                    : Effect.fail(
                          new PublishingError({ message: "Unexpected asset" })
                      )
            },
        })
        const release_id = await run(
            build_publication(principal, {
                ...scope,
                idempotency_key: randomUUID(),
            }).pipe(
                Effect.provide(SiteBuildWriterLive),
                Effect.provide(
                    ConfigProvider.layer(
                        ConfigProvider.fromUnknown({
                            VITE_MAPBOX_ACCESS_TOKEN:
                                "pk.test-public-event-map-token",
                        })
                    )
                ),
                Effect.provideService(ReleaseAssetStorage, storage)
            )
        )
        const library = await run(
            Effect.flatMap(PublishingRepository, (repository) =>
                repository.load_library(principal, null)
            )
        )
        const release = library.releases.find((row) => row.id === release_id)
        expect(release?.status).toBe("ready")
        expect(reads).toEqual([key])
        expect(release?.snapshot.events).toHaveLength(1)
        expect(release?.snapshot.events?.[0]?.menu_items).toMatchObject([
            { title: "Public soup", price: 1234 },
        ])
        expect(release?.snapshot.layout?.navigation).toContainEqual({
            label: "Events",
            path: "/events/",
        })
        expect(JSON.stringify(release?.snapshot)).not.toContain("/api/uploads/")
        const html = await readFile(
            new URL(
                `../../../packages/ssg/dist/builds/pg-${release_id}/events/${event_id}/index.html`,
                import.meta.url
            ),
            "utf8"
        )
        expect(html).toContain("Public soup")
        expect(html).toContain("12.34")
        expect(html).toContain("Allergens: Milk")
        expect(html).toContain('src="/assets/published-')
        expect(html).not.toContain("Draft menu")
        expect(html).not.toContain("Unpublished parent menu")
        expect(html).not.toContain("/api/uploads/")
        await mutate("ChangeEvents", {
            ...event,
            _tag: "update_event",
            title: "Changed dinner",
        })
        const stored = await run(
            Effect.flatMap(PublishingRepository, (repository) =>
                repository.load_library(principal, null)
            )
        )
        expect(
            stored.releases.find((row) => row.id === release_id)?.snapshot
                .events?.[0]?.title
        ).toBe("Public dinner")
        await mutate("ChangePublicationConfiguration", {
            _tag: "save_module",
            module_id: "events",
            included: false,
        })
        const excluded = await capture()
        expect(excluded.release.snapshot.events).toEqual([])
        expect(
            excluded.release.snapshot.layout?.navigation.some(
                (item) => item.path === "/events/"
            )
        ).toBe(false)
        await mutate("ChangePublicationConfiguration", {
            _tag: "save_module",
            module_id: "events",
            included: true,
        })
        await pg.query("UPDATE domains SET enabled_modules='{}' WHERE id=$1", [
            owner.domain_id,
        ])
        expect((await capture()).release.snapshot.events).toEqual([])
        await pg.query("UPDATE domains SET enabled_modules=NULL WHERE id=$1", [
            owner.domain_id,
        ])
        await mutate("ChangeSubdomains", {
            _tag: "create",
            id: randomUUID(),
            name: "Dinner site",
            slug: "dinner",
            kind: "prototype",
            status: "draft",
            access: "public",
            expires_at: null,
        })
        await run(
            handlers.FoldkitRemoteMutate({
                requestId: randomUUID(),
                mutation: "ChangePages",
                input: {
                    ...scope,
                    subdomain_slug: "dinner",
                    action: {
                        _tag: "create",
                        id: randomUUID(),
                        title: "Dinner home",
                        content: "Welcome",
                        content_type: "text",
                        slug: null,
                        navigation_label: "Home",
                        show_in_navigation: true,
                        is_homepage: true,
                        publication_state: "published",
                        seo_title: null,
                        seo_description: null,
                        noindex: false,
                        template_source: null,
                    },
                },
            })
        )
        const subdomain_release = await run(
            Effect.flatMap(PublishingRepository, (repository) =>
                repository.capture(principal, "dinner", randomUUID())
            )
        )
        expect(subdomain_release.release.snapshot.events).toEqual([])
        await run(
            handlers.FoldkitRemoteMutate({
                requestId: randomUUID(),
                mutation: "ChangePublicationConfiguration",
                input: {
                    ...scope,
                    subdomain_slug: "dinner",
                    action: {
                        _tag: "save_module",
                        module_id: "events",
                        included: true,
                    },
                },
            })
        )
        expect(
            (
                await run(
                    Effect.flatMap(PublishingRepository, (repository) =>
                        repository.capture(principal, "dinner", randomUUID())
                    )
                )
            ).release.snapshot.events
        ).toHaveLength(1)
        await mutate("ChangeEvents", {
            ...event,
            _tag: "update_event",
            image_url: `/api/uploads/${other.domain_id}/events/${image_id}`,
        })
        await expect(capture()).rejects.toBeDefined()
    }, 60_000)
})

describe("PostgreSQL Issues", () => {
    it("preserves forms, shared tags and atomic board moves through account Remote", async () => {
        const owner = await seed("issues-owner")
        const other = await seed("issues-other")
        const session = await login("issues-owner")
        const tag_id = randomUUID()
        const foreign_tag_id = randomUUID()
        await pg.query(
            "INSERT INTO tags (id,domain_id,name,color,kind,created_at,updated_at) VALUES ($1,$2,'Bug','red','custom',1,1),($3,$4,'Foreign','blue','custom',1,1)",
            [tag_id, owner.domain_id, foreign_tag_id, other.domain_id]
        )
        let reject_write = false
        const save_requests: string[] = []
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                save_requests.push(new URL(request.url).pathname)
                if (
                    reject_write &&
                    new URL(request.url).pathname.startsWith("/api/rpc")
                )
                    return Promise.resolve(
                        new Response("Unavailable", { status: 503 })
                    )
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const settle = async ([
            initial,
            commands,
        ]: IssuesBrowser.UpdateReturn) => {
            let model = initial
            const mutation_requests: string[][] = []
            for (const command of commands) {
                if (command.name !== "LoadIssueCatalog") continue
                const request_start = save_requests.length
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                if (message._tag === "IssueCatalogSaved")
                    mutation_requests.push(
                        save_requests
                            .slice(request_start)
                            .filter((path) => !path.startsWith("/api/uploads"))
                    )

                model = IssuesBrowser.update(model, message)[0]
            }
            for (const paths of mutation_requests)
                expect(paths).toEqual(["/api/rpc/"])
            return model
        }
        const url = Url.make({
            protocol: "https:",
            host: "urm.test",
            port: Option.none(),
            pathname: "/issues",
            search: Option.none(),
            hash: Option.none(),
        })
        let model = await settle(
            IssuesBrowser.synchronize(IssuesBrowser.init(url), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: true,
            })
        )
        expect(
            IssuesBrowser.project(model).availableTags.map((tag) => tag.id)
        ).toEqual([tag_id])
        model = IssuesBrowser.update(model, {
            _tag: "NewTitleChanged",
            value: "First issue",
        })[0]
        model = IssuesBrowser.update(model, {
            _tag: "NewContentChanged",
            value: "Detailed body",
        })[0]
        model = IssuesBrowser.update(model, {
            _tag: "NewLabelsChanged",
            value: "Bug",
        })[0]
        model = await settle(
            IssuesBrowser.update(model, { _tag: "CreatedIssueSubmitted" })
        )
        const first = IssuesBrowser.project(model).issues[0]
        expect(first).toMatchObject({
            title: "First issue",
            content: "Detailed body",
            labels: JSON.stringify([tag_id]),
            status: "open",
        })
        if (!first) throw new Error(model.ui.announcement)
        expect(model.ui.newTitle).toBe("")
        model = IssuesBrowser.update(model, {
            _tag: "NewTitleChanged",
            value: "Second issue",
        })[0]
        model = await settle(
            IssuesBrowser.update(model, { _tag: "CreatedIssueSubmitted" })
        )
        model = await settle(
            IssuesBrowser.update(model, {
                _tag: "MoveIssueForward",
                issueId: first.id,
            })
        )
        expect(
            IssuesBrowser.project(model).issues.find(
                (issue) => issue.id === first.id
            )?.status
        ).toBe("in_progress")
        model = IssuesBrowser.changed_url(
            model,
            url,
            `/issues/${first.id}`,
            Option.none()
        )[0]
        model = IssuesBrowser.update(model, { _tag: "StartedIssueEditing" })[0]
        model = IssuesBrowser.update(model, {
            _tag: "EditingContentChanged",
            value: "Updated body",
        })[0]
        model = IssuesBrowser.update(model, {
            _tag: "EditingLabelsChanged",
            value: "",
        })[0]
        model = await settle(
            IssuesBrowser.update(model, { _tag: "SavedIssueSubmitted" })
        )
        expect(
            IssuesBrowser.project(model).issues.find(
                (issue) => issue.id === first.id
            )
        ).toMatchObject({ content: "Updated body", labels: "[]" })
        expect(model.ui.issue_detail_mode).toBe("preview")
        expect(
            (
                await pg.query("SELECT * FROM entity_tags WHERE entity_id=$1", [
                    first.id,
                ])
            ).rows
        ).toHaveLength(0)
        const before_failure = IssuesBrowser.project(model).issues
        const denied = await settle(
            IssuesBrowser.update(
                { ...model, account_id: other.account_id },
                { _tag: "MoveIssueForward", issueId: first.id }
            )
        )
        expect(denied.pending).toBe(false)
        expect(IssuesBrowser.project(denied).issues).toEqual(before_failure)
        expect(denied.ui.announcement).not.toBe("")
        reject_write = true
        const failed = await settle(
            IssuesBrowser.update(model, {
                _tag: "MoveIssueForward",
                issueId: first.id,
            })
        )
        reject_write = false
        expect(failed.pending).toBe(false)
        expect(IssuesBrowser.project(failed).issues).toEqual(before_failure)
        expect(failed.ui.announcement).not.toBe("")
        const write = (
            actions: ReadonlyArray<IssueAction>,
            domain_id = owner.domain_id
        ) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    return yield* Remote.mutate(
                        ChangeIssues,
                        { domain_id, actions },
                        randomUUID()
                    ).pipe(Effect.provide(api.remote(domain_id)), Effect.exit)
                }).pipe(Effect.provide(layer))
            )
        const fields = {
            title: "Atomic",
            description: null,
            content: null,
            status: "open",
            priority: null,
            assignee_id: null,
            order_position: 0,
            tag_ids: [tag_id],
        }
        const valid = Schema.decodeUnknownSync(IssueAction)({
            _tag: "update",
            id: first.id,
            ...fields,
        })
        expect(
            (await write([valid, { ...valid, id: randomUUID() }]))._tag
        ).toBe("Failure")
        expect(
            (await pg.query("SELECT title FROM issues WHERE id=$1", [first.id]))
                .rows
        ).toEqual([{ title: "First issue" }])
        expect(
            (
                await write([
                    Schema.decodeUnknownSync(IssueAction)({
                        ...valid,
                        tag_ids: [foreign_tag_id],
                    }),
                ])
            )._tag
        ).toBe("Failure")
        expect((await write([valid], other.domain_id))._tag).toBe("Failure")
        expect((await write([valid]))._tag).toBe("Success")
        const stale = {
            _tag: "IssueCatalogLoaded",
            epoch: model.epoch,
            remote: model.remote,
        }
        const cleared = IssuesBrowser.clear(model)
        expect(
            IssuesBrowser.update(
                cleared,
                Schema.decodeUnknownSync(IssuesBrowser.Message)(stale)
            )[0]
        ).toEqual(cleared)
        const read_only = { ...model, can_write: false }
        expect(
            IssuesBrowser.update(read_only, {
                _tag: "MoveIssueForward",
                issueId: first.id,
            })[1]
        ).toHaveLength(0)
        model = await settle(
            IssuesBrowser.update(model, IssuesBrowser.Refreshed())
        )
        model = IssuesBrowser.update(model, {
            _tag: "RequestedIssueDelete",
            issueId: first.id,
        })[0]
        model = await settle(
            IssuesBrowser.update(model, { _tag: "ConfirmedIssueDelete" })
        )
        expect(
            IssuesBrowser.project(model).issues.some(
                (issue) => issue.id === first.id
            )
        ).toBe(false)
        expect(
            (
                await pg.query("SELECT * FROM entity_tags WHERE entity_id=$1", [
                    first.id,
                ])
            ).rows
        ).toHaveLength(0)
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (
                await write([
                    Schema.decodeUnknownSync(IssueAction)({
                        ...valid,
                        _tag: "create",
                        id: randomUUID(),
                    }),
                ])
            )._tag
        ).toBe("Failure")
        await pg.query("UPDATE domains SET enabled_modules='{}' WHERE id=$1", [
            owner.domain_id,
        ])
        const disabled = await settle(
            IssuesBrowser.synchronize(IssuesBrowser.init(url), {
                account_id: owner.account_id,
                domain_id: owner.domain_id,
                can_write: false,
            })
        )
        expect(disabled.ui.announcement).toContain("could not be confirmed")
        expect(IssuesBrowser.project(disabled).issues).toEqual([])
    }, 30000)
})

describe("PostgreSQL Projects and Tasks", () => {
    it("preserves project slugs, task forms, tags, bulk actions and scoped atomic deletion", async () => {
        const owner = await seed("projects-owner")
        const other = await seed("projects-other")
        const session = await login("projects-owner")
        const tag_id = randomUUID()
        const foreign_tag = randomUUID()
        await pg.query(
            "INSERT INTO tags (id,domain_id,name,color,kind,created_at,updated_at) VALUES ($1,$2,'Assigned','red','person',1,1),($3,$4,'Other','blue','custom',1,1)",
            [tag_id, owner.domain_id, foreign_tag, other.domain_id]
        )
        const requests: string[] = []
        let fail_next_write = false
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                requests.push(new URL(request.url).pathname)
                if (
                    fail_next_write &&
                    new URL(request.url).pathname.startsWith("/api/rpc")
                ) {
                    fail_next_write = false
                    return Promise.resolve(
                        new Response("Unavailable", { status: 503 })
                    )
                }
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const settle = async ([
            initial,
            commands,
        ]: ProjectsBrowser.UpdateReturn) => {
            let model = initial
            for (const command of commands) {
                if (
                    command.name !== "LoadProjectCatalog" &&
                    command.name !== "SaveProjectCatalog"
                )
                    continue
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                model = ProjectsBrowser.update(model, message)[0]
            }
            return model
        }
        let model = await settle(
            ProjectsBrowser.synchronize(
                ProjectsBrowser.init({ _tag: "Projects" }),
                {
                    account_id: owner.account_id,
                    domain_id: owner.domain_id,
                    can_write: true,
                }
            )
        )
        const send = (message: ProjectsBrowser.Message) => {
            model = ProjectsBrowser.update(model, message)[0]
        }
        const save = async (message: ProjectsBrowser.Message) => {
            model = await settle(ProjectsBrowser.update(model, message))
        }
        send({ _tag: "ChangedNewProjectName", value: "Café plan" })
        await save({ _tag: "SubmittedNewProject", status: "active" })
        const first = ProjectsBrowser.library(model)?.projects[0]
        expect(first).toMatchObject({
            name: "Café plan",
            slug: "cafe-plan",
            status: "active",
        })
        if (!first) throw new Error("Project was not saved")
        expect(model.ui.new_project_name).toBe("")
        send({ _tag: "ChangedNewProjectName", value: "Café plan" })
        await save({ _tag: "SubmittedNewProject", status: "backlog" })
        expect(
            ProjectsBrowser.library(model)
                ?.projects.map((row) => row.slug)
                .sort()
        ).toEqual(["cafe-plan", "cafe-plan-2"])
        model = ProjectsBrowser.changed_route(model, {
            _tag: "Project",
            project_slug: first.slug,
        })
        send({ _tag: "ClickedEditProject", project_id: first.id })
        send({ _tag: "ChangedProjectName", value: "Renamed" })
        await save({ _tag: "SubmittedProjectName" })
        expect(
            ProjectsBrowser.library(model)?.projects.find(
                (row) => row.id === first.id
            )
        ).toMatchObject({ name: "Renamed", slug: first.slug })
        expect(Option.isNone(model.ui.editing_project)).toBe(true)
        await save({
            _tag: "ChangedEntityTags",
            entity_type: "project",
            entity_id: first.id,
            tag_ids: [tag_id],
        })
        send({ _tag: "ChangedNewTaskTitle", value: "  First task  " })
        await save({ _tag: "SubmittedNewTask" })
        send({ _tag: "ChangedNewTaskTitle", value: "Second task" })
        await save({ _tag: "SubmittedNewTask" })
        const tasks = ProjectsBrowser.project(model).tasks
        expect(tasks.map((task) => task.title)).toEqual([
            "First task",
            "Second task",
        ])
        const task = tasks[0]
        if (!task) throw new Error("Task was not saved")
        send({ _tag: "ClickedEditTask", task_id: task.id })
        send({ _tag: "ChangedEditingTaskTitle", value: "Edited task" })
        await save({ _tag: "SubmittedEditingTask" })
        expect(ProjectsBrowser.project(model).tasks[0]?.title).toBe(
            "Edited task"
        )
        expect(Option.isNone(model.ui.editing_task)).toBe(true)
        await save({
            _tag: "ChangedEntityTags",
            entity_type: "task",
            entity_id: task.id,
            tag_ids: [tag_id],
        })
        expect(ProjectsBrowser.library(model)?.entity_tags).toHaveLength(2)
        const before_requests = requests.length
        const toggled = ProjectsBrowser.update(model, {
            _tag: "ClickedSetTaskStatus",
            task_id: task.id,
            status: "done",
        })
        expect(
            ProjectsBrowser.project(toggled[0]).tasks.map((row) => row.status)
        ).toEqual(["done", "active"])
        expect(ProjectsBrowser.project(toggled[0])).toBe(
            ProjectsBrowser.project(toggled[0])
        )
        model = await settle(toggled)
        expect(requests.slice(before_requests)).toEqual(["/api/rpc/"])
        expect(
            ProjectsBrowser.project(model).tasks.map((row) => row.status)
        ).toEqual(["done", "active"])
        fail_next_write = true
        const failed_toggle = ProjectsBrowser.update(model, {
            _tag: "ClickedSetTaskStatus",
            task_id: task.id,
            status: "active",
        })
        expect(ProjectsBrowser.project(failed_toggle[0]).tasks[0]?.status).toBe(
            "active"
        )
        model = await settle(failed_toggle)
        expect(ProjectsBrowser.project(model).tasks[0]?.status).toBe("done")
        expect(Option.isSome(model.ui.maybe_error)).toBe(true)
        await save({ _tag: "ClickedClearCompletedTasks" })
        expect(ProjectsBrowser.project(model).tasks).toHaveLength(1)
        expect(ProjectsBrowser.library(model)?.entity_tags).toHaveLength(1)
        await save({ _tag: "ClickedToggleAllTasks" })
        expect(ProjectsBrowser.project(model).tasks[0]?.status).toBe("done")
        await save({ _tag: "ClickedToggleAllTasks" })
        expect(ProjectsBrowser.project(model).tasks[0]?.status).toBe("active")
        await save({
            _tag: "ClickedSetProjectStatus",
            project_id: first.id,
            status: "done",
        })
        expect(
            ProjectsBrowser.library(model)?.projects.find(
                (row) => row.id === first.id
            )?.status
        ).toBe("done")
        const write = (
            action: ProjectAction,
            domain_id = owner.domain_id,
            account_id = owner.account_id
        ) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    return yield* Remote.mutate(
                        ChangeProjects,
                        { domain_id, account_id, action },
                        randomUUID()
                    ).pipe(Effect.provide(api.remote(domain_id)), Effect.exit)
                }).pipe(Effect.provide(layer))
            )
        expect(
            (
                await write(
                    {
                        _tag: "RenameProject",
                        project_id: first.id,
                        name: "Wrong account",
                    },
                    owner.domain_id,
                    other.account_id
                )
            )._tag
        ).toBe("Failure")
        expect(
            (
                await write({
                    _tag: "SetEntityTags",
                    entity_type: "project",
                    entity_id: first.id,
                    tag_ids: [foreign_tag],
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await write(
                    {
                        _tag: "RenameProject",
                        project_id: first.id,
                        name: "Foreign",
                    },
                    other.domain_id
                )
            )._tag
        ).toBe("Failure")
        expect(
            (
                await write({
                    _tag: "ReorderProjects",
                    positions: [
                        { project_id: first.id, status: "backlog", order: 99 },
                        {
                            project_id: randomUUID(),
                            status: "active",
                            order: 0,
                        },
                    ],
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await pg.query("SELECT status FROM projects WHERE id=$1", [
                    first.id,
                ])
            ).rows
        ).toEqual([{ status: "done" }])
        const second = ProjectsBrowser.library(model)?.projects.find(
            (row) => row.id !== first.id
        )
        const remaining = ProjectsBrowser.project(model).tasks[0]
        if (!second || !remaining) throw new Error("Missing project/task")
        expect(
            (
                await write({
                    _tag: "ReorderTasks",
                    project_id: second.id,
                    positions: [{ task_id: remaining.id, order: 90 }],
                })
            )._tag
        ).toBe("Failure")
        expect(
            (
                await write({
                    _tag: "ReorderTasks",
                    project_id: first.id,
                    positions: [{ task_id: remaining.id, order: 2 }],
                })
            )._tag
        ).toBe("Success")
        const readonly = { ...model, can_write: false }
        expect(
            ProjectsBrowser.update(readonly, {
                _tag: "ClickedSetTaskStatus",
                task_id: remaining.id,
                status: "done",
            })[1]
        ).toHaveLength(0)
        expect(
            ProjectsBrowser.update(ProjectsBrowser.clear(model), {
                _tag: "ProjectCatalogLoaded",
                epoch: model.epoch,
                remote: model.remote,
            })[0].domain_id
        ).toBe("")
        await save({
            _tag: "ChangedEntityTags",
            entity_type: "task",
            entity_id: remaining.id,
            tag_ids: [tag_id],
        })
        send({ _tag: "ClickedDeleteProject", project_id: first.id })
        await save({ _tag: "ConfirmedDeleteProject" })
        expect(ProjectsBrowser.library(model)?.projects).toHaveLength(1)
        expect(
            (
                await pg.query("SELECT id FROM tasks WHERE project_id=$1", [
                    first.id,
                ])
            ).rows
        ).toHaveLength(0)
        expect(
            (
                await pg.query(
                    "SELECT id FROM entity_tags WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows
        ).toHaveLength(0)
        await expect(
            pg.query(
                "INSERT INTO tasks (id,domain_id,project_id,title,status,\"order\",created_at,updated_at) VALUES ($1,$2,$3,'bad','active',0,1,1)",
                [randomUUID(), other.domain_id, second.id]
            )
        ).rejects.toThrow(/foreign key/)
        await pg.query(
            "UPDATE organization_members SET role='member' WHERE user_id=$1",
            [owner.account_id]
        )
        expect(
            (
                await write({
                    _tag: "CreateTask",
                    id: randomUUID(),
                    project_id: second.id,
                    title: "Denied",
                })
            )._tag
        ).toBe("Failure")
        await pg.query("UPDATE domains SET enabled_modules='{}' WHERE id=$1", [
            owner.domain_id,
        ])
        const disabled = await settle(
            ProjectsBrowser.synchronize(
                ProjectsBrowser.init({ _tag: "Projects" }),
                {
                    account_id: owner.account_id,
                    domain_id: owner.domain_id,
                    can_write: false,
                }
            )
        )
        expect(Option.isSome(disabled.ui.maybe_error)).toBe(true)
        expect(ProjectsBrowser.library(disabled)).toBeNull()
    }, 30000)
})

describe("PostgreSQL admin chat", () => {
    it("preserves administrator-only messaging, mentions and idempotent sends through account Remote", async () => {
        const owner = await seed("chat-owner")
        const other = await seed("chat-other")
        const session = await login("chat-owner")
        const organization_id = (
            await pg.query<{ organization_id: string }>(
                "SELECT organization_id FROM domains WHERE id=$1",
                [owner.domain_id]
            )
        ).rows[0]?.organization_id
        if (organization_id === undefined)
            throw new Error("missing owner organization")
        const colleague_id = randomUUID()
        await pg.query(
            "INSERT INTO users (id,name,email,created_at,updated_at) VALUES ($1,'Grace Admin','grace@example.com',1,1)",
            [colleague_id]
        )
        await pg.query(
            "INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at) VALUES ($1,$2,$3,'admin','active',1,1)",
            [randomUUID(), organization_id, colleague_id]
        )
        const requests: string[] = []
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                requests.push(new URL(request.url).pathname)
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const settle = async ([
            initial,
            commands,
        ]: ChatBrowser.UpdateReturn) => {
            let model = initial
            let pending = [...commands]
            while (pending.length > 0) {
                const [command, ...rest] = pending
                if (command === undefined) break
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                const [next, issued] = ChatBrowser.update(model, message)
                model = next
                pending = [...rest, ...issued]
            }
            return model
        }
        const scope = {
            account_id: owner.account_id,
            domain_id: owner.domain_id,
            can_write: true,
        }

        let model = await settle(
            ChatBrowser.update(
                ChatBrowser.synchronize(ChatBrowser.init(), scope),
                ChatBrowser.Refreshed()
            )
        )
        expect(model.loaded).toBe(true)
        expect(requests).toEqual(["/api/rpc/"])
        expect(
            ChatBrowser.project(model).admins.map((admin) => admin.name)
        ).toEqual(["Grace Admin"])
        expect(ChatBrowser.project(model).messages).toEqual([])
        expect(ChatBrowser.project(model).can_send).toBe(true)

        model = ChatBrowser.update(
            model,
            ChatUi.ChangedChatDraft({ value: "  Please review this  " })
        )[0]
        model = ChatBrowser.update(model, ChatUi.ClickedTagUrmbot())[0]
        model = ChatBrowser.update(
            model,
            ChatUi.ChangedAdminMentionSelection({ value: colleague_id })
        )[0]
        model = await settle(
            ChatBrowser.update(model, ChatUi.SubmittedChatMessage())
        )

        const sent = ChatBrowser.project(model).messages
        expect(sent).toHaveLength(1)
        expect(sent[0]).toMatchObject({
            author_kind: "admin",
            author_user_id: owner.account_id,
            body: "Please review this @urmbot @Grace Admin",
            mentions: ["urmbot"],
            mentioned_user_ids: [colleague_id],
        })
        expect(model.ui.draft).toBe("")
        expect(model.ui.sending).toBe(false)

        const stored = await pg.query<{ id: string; domain_id: string }>(
            "SELECT id,domain_id FROM chat_messages"
        )
        expect(stored.rows).toHaveLength(1)
        const message_id = stored.rows[0]?.id
        if (message_id === undefined) throw new Error("missing chat message")
        const mention_tags = await pg.query<{ tag_id: string }>(
            "SELECT tag_id FROM entity_tags WHERE entity_type='chat_message' AND entity_id=$1",
            [message_id]
        )
        expect(mention_tags.rows).toHaveLength(1)
        expect(
            (
                await pg.query<{ name: string; kind: string }>(
                    "SELECT name,kind FROM tags WHERE id=$1",
                    [mention_tags.rows[0]?.tag_id]
                )
            ).rows[0]
        ).toMatchObject({ name: "@Grace Admin", kind: "person" })

        const replayed = await settle(
            ChatBrowser.update(
                { ...model, ui: { ...model.ui, sending: true } },
                {
                    _tag: "ChatSendPrepared",
                    epoch: model.epoch,
                    generation: model.generation,
                    message: {
                        id: message_id,
                        body: "Please review this @urmbot @Grace Admin",
                        mentioned_user_ids: [colleague_id],
                    },
                }
            )
        )
        expect(Option.getOrNull(replayed.ui.maybe_error)).toBeNull()
        expect(ChatBrowser.project(replayed).messages).toHaveLength(1)
        expect(
            (await pg.query("SELECT id FROM chat_messages")).rows
        ).toHaveLength(1)
        expect(
            (
                await pg.query(
                    "SELECT id FROM entity_tags WHERE entity_type='chat_message'"
                )
            ).rows
        ).toHaveLength(1)

        const foreign = await settle(
            ChatBrowser.update(
                ChatBrowser.synchronize(ChatBrowser.init(), {
                    account_id: other.account_id,
                    domain_id: other.domain_id,
                    can_write: true,
                }),
                ChatBrowser.Refreshed()
            )
        )
        expect(ChatBrowser.project(foreign).messages).toEqual([])

        const denied = await settle([
            { ...model, account_id: other.account_id },
            [],
        ] as ChatBrowser.UpdateReturn)
        const [drafted] = ChatBrowser.update(
            denied,
            ChatUi.ChangedChatDraft({ value: "Cross account" })
        )
        const rejected = await settle(
            ChatBrowser.update(drafted, ChatUi.SubmittedChatMessage())
        )
        expect(rejected.ui.sending).toBe(false)
        expect(Option.isSome(rejected.ui.maybe_error)).toBe(true)
        expect(
            (await pg.query("SELECT id FROM chat_messages")).rows
        ).toHaveLength(1)
    }, 30000)
})

describe("PostgreSQL mail subscriptions", () => {
    it("lists, changes and isolates subscribers through account Remote", async () => {
        const owner = await seed("subs-owner")
        const other = await seed("subs-other")
        const session = await login("subs-owner")
        const contact_id = randomUUID()
        const foreign_contact_id = randomUUID()
        const now = Date.now()
        await pg.query(
            "INSERT INTO contacts (id,name,created_at,updated_at) VALUES ($1,'Ada Reader',$3,$3),($2,'Foreign Reader',$3,$3)",
            [contact_id, foreign_contact_id, now]
        )
        await pg.query(
            "INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES ($1,$2,'ada@example.com',true,$4,$4),($3,$5,'foreign@example.com',true,$4,$4)",
            [randomUUID(), contact_id, randomUUID(), now, foreign_contact_id]
        )
        await pg.query(
            "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',$6,$6),($4,$5,$7,'active',$6,$6)",
            [
                randomUUID(),
                owner.domain_id,
                contact_id,
                randomUUID(),
                other.domain_id,
                now,
                foreign_contact_id,
            ]
        )
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const settle = async ([
            initial,
            commands,
        ]: MailBrowser.UpdateReturn) => {
            let model = initial
            let pending = [...commands]
            while (pending.length > 0) {
                const [command, ...rest] = pending
                if (command === undefined) break
                // Only the PostgreSQL subscription commands are exercised here;
                // the adapter's remaining legacy commands need no transport.
                if (
                    command.name !== "LoadMailSubscriptions" &&
                    command.name !== "SetMailSubscriptionStatus"
                ) {
                    pending = rest
                    continue
                }
                const message = await Effect.runPromise(
                    command.effect.pipe(Effect.provide(layer))
                )
                const [next, issued] = MailBrowser.update(
                    model,
                    message,
                    owner.domain_id
                )
                model = next
                pending = [...rest, ...issued]
            }
            return model
        }
        const url = Url.make({
            protocol: "https:",
            host: "urm.test",
            port: Option.none(),
            pathname: "/mail/subscriptions",
            search: Option.none(),
            hash: Option.none(),
        })
        // The adapter's own contacts.domain_id stays the legacy domain id, as it
        // is in the browser; the PostgreSQL workspace arrives separately.
        const scoped = MailBrowser.init("/mail/subscriptions")
        const enter = (model: MailBrowser.Model) =>
            MailBrowser.changed_url(
                model,
                url,
                "/mail/subscriptions",
                owner.domain_id
            )

        // Without the account session's workspace the adapter issues nothing,
        // so the legacy domain id in contacts.domain_id cannot reach a
        // PostgreSQL handler.
        expect(
            MailBrowser.changed_url(scoped, url, "/mail/subscriptions")[1]
        ).toEqual([])

        // An empty list loads without inventing rows.
        let model = await settle(enter(scoped))
        expect(model.subscriptions.loading).toBe(false)
        expect(model.subscriptions.subscriptions).toEqual([])
        expect(model.subscriptions.error).toBe(null)

        model = MailBrowser.update(
            model,
            Mail.GotSubscriptionsMessage({
                message: Subscriptions.SelectedSubscriptionContactChanged({
                    value: contact_id,
                }),
            }),
            owner.domain_id
        )[0]
        model = await settle(
            MailBrowser.update(
                model,
                Mail.GotSubscriptionsMessage({
                    message: Subscriptions.SubmittedSubscriptionContact(),
                }),
                owner.domain_id
            )
        )

        expect(
            model.subscriptions.subscriptions.map((subscription) => [
                subscription.contact_id,
                subscription.email,
                subscription.status,
            ])
        ).toEqual([[contact_id, "ada@example.com", "subscribed"]])
        expect(
            (
                await pg.query(
                    "SELECT status, source FROM email_subscriptions WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "subscribed", source: "admin" })

        model = await settle(
            MailBrowser.update(
                model,
                Mail.GotSubscriptionsMessage({
                    message: Subscriptions.SubscriptionStatusChanged({
                        contact_id,
                        status: "unsubscribed",
                    }),
                }),
                owner.domain_id
            )
        )
        expect(model.subscriptions.subscriptions[0]?.status).toBe(
            "unsubscribed"
        )

        // Delivery owns suppression; an administrator may not revive it.
        await pg.query(
            "UPDATE email_subscriptions SET status='suppressed' WHERE domain_id=$1",
            [owner.domain_id]
        )
        const suppressed = await settle(
            MailBrowser.update(
                model,
                Mail.GotSubscriptionsMessage({
                    message: Subscriptions.SubscriptionStatusChanged({
                        contact_id,
                        status: "subscribed",
                    }),
                }),
                owner.domain_id
            )
        )
        expect(suppressed.subscriptions.error).not.toBe(null)
        expect(
            (
                await pg.query(
                    "SELECT status FROM email_subscriptions WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows[0]
        ).toMatchObject({ status: "suppressed" })

        // Another workspace's subscriber never appears in this catalog.
        await pg.query(
            "INSERT INTO email_subscriptions (id,domain_id,contact_id,list_key,status,source,created_at,updated_at) VALUES ($1,$2,$3,'newsletter','subscribed','admin',$4,$4)",
            [randomUUID(), other.domain_id, foreign_contact_id, now]
        )
        const reloaded = await settle(enter(suppressed))
        expect(
            reloaded.subscriptions.subscriptions.map(
                (subscription) => subscription.contact_id
            )
        ).toEqual([contact_id])

        // Module gating: an explicit list that omits Mail refuses the read, and
        // one that includes it still serves. Provisioning leaves the column
        // NULL, so without these two cases gating is never exercised.
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Media']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const gated = await settle(enter(reloaded))
        expect(gated.subscriptions.error).not.toBe(null)

        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Mail']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        const ungated = await settle(enter(gated))
        expect(ungated.subscriptions.error).toBe(null)
        expect(
            ungated.subscriptions.subscriptions.map(
                (subscription) => subscription.contact_id
            )
        ).toEqual([contact_id])
    }, 30000)
})

const TemplateCache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const TemplateData = Remote.make({
    model: TemplateCache.model.remote,
    entities: [NewsletterTemplateCatalog],
})

describe("PostgreSQL newsletter templates", () => {
    it("saves, revises and scopes organization templates through account Remote", async () => {
        const owner = await seed("tpl-owner")
        const other = await seed("tpl-other")
        const session = await login("tpl-owner")
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const read_catalog = (domain_id: string) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    const query = TemplateData.get(
                        NewsletterTemplateSummary,
                        newsletter_template_catalog_id(domain_id)
                    )
                    const result = yield* TemplateData.prefetch(
                        { remote: Remote.initial },
                        query
                    ).pipe(Effect.provide(api.remote(domain_id)))
                    return query.read(result)
                }).pipe(Effect.provide(layer))
            )
        const save = (
            domain_id: string,
            template: SaveNewsletterTemplateType
        ) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    return yield* Remote.mutate(
                        SaveNewsletterTemplate,
                        { domain_id, template },
                        `${domain_id}/${template.id}/${template.expected_revision}`
                    ).pipe(Effect.provide(api.remote(domain_id)))
                }).pipe(Effect.provide(layer))
            )
        const draft = {
            id: randomUUID(),
            expected_revision: 0,
            name: "Launch announcement",
            description: "Opening copy for a launch",
            tags: ["launch"],
            subject: "We have launched",
            headline: "It is live",
            body_text: "The long awaited release is out.",
            cta_url: "https://urm.test/launch",
            cta_label: "Read more",
        }

        const empty = await read_catalog(owner.domain_id)
        expect(empty._tag).toBe("Ready")
        expect(
            empty._tag === "Ready" ? empty.value?.templates : undefined
        ).toEqual([])

        const created = await save(owner.domain_id, draft)
        expect(created.output.templates).toHaveLength(1)
        expect(created.output.templates[0]).toMatchObject({
            id: draft.id,
            name: "Launch announcement",
            tags: ["launch"],
            subject: "We have launched",
            revision: 1,
        })

        // A stale expected revision is refused rather than overwriting.
        await expect(
            save(owner.domain_id, {
                ...draft,
                expected_revision: 0,
                name: "Clobbered",
            })
        ).rejects.toThrow()
        const revised = await save(owner.domain_id, {
            ...draft,
            expected_revision: 1,
            name: "Launch announcement v2",
        })
        expect(revised.output.templates[0]).toMatchObject({
            name: "Launch announcement v2",
            revision: 2,
        })

        // Another organization neither reads nor revises this template: the
        // account is not a member there at all, so the read is refused rather
        // than returning an empty catalog.
        await expect(read_catalog(other.domain_id)).rejects.toThrow()
        await expect(
            save(other.domain_id, { ...draft, expected_revision: 2 })
        ).rejects.toThrow()
        expect(
            (
                await pg.query(
                    "SELECT name FROM email_newsletter_templates WHERE id=$1",
                    [draft.id]
                )
            ).rows[0]
        ).toMatchObject({ name: "Launch announcement v2" })

        // Module gating applies to templates as it does to subscribers.
        await pg.query(
            "UPDATE domains SET enabled_modules=ARRAY['Media']::module_id[] WHERE id=$1",
            [owner.domain_id]
        )
        await expect(read_catalog(owner.domain_id)).rejects.toThrow()
    }, 30000)
})

const NewsletterCache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const NewsletterData = Remote.make({
    model: NewsletterCache.model.remote,
    entities: [NewsletterCatalog],
})

describe("PostgreSQL newsletter drafts and delivery", () => {
    it("sends tests only to the chosen recipient and never retries them as subscriber sends", async () => {
        const owner = await seed("newsletter-test")
        const session = await login("newsletter-test")
        const principal = {
            ...(await run(authenticate_token(session.token))),
            domain_id: owner.domain_id,
        }
        const handlers = api_handlers(principal)
        const now = Date.now()
        const contact_id = randomUUID()
        await pg.query(
            "INSERT INTO contacts (id,name,created_at,updated_at) VALUES ($1,'Subscriber',$2,$2)",
            [contact_id, now]
        )
        await pg.query(
            "INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES ($1,$2,'subscriber@example.test',true,$3,$3)",
            [randomUUID(), contact_id, now]
        )
        await pg.query(
            "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        await pg.query(
            "INSERT INTO email_subscriptions (id,domain_id,contact_id,list_key,status,created_at,updated_at) VALUES ($1,$2,$3,'newsletter','subscribed',$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        await pg.query(
            "INSERT INTO domain_email_streams (id,domain_id,kind,provider,sending_label,status,created_at,updated_at) VALUES ($1,$2,'bulk','cloudflare','newsletter','verified',$3,$3)",
            [randomUUID(), owner.domain_id, now]
        )
        const draft_id = randomUUID()
        await run(
            handlers.FoldkitRemoteMutate({
                requestId: "test-draft",
                mutation: "SaveNewsletterDraft",
                input: {
                    domain_id: owner.domain_id,
                    draft: {
                        id: draft_id,
                        name: "Test draft",
                        subject: "Test only",
                        headline: "Preview",
                        body_text: "Unpublished draft",
                        cta_url: null,
                        cta_label: null,
                        list_key: "newsletter",
                        template_source: null,
                        expected_updated_at: 0,
                    },
                },
            })
        )
        const input = {
            domain_id: owner.domain_id,
            send: {
                draft_id,
                request_id: "test-only",
                audience: "test",
                test_email: "preview@example.test",
                test_name: "Preview recipient",
            },
        }
        const before = sent_emails.length
        await run(
            handlers.FoldkitRemoteMutate({
                requestId: "test-send",
                mutation: "SendNewsletter",
                input,
            })
        )
        expect(
            sent_emails.slice(before).map((message) => message.addresses)
        ).toEqual([["preview@example.test"]])
        expect(
            (
                await pg.query(
                    "SELECT audience,approved_contact_count,status FROM email_newsletter_sends WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows
        ).toEqual([
            {
                audience: "test",
                approved_contact_count: 1,
                status: "completed",
            },
        ])
        expect(
            (
                await pg.query(
                    "SELECT contact_id,is_test FROM email_deliveries WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows
        ).toEqual([{ contact_id: null, is_test: true }])
        expect(
            (
                await pg.query(
                    "SELECT id FROM email_unsubscribe_tokens WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows
        ).toEqual([])
        await run(
            handlers.FoldkitRemoteMutate({
                requestId: "repeat-test",
                mutation: "SendNewsletter",
                input,
            })
        )
        expect(sent_emails.length).toBe(before + 1)
        await expect(
            run(
                handlers.FoldkitRemoteMutate({
                    requestId: "missing-test-recipient",
                    mutation: "SendNewsletter",
                    input: {
                        ...input,
                        send: {
                            ...input.send,
                            request_id: "invalid-test",
                            test_email: null,
                        },
                    },
                })
            )
        ).rejects.toThrow()
        expect(sent_emails.length).toBe(before + 1)
    })
    it("drafts, sends to the PostgreSQL subscriber list and records the ledger", async () => {
        const owner = await seed("news-owner")
        const session = await login("news-owner")
        const now = Date.now()
        const contact_id = randomUUID()
        await pg.query(
            "INSERT INTO contacts (id,name,created_at,updated_at) VALUES ($1,'Ada Reader',$2,$2)",
            [contact_id, now]
        )
        await pg.query(
            "INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES ($1,$2,'ada@example.com',true,$3,$3)",
            [randomUUID(), contact_id, now]
        )
        await pg.query(
            "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        await pg.query(
            "INSERT INTO email_subscriptions (id,domain_id,contact_id,list_key,status,source,created_at,updated_at,subscribed_at) VALUES ($1,$2,$3,'newsletter','subscribed','admin',$4,$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        await pg.query(
            "INSERT INTO domain_email_streams (id,domain_id,kind,provider,sending_label,status,created_at,updated_at) VALUES ($1,$2,'bulk','cloudflare','newsletter','verified',$3,$3)",
            [randomUUID(), owner.domain_id, now]
        )
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const read_catalog = () =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    const query = NewsletterData.get(
                        NewsletterSummary,
                        newsletter_catalog_id(owner.domain_id, "newsletter")
                    )
                    const result = yield* NewsletterData.prefetch(
                        { remote: Remote.initial },
                        query
                    ).pipe(Effect.provide(api.remote(owner.domain_id)))
                    return query.read(result)
                }).pipe(Effect.provide(layer))
            )
        const mutate = <I, O>(
            mutation: { readonly name: string },
            input: I,
            request_id: string
        ) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    return yield* Remote.mutate(
                        mutation as never,
                        input as never,
                        request_id
                    ).pipe(Effect.provide(api.remote(owner.domain_id)))
                }).pipe(Effect.provide(layer))
            ) as Promise<{ output: O }>

        const draft_id = randomUUID()
        const draft = {
            id: draft_id,
            name: "October update",
            subject: "What shipped in October",
            headline: "October at URM",
            body_text: "Plenty shipped this month.",
            cta_url: null,
            cta_label: null,
            list_key: "newsletter",
            template_source: null,
            expected_updated_at: 0,
        }

        const empty = await read_catalog()
        expect(empty._tag).toBe("Ready")
        expect(
            empty._tag === "Ready" ? empty.value?.drafts : undefined
        ).toEqual([])
        // Recipients come from the PostgreSQL subscriber list, the same one the
        // admin screen writes.
        expect(
            empty._tag === "Ready"
                ? empty.value?.recipients.map((one) => one.email)
                : undefined
        ).toEqual(["ada@example.com"])

        const created = await mutate<
            unknown,
            { drafts: ReadonlyArray<{ id: string; updated_at: number }> }
        >(SaveNewsletterDraft, { domain_id: owner.domain_id, draft }, "c1")
        expect(created.output.drafts).toHaveLength(1)
        const saved = created.output.drafts[0]
        if (saved === undefined) throw new Error("draft missing")

        // A stale expected_updated_at is refused rather than overwriting.
        await expect(
            mutate(
                SaveNewsletterDraft,
                {
                    domain_id: owner.domain_id,
                    draft: { ...draft, expected_updated_at: 1 },
                },
                "c2"
            )
        ).rejects.toThrow()

        // An uploaded image is private in the draft and published on send, so a
        // recipient without a session can still load it.
        const image_id = "11111111-2222-3333-4444-555555555555"
        published_images.clear()
        stored_images.set(
            `domains/${owner.domain_id}/images/${image_id}`,
            Uint8Array.from([1, 2, 3])
        )
        await mutate(
            SaveNewsletterDraft,
            {
                domain_id: owner.domain_id,
                draft: {
                    ...draft,
                    expected_updated_at: saved.updated_at,
                    body_text: JSON.stringify({
                        schema_version: 2,
                        blocks: [
                            {
                                block_id: "body",
                                type: "rich_text",
                                document: {
                                    type: "doc",
                                    children: [
                                        {
                                            type: "paragraph",
                                            children: [
                                                {
                                                    type: "text",
                                                    text: "This month in charts.",
                                                },
                                            ],
                                        },
                                        {
                                            type: "image",
                                            src: `/api/uploads/${owner.domain_id}/${image_id}`,
                                            alt: "Chart",
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                },
            },
            "c-image"
        )

        const before = sent_emails.length
        const sent = await mutate<
            unknown,
            {
                sends: ReadonlyArray<{
                    status: string
                    approved_contact_count: number
                    sent_count: number
                    audience: string
                }>
            }
        >(
            SendNewsletter,
            {
                domain_id: owner.domain_id,
                send: {
                    draft_id,
                    request_id: "send-1",
                    audience: "subscribers",
                    test_email: null,
                    test_name: null,
                },
            },
            "s1"
        )
        expect(sent_emails.length).toBe(before + 1)
        expect(published_images.size).toBe(1)
        // The draft keeps the private reference; only the sent copy is public.
        expect(
            (
                await pg.query<{ body_text: string }>(
                    "SELECT body_text FROM email_newsletter_drafts WHERE id=$1",
                    [draft_id]
                )
            ).rows[0]?.body_text
        ).toContain("/api/uploads/")
        expect(sent.output.sends[0]).toMatchObject({
            approved_contact_count: 1,
            sent_count: 1,
            status: "completed",
        })
        expect(
            (
                await pg.query(
                    "SELECT count(*)::int AS total FROM email_deliveries WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows[0]
        ).toMatchObject({ total: 1 })
        expect(
            (
                await pg.query<{ provider_message_id: string | null }>(
                    "SELECT provider_message_id FROM email_deliveries WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows[0]?.provider_message_id
        ).toMatch(/^test-/)

        // A repeat of the same request id does not send twice.
        const repeated = await mutate<
            unknown,
            { sends: ReadonlyArray<unknown> }
        >(
            SendNewsletter,
            {
                domain_id: owner.domain_id,
                send: {
                    draft_id,
                    request_id: "send-1",
                    audience: "subscribers",
                    test_email: null,
                    test_name: null,
                },
            },
            "s2"
        )
        expect(sent_emails.length).toBe(before + 1)
        expect(repeated.output.sends).toHaveLength(1)

        // A draft with a send in the ledger is kept, not deleted.
        await expect(
            mutate(
                DeleteNewsletterDraft,
                { domain_id: owner.domain_id, draft_id },
                "d1"
            )
        ).rejects.toThrow()
        expect(
            (
                await pg.query(
                    "SELECT count(*)::int AS total FROM email_newsletter_drafts WHERE domain_id=$1",
                    [owner.domain_id]
                )
            ).rows[0]
        ).toMatchObject({ total: 1 })

        const unsent_id = randomUUID()
        await mutate(
            SaveNewsletterDraft,
            {
                domain_id: owner.domain_id,
                draft: { ...draft, id: unsent_id, name: "Unsent" },
            },
            "c3"
        )
        const removed = await mutate<
            unknown,
            { drafts: ReadonlyArray<{ id: string }> }
        >(
            DeleteNewsletterDraft,
            { domain_id: owner.domain_id, draft_id: unsent_id },
            "d2"
        )
        expect(removed.output.drafts.map((one) => one.id)).toEqual([draft_id])
    }, 30000)
})

const TransactionalCache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const TransactionalData = Remote.make({
    model: TransactionalCache.model.remote,
    entities: [TransactionalCatalog],
})

describe("PostgreSQL transactional templates and sending", () => {
    it("versions copy, activates deliberately and sends one recorded email", async () => {
        const owner = await seed("tx-owner")
        const session = await login("tx-owner")
        const now = Date.now()
        const contact_id = randomUUID()
        await pg.query(
            "INSERT INTO contacts (id,name,created_at,updated_at) VALUES ($1,'Ada Reader',$2,$2)",
            [contact_id, now]
        )
        await pg.query(
            "INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at) VALUES ($1,$2,'ada@example.com',true,$3,$3)",
            [randomUUID(), contact_id, now]
        )
        await pg.query(
            "INSERT INTO domain_contacts (id,domain_id,contact_id,status,created_at,updated_at) VALUES ($1,$2,$3,'active',$4,$4)",
            [randomUUID(), owner.domain_id, contact_id, now]
        )
        const layer = browser_api(
            "https://urm.test",
            () => ({ email: "", password: "" }),
            (input, init) => {
                const request = new Request(input, init)
                request.headers.set("cookie", `urm_account=${session.token}`)
                return run(
                    new URL(request.url).pathname.startsWith("/auth/")
                        ? handle_auth_request(request)
                        : handle_rpc_request(request)
                )
            }
        )
        const [, recipient_commands] = MailBrowser.request_send_recipients(
            MailBrowser.init("/mail/send"),
            owner.domain_id
        )
        const recipient_command = recipient_commands[0]
        expect(recipient_command?.name).toBe("LoadMailSendRecipients")
        if (recipient_command === undefined)
            throw new Error("Send recipient load command was missing")
        const recipient_message = await Effect.runPromise(
            recipient_command.effect.pipe(Effect.provide(layer))
        )
        expect(recipient_message._tag).toBe("GotSendMessage")
        if (
            recipient_message._tag !== "GotSendMessage" ||
            recipient_message.message._tag !== "SendRecipientsLoaded"
        )
            throw new Error("Send recipients were not loaded")
        expect(recipient_message.message.recipients).toContainEqual({
            id: contact_id,
            name: "Ada Reader",
            email: "ada@example.com",
        })
        const read = (suffix = "") =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    const query = TransactionalData.get(
                        TransactionalSummary,
                        `${transactional_catalog_id(owner.domain_id)}${suffix}`
                    )
                    const result = yield* TransactionalData.prefetch(
                        { remote: Remote.initial },
                        query
                    ).pipe(Effect.provide(api.remote(owner.domain_id)))
                    return query.read(result)
                }).pipe(Effect.provide(layer))
            )
        const change = (operation: unknown, request_id: string) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    return yield* Remote.mutate(
                        ChangeTransactionalCopy as never,
                        { domain_id: owner.domain_id, operation } as never,
                        request_id
                    ).pipe(Effect.provide(api.remote(owner.domain_id)))
                }).pipe(Effect.provide(layer))
            ) as Promise<{
                output: {
                    templates: ReadonlyArray<{
                        template_id: string
                        latest: { version: number } | null
                        active: { version: number } | null
                    }>
                }
            }>
        const send = (send_input: unknown, request_id: string) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    const api = yield* ContactsApi
                    return yield* Remote.mutate(
                        SendTransactionalEmail as never,
                        {
                            domain_id: owner.domain_id,
                            send: send_input,
                        } as never,
                        request_id
                    ).pipe(Effect.provide(api.remote(owner.domain_id)))
                }).pipe(Effect.provide(layer))
            ) as Promise<{ output: { id: string; status: string } }>

        const initial = await read()
        expect(initial._tag).toBe("Ready")
        const templates =
            initial._tag === "Ready" ? (initial.value?.templates ?? []) : []
        expect(templates.map((one) => one.template_id)).toEqual([
            "auth_email_verification",
            "auth_password_reset",
            "auth_password_changed",
        ])
        expect(templates.every((one) => one.latest === null)).toBe(true)

        const copy = {
            subject: "Confirm your address",
            heading: "One more step",
            introduction: "Open the link below to confirm your address.",
        }
        const saved = await change(
            {
                template_id: "auth_email_verification",
                expected_version: null,
                operation: "save",
                copy,
                source_version: null,
                expected_active_version: null,
            },
            "t1"
        )
        const verification = saved.output.templates.find(
            (one) => one.template_id === "auth_email_verification"
        )
        expect(verification?.latest?.version).toBe(1)
        // Saving does not publish: the active pointer stays empty until asked.
        expect(verification?.active).toBe(null)

        // A stale expected_version is refused rather than branching history.
        await expect(
            change(
                {
                    template_id: "auth_email_verification",
                    expected_version: null,
                    operation: "save",
                    copy: { ...copy, subject: "Clobbered" },
                    source_version: null,
                    expected_active_version: null,
                },
                "t2"
            )
        ).rejects.toThrow()

        const activated = await change(
            {
                template_id: "auth_email_verification",
                expected_version: 1,
                operation: "activate",
                copy: null,
                source_version: null,
                expected_active_version: null,
            },
            "t3"
        )
        expect(
            activated.output.templates.find(
                (one) => one.template_id === "auth_email_verification"
            )?.active?.version
        ).toBe(1)

        await change(
            {
                template_id: "auth_email_verification",
                expected_version: 1,
                operation: "save",
                copy: { ...copy, subject: "Second draft" },
                source_version: null,
                expected_active_version: 1,
            },
            "t4"
        )
        const restored = await change(
            {
                template_id: "auth_email_verification",
                expected_version: 2,
                operation: "restore",
                copy: null,
                source_version: 1,
                expected_active_version: 1,
            },
            "t5"
        )
        expect(
            restored.output.templates.find(
                (one) => one.template_id === "auth_email_verification"
            )?.latest
        ).toMatchObject({ version: 3, copy: { subject: copy.subject } })

        const history = await read("/auth_email_verification")
        expect(
            history._tag === "Ready"
                ? history.value?.history.map((one) => one.version)
                : undefined
        ).toEqual([3, 2, 1])
        expect(
            history._tag === "Ready"
                ? history.value?.history[0]?.restored_from_version
                : undefined
        ).toBe(1)

        const before = sent_emails.length
        const delivery = await send(
            {
                contact_id,
                request_id: "tx-send-1",
                template_id: "auth_email_verification",
                subject: null,
                body_text: null,
            },
            "s1"
        )
        expect(sent_emails.length).toBe(before + 1)
        expect(delivery.output.status).toBe("sent")
        const stored = await pg.query<{
            purpose: string
            template_id: string
            transactional_template_version: number | null
            is_test: boolean
            provider_message_id: string | null
        }>(
            "SELECT purpose, template_id, transactional_template_version, is_test, provider_message_id FROM email_deliveries WHERE domain_id=$1 AND purpose='transactional'",
            [owner.domain_id]
        )
        expect(stored.rows).toHaveLength(1)
        expect(stored.rows[0]).toMatchObject({
            purpose: "transactional",
            template_id: "auth_email_verification",
            transactional_template_version: 1,
            is_test: true,
        })
        expect(stored.rows[0]?.provider_message_id).toMatch(/^test-/)

        // A repeat of the same request returns the recorded delivery, unsent.
        const repeated = await send(
            {
                contact_id,
                request_id: "tx-send-1",
                template_id: "auth_email_verification",
                subject: null,
                body_text: null,
            },
            "s2"
        )
        expect(sent_emails.length).toBe(before + 1)
        expect(repeated.output.id).toBe(delivery.output.id)

        // A one-off email needs both a subject and a message.
        await expect(
            send(
                {
                    contact_id,
                    request_id: "tx-send-2",
                    template_id: null,
                    subject: "Hello",
                    body_text: null,
                },
                "s3"
            )
        ).rejects.toThrow()

        const [with_recipient] = MailBrowser.update(
            MailBrowser.request_send_recipients(
                MailBrowser.init("/mail/send"),
                owner.domain_id
            )[0],
            recipient_message,
            owner.domain_id
        )
        const [with_subject] = MailBrowser.update(
            with_recipient,
            Mail.GotSendMessage({
                message: SendFeature.UpdatedSingleEmail({
                    field: "subject",
                    value: "Hello",
                }),
            }),
            owner.domain_id
        )
        const [send_ready] = MailBrowser.update(
            with_subject,
            Mail.GotSendMessage({
                message: SendFeature.UpdatedSingleEmail({
                    field: "bodyText",
                    value: "A real message",
                }),
            }),
            owner.domain_id
        )
        const [sending_model, send_commands] = MailBrowser.update(
            send_ready,
            Mail.GotSendMessage({
                message: SendFeature.SubmittedSingleEmail(),
            }),
            owner.domain_id
        )
        expect(sending_model.send.sending).toBe(true)
        const send_command = send_commands[0]
        expect(send_command?.name).toBe("SendMailTransactional")
        if (send_command === undefined)
            throw new Error("Send command was missing")
        const send_result = await Effect.runPromise(
            send_command.effect.pipe(Effect.provide(layer))
        )
        expect(send_result._tag).toBe("GotSendMessage")
        const [completed, refresh_commands] = MailBrowser.update(
            sending_model,
            send_result,
            owner.domain_id
        )
        expect(completed.send.sending).toBe(false)
        expect(completed.send.notice).toBe("Email sent.")
        expect(refresh_commands.map((command) => command.name)).toContain(
            "LoadMailTransactionalDeliveries"
        )
    }, 30000)
})

/** Security regressions use only the in-memory database and inert storage. */
describe("account security regressions", () => {
    it("authorizes stored private image URLs against their workspace", async () => {
        const owner = await seed("image-owner")
        const other = await seed("image-other")
        const session = await login("image-owner")
        const image_id = "11111111-2222-3333-4444-555555555555"
        for (const domain_id of [owner.domain_id, other.domain_id])
            uploaded_objects.set(
                `domains/${domain_id}/media/images/${image_id}`,
                png
            )
        const request = (domain_id: string) =>
            run(
                handleImageUrlRoute(
                    new Request(
                        `https://urm.test/image-url?url=${encodeURIComponent(`https://storage.test/bucket/domains/${domain_id}/media/images/${image_id}`)}`,
                        { headers: { cookie: `urm_account=${session.token}` } }
                    )
                ).pipe(Effect.provideService(UploadStorage, upload_storage))
            )
        expect((await request(owner.domain_id)).status).toBe(302)
        expect((await request(other.domain_id)).status).toBe(403)
        await pg.query(
            "UPDATE organization_members SET deleted_at=$1 WHERE user_id=$2",
            [Date.now(), owner.account_id]
        )
        expect((await request(owner.domain_id)).status).toBe(403)
    })

    it("applies shared login admission before allocating another identifier", async () => {
        const now = Date.now()
        const clock = vi.spyOn(Date, "now").mockReturnValue(now)
        try {
            await pg.query(
                "INSERT INTO account_login_attempts (key,window_start,attempts) VALUES ('global-login',$1,30)",
                [Math.floor(now / 10_000) * 10_000]
            )
            const result = await run(
                Effect.result(
                    login_account({ email: "unknown@example.test", password })
                )
            )
            expect(result._tag).toBe("Failure")
            if (result._tag === "Failure")
                expect(result.failure).toMatchObject({ reason: "rate_limited" })
            expect(
                (
                    await pg.query(
                        "SELECT key,attempts FROM account_login_attempts"
                    )
                ).rows
            ).toEqual([{ key: "global-login", attempts: 31 }])
        } finally {
            clock.mockRestore()
        }
    })

    it("expires stale per-identifier login state during admitted login", async () => {
        await pg.exec(
            "INSERT INTO account_login_attempts (key,window_start,attempts) VALUES (repeat('a',64),0,10),('breach:user:retained',0,1)"
        )
        const result = await run(
            Effect.result(
                login_account({ email: "unknown@example.test", password })
            )
        )
        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure")
            expect(result.failure).toMatchObject({
                reason: "invalid_credentials",
            })
        expect(
            (
                await pg.query(
                    "SELECT key FROM account_login_attempts WHERE key=repeat('a',64)"
                )
            ).rows
        ).toEqual([])
        expect(
            (
                await pg.query(
                    "SELECT key FROM account_login_attempts WHERE key='breach:user:retained'"
                )
            ).rows
        ).toEqual([{ key: "breach:user:retained" }])
    })
})
