import { DocumentsWriteError } from "@urm/domain/documents"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    DocumentRecord,
    DocumentTemplate,
    type DocumentAction,
} from "@urm/domain/documents"
import { RichTextContent } from "@urm/domain/schemas/rich-text"

export interface DocumentsPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new DocumentsWriteError({
        message: "Document operation unavailable or access denied",
    })
const Id = Schema.Struct({ id: Schema.String })
const authorize_documents = Effect.fn("Documents.authorize")(function* (
    principal: DocumentsPrincipal,
    domain_id: string,
    write = false
) {
    if (principal.domain_id !== domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Documents")
    const rows = yield* query_rows(
        Id,
        sql`SELECT organization_id AS id FROM domains WHERE id=${domain_id}`
    )
    const row = rows[0]
    if (row === undefined) return yield* Effect.fail(denied())
    return row.id
})
const load_library = Effect.fn("Documents.load")(function* (
    principal: DocumentsPrincipal
) {
    const organization_id = yield* authorize_documents(
        principal,
        principal.domain_id
    )
    const documents = yield* query_rows(
        DocumentRecord,
        sql`SELECT id,title,content,content_type,status,template_source,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM internal_documents WHERE organization_id=${organization_id} AND domain_id IS NULL ORDER BY updated_at DESC,id LIMIT 101`
    )
    const templates = yield* query_rows(
        DocumentTemplate,
        sql`SELECT id,name,description,tags,title,content,content_type,revision,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM internal_document_templates WHERE organization_id=${organization_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    if (documents.length > 100 || templates.length > 100)
        return yield* Effect.fail(denied())
    return { id: principal.domain_id, documents, templates }
})
const change_documents = Effect.fn("Documents.change")(function* (
    principal: DocumentsPrincipal,
    action: DocumentAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            // Serialize shared organization limits and template revisions across domains.
            const organizations = yield* query_rows(
                Id,
                sql`SELECT organization_id AS id FROM domains WHERE id=${principal.domain_id} FOR UPDATE`
            )
            const organization = organizations[0]
            if (organization === undefined) return yield* Effect.fail(denied())
            yield* tx.query(
                sql`SELECT id FROM organizations WHERE id=${organization.id} FOR UPDATE`
            )
            const org = yield* authorize_documents(
                principal,
                principal.domain_id,
                true
            )
            const library = yield* load_library(principal)
            const now = Date.now()
            const actor = principal.account_id
            if ("content" in action && action.content_type === "rich_text_json")
                yield* Schema.decodeUnknownEffect(
                    Schema.fromJsonString(RichTextContent)
                )(action.content)
            if (action._tag === "save_template") {
                const existing = library.templates.find(
                    (item) => item.id === action.id
                )
                const tags = [
                    ...new Set(
                        action.tags.map((tag) => tag.toLocaleLowerCase())
                    ),
                ]
                if (existing === undefined) {
                    if (
                        action.expected_revision !== 0 ||
                        library.templates.length >= 100
                    )
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`INSERT INTO internal_document_templates (id,organization_id,name,description,tags,title,content,content_type,revision,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES (${action.id},${org},${action.name},${action.description},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(tags)}::jsonb)),${action.title},${action.content},${action.content_type},1,${actor},${actor},${now},${now})`
                    )
                } else {
                    if (existing.revision !== action.expected_revision)
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`UPDATE internal_document_templates SET name=${action.name},description=${action.description},tags=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(tags)}::jsonb)),title=${action.title},content=${action.content},content_type=${action.content_type},revision=revision+1,updated_by_user_id=${actor},updated_at=${now} WHERE id=${action.id} AND organization_id=${org}`
                    )
                }
            } else if (action._tag === "delete_template") {
                if (!library.templates.some((item) => item.id === action.id))
                    return yield* Effect.fail(denied())
                yield* tx.query(
                    sql`DELETE FROM internal_document_templates WHERE id=${action.id} AND organization_id=${org}`
                )
            } else if (
                action._tag === "create" ||
                action._tag === "from_template"
            ) {
                const template =
                    action._tag === "from_template"
                        ? library.templates.find(
                              (item) => item.id === action.template_id
                          )
                        : undefined
                if (action._tag === "from_template" && template === undefined)
                    return yield* Effect.fail(denied())
                const fields = action._tag === "create" ? action : template
                if (fields === undefined) return yield* Effect.fail(denied())
                const status =
                    action._tag === "create" ? action.status : "draft"
                const source =
                    template === undefined
                        ? {
                              template_id: "document.blank",
                              template_version: 1,
                              provenance: "builtin",
                          }
                        : {
                              template_id: `organization.document.${template.id}`,
                              template_version: template.revision,
                              provenance: "organization",
                          }
                const existing = library.documents.find(
                    (item) => item.id === action.id
                )
                if (existing !== undefined) {
                    if (
                        existing.title !== fields.title ||
                        existing.content !== fields.content ||
                        existing.content_type !== fields.content_type ||
                        existing.status !== status ||
                        existing.template_source?.template_id !==
                            source.template_id ||
                        existing.template_source?.template_version !==
                            source.template_version ||
                        existing.template_source?.provenance !==
                            source.provenance
                    )
                        return yield* Effect.fail(denied())
                } else {
                    if (library.documents.length >= 100)
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`INSERT INTO internal_documents (id,organization_id,title,content,content_type,status,template_source,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES (${action.id},${org},${fields.title},${fields.content},${fields.content_type},${status},${JSON.stringify(source)}::jsonb,${actor},${actor},${now},${now})`
                    )
                }
            } else {
                if (!library.documents.some((item) => item.id === action.id))
                    return yield* Effect.fail(denied())
                if (action._tag === "delete")
                    yield* tx.query(
                        sql`DELETE FROM internal_documents WHERE id=${action.id} AND organization_id=${org} AND domain_id IS NULL`
                    )
                else
                    yield* tx.query(
                        sql`UPDATE internal_documents SET title=${action.title},content=${action.content},content_type=${action.content_type},status=${action.status},updated_by_user_id=${actor},updated_at=${now} WHERE id=${action.id} AND organization_id=${org} AND domain_id IS NULL`
                    )
            }
            return yield* load_library(principal)
        })
    )
})

const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_documents: (
            ...args: Parameters<typeof authorize_documents>
        ) => authorize_documents(...args).pipe(Effect.provideService(Sql, db)),
        load_library: (...args: Parameters<typeof load_library>) =>
            load_library(...args).pipe(Effect.provideService(Sql, db)),
        change_documents: (...args: Parameters<typeof change_documents>) =>
            change_documents(...args).pipe(Effect.provideService(Sql, db)),
    }
})

export class DocumentsRepository extends Context.Service<
    DocumentsRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/DocumentsRepository") {}
export const DocumentsRepositoryLive = Layer.effect(
    DocumentsRepository,
    make_repository
)
