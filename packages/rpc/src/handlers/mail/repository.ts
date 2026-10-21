/** # Workspace mail authoring and delivery */
import { createHash, randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import { ServerConfig } from "@urm/env/server"
import { EmailTransport, transactionalTemplateTestEmail } from "@urm/email"
import { EmailPrincipal, EmailSql, sendNewsletter } from "@urm/email/postgres"
import {
    SiteAppearanceSettings,
    resolveSiteTheme,
} from "@urm/domain/schemas/site-appearance"
import {
    NEWSLETTER_DRAFT_LIMIT,
    NEWSLETTER_RECIPIENT_LIMIT,
    NEWSLETTER_SEND_LIMIT,
    NewsletterCatalogRecord,
    NewsletterDraft,
    NewsletterRecipient,
    NewsletterSend,
    NewsletterWriteError,
    PublicationEmailThemeRecord,
    newsletter_catalog_id,
    type SaveNewsletterDraftInput,
    type SendNewsletterInput,
} from "@urm/domain/mail-newsletter"
import {
    NewsletterImagePublisher,
    publish_newsletter_images,
} from "./publish-images.ts"
import {
    TRANSACTIONAL_DELIVERY_LIMIT,
    TRANSACTIONAL_HISTORY_PAGE,
    TransactionalCatalogRecord,
    TransactionalCopy,
    TransactionalDelivery,
    TransactionalTemplateId,
    TransactionalWriteError,
    transactional_catalog_id,
    type SendTransactionalInput,
    type TransactionalOperationInput,
} from "@urm/domain/mail-transactional"

const TRANSACTIONAL_TEMPLATE_IDS = TransactionalTemplateId.literals
import {
    Subscription,
    SubscriptionCatalogRecord,
    SubscriptionWriteError,
    subscription_catalog_id,
    subscription_list_key,
    type SetSubscriptionInput,
} from "@urm/domain/mail-subscriptions"
import {
    NEWSLETTER_TEMPLATE_LIMIT,
    NewsletterTemplate,
    NewsletterTemplateCatalogRecord,
    NewsletterTemplateWriteError,
    newsletter_template_catalog_id,
    type SaveNewsletterTemplateInput,
} from "@urm/domain/mail-templates"

export interface SubscriptionsPrincipal extends AccountPrincipal {
    readonly domain_id: string
}

const denied = () =>
    new SubscriptionWriteError({
        message:
            "The subscriber list is unavailable, the contact is not in this workspace, or access was denied.",
    })

const authorize = Effect.fn("MailSubscriptions.authorize")(function* (
    principal: SubscriptionsPrincipal,
    write: boolean
) {
    yield* require_account_domain(principal, principal.domain_id, write, "Mail")
})

const PublicationLayout = Schema.Struct({
    site_title: Schema.String,
    ...SiteAppearanceSettings.fields,
})
const PublicationThemeRow = Schema.Struct({
    name: Schema.String,
    layout: Schema.NullOr(PublicationLayout),
})
export const load_publication_theme = Effect.fn("Mail.loadPublicationTheme")(
    function* (principal: SubscriptionsPrincipal) {
        yield* authorize(principal, false)
        const rows = yield* query_rows(
            PublicationThemeRow,
            sql`SELECT d.name,c.layout FROM domains d LEFT JOIN publication_configurations c ON c.domain_id=d.id AND c.subdomain_id IS NULL WHERE d.id=${principal.domain_id}`
        )
        const row = rows[0]
        if (row === undefined) return yield* Effect.fail(denied())
        return PublicationEmailThemeRecord.make({
            id: principal.domain_id,
            domain_id: principal.domain_id,
            brand_name: row.layout?.site_title ?? row.name,
            site_theme: resolveSiteTheme({
                theme_id: row.layout?.theme_id ?? "default",
                appearance: row.layout?.appearance ?? "system",
            }),
        })
    }
)

// One row per subscribed contact, carrying the contact's primary address. Only
// contacts actively linked to this workspace are listed, so a shared contact
// record never leaks between domains.
const list_subscriptions = (domain_id: string, list_key: string) =>
    query_rows(
        Subscription,
        sql`SELECT c.id AS contact_id, coalesce(c.name, e.email) AS name, e.email, s.list_key, s.status,
            s.source, s.subscribed_at::float8 AS subscribed_at, s.unsubscribed_at::float8 AS unsubscribed_at
            FROM email_subscriptions s
            JOIN contacts c ON c.id = s.contact_id AND c.deleted_at IS NULL
            JOIN domain_contacts dc ON dc.contact_id = c.id AND dc.domain_id = s.domain_id
                AND dc.deleted_at IS NULL AND dc.status = 'active'
            JOIN LATERAL (SELECT email FROM contact_email_addresses WHERE contact_id = c.id
                ORDER BY is_primary DESC, updated_at DESC, id LIMIT 1) e ON true
            WHERE s.domain_id = ${domain_id} AND s.list_key = ${list_key}
            ORDER BY s.updated_at DESC, s.id LIMIT 200`
    )

const load_catalog = Effect.fn("MailSubscriptions.load")(function* (
    principal: SubscriptionsPrincipal,
    requested_list_key: string
) {
    yield* authorize(principal, false)
    const list_key = subscription_list_key(requested_list_key)
    return SubscriptionCatalogRecord.make({
        id: subscription_catalog_id(principal.domain_id, list_key),
        list_key,
        subscriptions: yield* list_subscriptions(principal.domain_id, list_key),
    })
})

const set_status = Effect.fn("MailSubscriptions.set")(function* (
    principal: SubscriptionsPrincipal,
    input: SetSubscriptionInput
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            yield* authorize(principal, true)
            const list_key = subscription_list_key(input.list_key)
            const now = Date.now()
            // A suppressed subscription is owned by delivery handling (bounces
            // and complaints); an administrator may not revive it here.
            const changed = yield* query_rows(
                Schema.Struct({ contact_id: Schema.String }),
                sql`INSERT INTO email_subscriptions (id, domain_id, contact_id, list_key, status, source, created_at, updated_at, subscribed_at, unsubscribed_at)
                    SELECT ${randomUUID()}, ${domain_id}, c.id, ${list_key}, ${input.status}::email_subscription_status, 'admin', ${now}, ${now},
                        ${input.status === "subscribed" ? now : null}, ${input.status === "unsubscribed" ? now : null}
                    FROM contacts c
                    JOIN domain_contacts dc ON dc.contact_id = c.id AND dc.domain_id = ${domain_id}
                    WHERE c.id = ${input.contact_id} AND c.deleted_at IS NULL
                        AND dc.deleted_at IS NULL AND dc.status = 'active'
                    ON CONFLICT (domain_id, contact_id, list_key) DO UPDATE SET
                        status = excluded.status,
                        updated_at = excluded.updated_at,
                        subscribed_at = COALESCE(excluded.subscribed_at, email_subscriptions.subscribed_at),
                        unsubscribed_at = COALESCE(excluded.unsubscribed_at, email_subscriptions.unsubscribed_at)
                    WHERE email_subscriptions.status <> 'suppressed'
                    RETURNING contact_id`
            )
            if (changed.length === 0) return yield* Effect.fail(denied())
            return yield* load_catalog(principal, list_key).pipe(
                Effect.provideService(Sql, tx)
            )
        })
    )
})

// --- Newsletter templates -------------------------------------------------
// Organization-scoped and revision-checked, following `blog_templates`: the
// workspace grants access, the organization owns the records.

const owner_organization = (domain_id: string) =>
    Effect.gen(function* () {
        const rows = yield* query_rows(
            Schema.Struct({ id: Schema.String }),
            sql`SELECT organization_id AS id FROM domains WHERE id=${domain_id}`
        )
        const organization = rows[0]
        if (organization === undefined)
            return yield* Effect.fail(template_denied())
        return organization.id
    })

const template_denied = () =>
    new NewsletterTemplateWriteError({
        message:
            "The template is unavailable, was changed by someone else, or access was denied.",
    })

const list_templates = (organization_id: string) =>
    query_rows(
        NewsletterTemplate,
        sql`SELECT id,name,description,tags,subject,headline,body_text,cta_url,cta_label,revision,
            created_at::float8 AS created_at,updated_at::float8 AS updated_at
            FROM email_newsletter_templates WHERE organization_id=${organization_id}
            ORDER BY updated_at DESC,id LIMIT ${NEWSLETTER_TEMPLATE_LIMIT}`
    )

const load_templates = Effect.fn("MailTemplates.load")(function* (
    principal: SubscriptionsPrincipal
) {
    yield* authorize(principal, false)
    const organization_id = yield* owner_organization(principal.domain_id)
    return NewsletterTemplateCatalogRecord.make({
        id: newsletter_template_catalog_id(principal.domain_id),
        templates: yield* list_templates(organization_id),
    })
})

const save_template = Effect.fn("MailTemplates.save")(function* (
    principal: SubscriptionsPrincipal,
    input: SaveNewsletterTemplateInput
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            yield* authorize(principal, true)
            const organization_id = yield* owner_organization(
                principal.domain_id
            )
            yield* tx.query(
                sql`SELECT id FROM organizations WHERE id=${organization_id} FOR UPDATE`
            )
            const now = Date.now()
            const existing = yield* query_rows(
                Schema.Struct({ revision: Schema.Number }),
                sql`SELECT revision FROM email_newsletter_templates
                    WHERE id=${input.id} AND organization_id=${organization_id}`
            )
            const stored = existing[0]
            const tags = sql`ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify([...input.tags])}::jsonb))`
            if (stored === undefined) {
                if (input.expected_revision !== 0)
                    return yield* Effect.fail(template_denied())
                const count = yield* query_rows(
                    Schema.Struct({ total: Schema.Number }),
                    sql`SELECT count(*)::float8 AS total FROM email_newsletter_templates WHERE organization_id=${organization_id}`
                )
                if ((count[0]?.total ?? 0) >= NEWSLETTER_TEMPLATE_LIMIT)
                    return yield* Effect.fail(template_denied())
                yield* tx.query(
                    sql`INSERT INTO email_newsletter_templates (id,organization_id,name,description,tags,subject,headline,body_text,cta_url,cta_label,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
                        VALUES (${input.id},${organization_id},${input.name},${input.description},${tags},${input.subject},${input.headline},${input.body_text},${input.cta_url},${input.cta_label},1,${principal.account_id},${principal.account_id},${now},${now})`
                )
            } else {
                if (stored.revision !== input.expected_revision)
                    return yield* Effect.fail(template_denied())
                yield* tx.query(
                    sql`UPDATE email_newsletter_templates SET name=${input.name},description=${input.description},tags=${tags},
                        subject=${input.subject},headline=${input.headline},body_text=${input.body_text},
                        cta_url=${input.cta_url},cta_label=${input.cta_label},revision=revision+1,
                        updated_by_user_id=${principal.account_id},updated_at=${now}
                        WHERE id=${input.id} AND organization_id=${organization_id}`
                )
            }
            return yield* load_templates(principal).pipe(
                Effect.provideService(Sql, tx)
            )
        })
    )
})

// --- Newsletter drafts and delivery ---------------------------------------
// Drafts, sends and recipients all live in PostgreSQL; sending delegates to
// `@urm/email`'s dispatcher, which owns the send ledger, per-recipient
// deliveries and unsubscribe tokens.

const newsletter_denied = () =>
    new NewsletterWriteError({
        message:
            "The newsletter is unavailable, was changed by someone else, or access was denied.",
    })

const list_drafts = (domain_id: string) =>
    query_rows(
        NewsletterDraft,
        sql`SELECT id,name,subject,headline,body_text,cta_url,cta_label,list_key,template_source,
            updated_at::float8 AS updated_at
            FROM email_newsletter_drafts WHERE domain_id=${domain_id}
            ORDER BY updated_at DESC,id LIMIT ${NEWSLETTER_DRAFT_LIMIT}`
    )

const list_sends = (domain_id: string) =>
    query_rows(
        NewsletterSend,
        sql`SELECT id,coalesce(audience,'subscribers') AS audience,status,
            approved_contact_count,accepted_count,queued_count,sent_count,failed_count,skipped_count,
            authoring_template_source,delivery_template_source,
            created_at::float8 AS created_at,completed_at::float8 AS completed_at
            FROM email_newsletter_sends WHERE domain_id=${domain_id}
            ORDER BY created_at DESC,id LIMIT ${NEWSLETTER_SEND_LIMIT}`
    )

const list_recipients = (domain_id: string, list_key: string) =>
    query_rows(
        NewsletterRecipient,
        sql`SELECT c.id AS contact_id, coalesce(c.name, e.email) AS name, e.email
            FROM email_subscriptions s
            JOIN contacts c ON c.id = s.contact_id AND c.deleted_at IS NULL
            JOIN domain_contacts dc ON dc.contact_id = c.id AND dc.domain_id = s.domain_id
                AND dc.deleted_at IS NULL AND dc.status = 'active'
            JOIN LATERAL (SELECT email FROM contact_email_addresses WHERE contact_id = c.id
                ORDER BY is_primary DESC, updated_at DESC, id LIMIT 1) e ON true
            WHERE s.domain_id = ${domain_id} AND s.list_key = ${list_key}
                AND s.status = 'subscribed'
            ORDER BY c.id LIMIT ${NEWSLETTER_RECIPIENT_LIMIT}`
    )

const load_newsletter = Effect.fn("MailNewsletter.load")(function* (
    principal: SubscriptionsPrincipal,
    requested_list_key: string
) {
    yield* authorize(principal, false)
    const list_key = subscription_list_key(requested_list_key)
    return NewsletterCatalogRecord.make({
        id: newsletter_catalog_id(principal.domain_id, list_key),
        list_key,
        drafts: yield* list_drafts(principal.domain_id),
        sends: yield* list_sends(principal.domain_id),
        recipients: yield* list_recipients(principal.domain_id, list_key),
    })
})

const save_draft = Effect.fn("MailNewsletter.saveDraft")(function* (
    principal: SubscriptionsPrincipal,
    input: SaveNewsletterDraftInput
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            yield* authorize(principal, true)
            const now = Date.now()
            const existing = yield* query_rows(
                Schema.Struct({ updated_at: Schema.Number }),
                sql`SELECT updated_at::float8 AS updated_at FROM email_newsletter_drafts
                    WHERE id=${input.id} AND domain_id=${domain_id} FOR UPDATE`
            )
            const stored = existing[0]
            const template_source =
                input.template_source === null
                    ? null
                    : JSON.stringify(input.template_source)
            if (stored === undefined) {
                if (input.expected_updated_at !== 0)
                    return yield* Effect.fail(newsletter_denied())
                const count = yield* query_rows(
                    Schema.Struct({ total: Schema.Number }),
                    sql`SELECT count(*)::float8 AS total FROM email_newsletter_drafts WHERE domain_id=${domain_id}`
                )
                if ((count[0]?.total ?? 0) >= NEWSLETTER_DRAFT_LIMIT)
                    return yield* Effect.fail(newsletter_denied())
                yield* tx.query(
                    sql`INSERT INTO email_newsletter_drafts (id,domain_id,name,subject,headline,body_text,cta_url,cta_label,list_key,template_source,updated_at)
                        VALUES (${input.id},${domain_id},${input.name},${input.subject},${input.headline},${input.body_text},${input.cta_url},${input.cta_label},${subscription_list_key(input.list_key)},${template_source}::jsonb,${now})`
                )
            } else {
                if (stored.updated_at !== input.expected_updated_at)
                    return yield* Effect.fail(newsletter_denied())
                yield* tx.query(
                    sql`UPDATE email_newsletter_drafts SET name=${input.name},subject=${input.subject},
                        headline=${input.headline},body_text=${input.body_text},cta_url=${input.cta_url},
                        cta_label=${input.cta_label},list_key=${subscription_list_key(input.list_key)},
                        template_source=${template_source}::jsonb,updated_at=${now}
                        WHERE id=${input.id} AND domain_id=${domain_id}`
                )
            }
            return yield* list_drafts(domain_id).pipe(
                Effect.provideService(Sql, tx)
            )
        })
    )
})

const delete_draft = Effect.fn("MailNewsletter.deleteDraft")(function* (
    principal: SubscriptionsPrincipal,
    draft_id: string
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            yield* authorize(principal, true)
            // A draft that has been sent is kept: the send ledger references it.
            const sent = yield* query_rows(
                Schema.Struct({ id: Schema.String }),
                sql`SELECT id FROM email_newsletter_sends WHERE domain_id=${domain_id} AND draft_id=${draft_id} LIMIT 1`
            )
            if (sent.length > 0) return yield* Effect.fail(newsletter_denied())
            const removed = yield* query_rows(
                Schema.Struct({ id: Schema.String }),
                sql`DELETE FROM email_newsletter_drafts WHERE id=${draft_id} AND domain_id=${domain_id} RETURNING id`
            )
            if (removed.length === 0)
                return yield* Effect.fail(newsletter_denied())
            return yield* list_drafts(domain_id).pipe(
                Effect.provideService(Sql, tx)
            )
        })
    )
})

const send_newsletter_draft = Effect.fn("MailNewsletter.send")(function* (
    principal: SubscriptionsPrincipal,
    input: SendNewsletterInput,
    app_url: string
) {
    yield* authorize(principal, true)
    const drafts = yield* query_rows(
        NewsletterDraft,
        sql`SELECT id,name,subject,headline,body_text,cta_url,cta_label,list_key,template_source,
            updated_at::float8 AS updated_at
            FROM email_newsletter_drafts WHERE id=${input.draft_id} AND domain_id=${principal.domain_id}`
    )
    const draft = drafts[0]
    if (draft === undefined) return yield* Effect.fail(newsletter_denied())
    // Recipients hold no session, so private uploads the body references are
    // published to public objects first and the body is rewritten. The stored
    // draft keeps its private references.
    const body_text = yield* publish_newsletter_images(
        principal,
        draft.body_text
    ).pipe(Effect.mapError(() => newsletter_denied()))
    // `sendNewsletter` owns the ledger, deliveries and unsubscribe tokens, and
    // resolves recipients from the PostgreSQL subscriber list.
    const send = yield* sendNewsletter(
        {
            domain_id: principal.domain_id,
            request_id: input.request_id,
            audience: input.audience,
            ...(input.audience === "test"
                ? {
                      test_recipient: {
                          email: input.test_email?.trim().toLowerCase(),
                          name: input.test_name?.trim() ?? "",
                      },
                  }
                : {}),
            name: draft.name,
            subject: draft.subject,
            headline: draft.headline,
            body_text,
            list_key: subscription_list_key(draft.list_key),
            ...(draft.cta_url === null ? {} : { cta_url: draft.cta_url }),
            ...(draft.cta_label === null ? {} : { cta_label: draft.cta_label }),
        },
        app_url
    ).pipe(
        Effect.provideService(EmailPrincipal, {
            account_id: principal.account_id,
        }),
        Effect.mapError(() => newsletter_denied())
    )
    // `sendNewsletter` is content-addressed, so the ledger row is linked back
    // to its draft here; the column carries a composite foreign key.
    const db = yield* Sql
    yield* db.query(
        sql`UPDATE email_newsletter_sends SET draft_id=${draft.id}
            WHERE id=${send.id} AND domain_id=${principal.domain_id} AND draft_id IS NULL`
    )
    return yield* list_sends(principal.domain_id)
})

// --- Transactional templates and sending ----------------------------------
// Three auth copies per workspace, each an append-only version list with a
// separate pointer to the active version. Sending renders the active copy and
// records one delivery, keyed by request so a repeat never sends twice.

const transactional_denied = () =>
    new TransactionalWriteError({
        message:
            "The template is unavailable, was changed by someone else, or access was denied.",
    })

const StoredVersion = Schema.Struct({
    template_id: Schema.String,
    version: Schema.Number,
    copy: TransactionalCopy,
    created_at: Schema.Number,
    restored_from_version: Schema.NullOr(Schema.Number),
})

const template_states = (domain_id: string) =>
    Effect.gen(function* () {
        const latest = yield* query_rows(
            Schema.Struct({
                template_id: Schema.String,
                version: Schema.Number,
                copy: TransactionalCopy,
            }),
            sql`SELECT DISTINCT ON (template_id) template_id, version, copy
                FROM email_transactional_versions WHERE domain_id=${domain_id}
                ORDER BY template_id, version DESC`
        )
        const active = yield* query_rows(
            Schema.Struct({
                template_id: Schema.String,
                version: Schema.Number,
                copy: TransactionalCopy,
            }),
            sql`SELECT a.template_id, v.version, v.copy
                FROM email_transactional_active a
                JOIN email_transactional_versions v ON v.domain_id=a.domain_id
                    AND v.template_id=a.template_id AND v.version=a.active_version
                WHERE a.domain_id=${domain_id}`
        )
        return TRANSACTIONAL_TEMPLATE_IDS.map((template_id) => {
            const newest = latest.find((row) => row.template_id === template_id)
            const live = active.find((row) => row.template_id === template_id)
            return {
                template_id,
                latest:
                    newest === undefined
                        ? null
                        : { version: newest.version, copy: newest.copy },
                active:
                    live === undefined
                        ? null
                        : { version: live.version, copy: live.copy },
            }
        })
    })

const transactional_history = (
    domain_id: string,
    template_id: string,
    before_version: number | null
) =>
    Effect.gen(function* () {
        const rows = yield* query_rows(
            StoredVersion,
            sql`SELECT template_id, version, copy, created_at::float8 AS created_at, restored_from_version
                FROM email_transactional_versions
                WHERE domain_id=${domain_id} AND template_id=${template_id}
                    AND (${before_version}::integer IS NULL OR version < ${before_version})
                ORDER BY version DESC LIMIT ${TRANSACTIONAL_HISTORY_PAGE + 1}`
        )
        const page = rows.slice(0, TRANSACTIONAL_HISTORY_PAGE)
        return {
            versions: page.map((row) => ({
                version: row.version,
                copy: row.copy,
                created_at: row.created_at,
                restored_from_version: row.restored_from_version,
            })),
            next_before_version:
                rows.length > TRANSACTIONAL_HISTORY_PAGE
                    ? (page[page.length - 1]?.version ?? null)
                    : null,
        }
    })

const transactional_deliveries = (domain_id: string) =>
    query_rows(
        TransactionalDelivery,
        sql`SELECT id, contact_id, template_id, subject, status::text AS status,
            provider_status, to_domain, error_message,
            coalesce(is_test,false) AS is_test, purpose,
            created_at::float8 AS created_at, sent_at::float8 AS sent_at
            FROM email_deliveries
            WHERE domain_id=${domain_id} AND purpose='transactional'
            ORDER BY created_at DESC, id LIMIT ${TRANSACTIONAL_DELIVERY_LIMIT}`
    )

const load_transactional = Effect.fn("MailTransactional.load")(function* (
    principal: SubscriptionsPrincipal,
    history_template_id: string | null,
    before_version: number | null
) {
    yield* authorize(principal, false)
    const history =
        history_template_id === null
            ? { versions: [], next_before_version: null }
            : yield* transactional_history(
                  principal.domain_id,
                  history_template_id,
                  before_version
              )
    return TransactionalCatalogRecord.make({
        id: transactional_catalog_id(principal.domain_id),
        templates: yield* template_states(principal.domain_id),
        history: history.versions,
        history_template_id: Schema.decodeUnknownSync(
            Schema.NullOr(TransactionalTemplateId)
        )(history_template_id),
        next_before_version: history.next_before_version,
        deliveries: yield* transactional_deliveries(principal.domain_id),
    })
})

const change_transactional = Effect.fn("MailTransactional.change")(function* (
    principal: SubscriptionsPrincipal,
    input: TransactionalOperationInput
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            yield* authorize(principal, true)
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${domain_id} FOR UPDATE`
            )
            const now = Date.now()
            const latest = yield* query_rows(
                Schema.Struct({ version: Schema.Number }),
                sql`SELECT version FROM email_transactional_versions
                    WHERE domain_id=${domain_id} AND template_id=${input.template_id}
                    ORDER BY version DESC LIMIT 1`
            )
            const current = latest[0]?.version ?? null
            if (current !== input.expected_version)
                return yield* Effect.fail(transactional_denied())

            if (input.operation === "activate") {
                const active = yield* query_rows(
                    Schema.Struct({ active_version: Schema.Number }),
                    sql`SELECT active_version FROM email_transactional_active
                        WHERE domain_id=${domain_id} AND template_id=${input.template_id}`
                )
                const live = active[0]?.active_version ?? null
                if (live !== input.expected_active_version)
                    return yield* Effect.fail(transactional_denied())
                if (current === null)
                    return yield* Effect.fail(transactional_denied())
                yield* tx.query(
                    sql`INSERT INTO email_transactional_active (id,domain_id,template_id,active_version,updated_at,updated_by)
                        VALUES (${randomUUID()},${domain_id},${input.template_id},${current},${now},${principal.account_id})
                        ON CONFLICT (domain_id, template_id) DO UPDATE SET
                            active_version=excluded.active_version,
                            updated_at=excluded.updated_at,
                            updated_by=excluded.updated_by`
                )
                return yield* template_states(domain_id).pipe(
                    Effect.provideService(Sql, tx)
                )
            }

            // Save and restore both append a new version; restore copies an
            // earlier one and records where it came from.
            const copy =
                input.operation === "save"
                    ? input.copy
                    : yield* Effect.gen(function* () {
                          if (input.source_version === null)
                              return yield* Effect.fail(transactional_denied())
                          const source = yield* query_rows(
                              Schema.Struct({ copy: TransactionalCopy }),
                              sql`SELECT copy FROM email_transactional_versions
                                  WHERE domain_id=${domain_id} AND template_id=${input.template_id}
                                      AND version=${input.source_version}`
                          )
                          const found = source[0]
                          if (found === undefined)
                              return yield* Effect.fail(transactional_denied())
                          return found.copy
                      })
            if (copy === null) return yield* Effect.fail(transactional_denied())
            yield* tx.query(
                sql`INSERT INTO email_transactional_versions (id,domain_id,template_id,version,copy,restored_from_version,created_at,created_by)
                    VALUES (${randomUUID()},${domain_id},${input.template_id},${(current ?? 0) + 1},${JSON.stringify(copy)}::jsonb,${input.operation === "restore" ? input.source_version : null},${now},${principal.account_id})`
            )
            return yield* template_states(domain_id).pipe(
                Effect.provideService(Sql, tx)
            )
        })
    )
})

const send_transactional = Effect.fn("MailTransactional.send")(function* (
    principal: SubscriptionsPrincipal,
    input: SendTransactionalInput
) {
    yield* authorize(principal, true)
    const domain_id = principal.domain_id
    const recipients = yield* query_rows(
        Schema.Struct({ email: Schema.String, name: Schema.String }),
        sql`SELECT e.email, coalesce(c.name, e.email) AS name
            FROM contacts c
            JOIN domain_contacts dc ON dc.contact_id = c.id AND dc.domain_id = ${domain_id}
                AND dc.deleted_at IS NULL AND dc.status = 'active'
            JOIN LATERAL (SELECT email FROM contact_email_addresses WHERE contact_id = c.id
                ORDER BY is_primary DESC, updated_at DESC, id LIMIT 1) e ON true
            WHERE c.id = ${input.contact_id} AND c.deleted_at IS NULL`
    )
    const recipient = recipients[0]
    if (recipient === undefined)
        return yield* Effect.fail(transactional_denied())

    const states = yield* template_states(domain_id)
    const active =
        input.template_id === null
            ? null
            : (states.find((state) => state.template_id === input.template_id)
                  ?.active ?? null)
    const email =
        input.template_id === null
            ? input.subject === null || input.body_text === null
                ? yield* Effect.fail(transactional_denied())
                : {
                      to: { address: recipient.email, name: recipient.name },
                      subject: input.subject,
                      text: input.body_text,
                  }
            : {
                  ...transactionalTemplateTestEmail(
                      input.template_id,
                      recipient.email,
                      undefined,
                      active?.copy
                  ),
                  to: { address: recipient.email, name: recipient.name },
              }

    const idempotency_key = `${domain_id}:${input.request_id}`
    const existing = yield* query_rows(
        Schema.Struct({ id: Schema.String, status: Schema.String }),
        sql`SELECT id, status::text AS status FROM email_deliveries WHERE idempotency_key=${idempotency_key}`
    )
    const already = existing[0]
    // A repeat of the same request returns the recorded delivery untouched.
    if (already !== undefined) return already

    const delivery_id = randomUUID()
    const now = Date.now()
    const to_hash = createHash("sha256")
        .update(recipient.email.trim().toLowerCase())
        .digest("hex")
    const db = yield* Sql
    yield* db.query(
        sql`INSERT INTO email_deliveries (id,domain_id,contact_id,template_id,transactional_template_version,is_test,purpose,provider,status,to_hash,to_domain,subject,idempotency_key,created_at,updated_at)
            VALUES (${delivery_id},${domain_id},${input.contact_id},${input.template_id ?? "manual-transactional"},${active?.version ?? null},${input.template_id !== null},'transactional','cloudflare','pending',${to_hash},${recipient.email.split("@")[1] ?? null},${email.subject},${idempotency_key},${now},${now})`
    )
    const transport = yield* EmailTransport
    const result = yield* transport.send(email).pipe(
        Effect.catch(() =>
            db
                .query(
                    sql`UPDATE email_deliveries SET status='failed',failed_at=${Date.now()},updated_at=${Date.now()},
                        provider_status='unknown',error_class='OutcomeUnknown',
                        error_message='Provider outcome unknown. Do not retry automatically.' WHERE id=${delivery_id}`
                )
                .pipe(Effect.andThen(Effect.fail(transactional_denied())))
        )
    )
    const status = result.status === "skipped" ? "skipped" : "sent"
    yield* db.query(
        sql`UPDATE email_deliveries SET status=${status}::email_delivery_status,
            provider_message_id=${result.status === "sent" ? (result.message_id ?? null) : null},
            sent_at=${status === "sent" ? Date.now() : null},
            skipped_at=${status === "skipped" ? Date.now() : null},
            updated_at=${Date.now()} WHERE id=${delivery_id}`
    )
    return { id: delivery_id, status }
})

const make = Effect.gen(function* () {
    const db = yield* Sql
    const email_db = yield* EmailSql
    const transport = yield* EmailTransport
    const image_publisher = yield* NewsletterImagePublisher
    const config = yield* ServerConfig
    return {
        load_publication_theme: (principal: SubscriptionsPrincipal) =>
            load_publication_theme(principal).pipe(
                Effect.provideService(Sql, db)
            ),
        load_catalog: (principal: SubscriptionsPrincipal, list_key: string) =>
            load_catalog(principal, list_key).pipe(
                Effect.provideService(Sql, db)
            ),
        set_status: (
            principal: SubscriptionsPrincipal,
            input: SetSubscriptionInput
        ) => set_status(principal, input).pipe(Effect.provideService(Sql, db)),
        load_templates: (principal: SubscriptionsPrincipal) =>
            load_templates(principal).pipe(Effect.provideService(Sql, db)),
        save_template: (
            principal: SubscriptionsPrincipal,
            input: SaveNewsletterTemplateInput
        ) =>
            save_template(principal, input).pipe(
                Effect.provideService(Sql, db)
            ),
        load_newsletter: (
            principal: SubscriptionsPrincipal,
            list_key: string
        ) =>
            load_newsletter(principal, list_key).pipe(
                Effect.provideService(Sql, db)
            ),
        save_draft: (
            principal: SubscriptionsPrincipal,
            input: SaveNewsletterDraftInput
        ) => save_draft(principal, input).pipe(Effect.provideService(Sql, db)),
        delete_draft: (principal: SubscriptionsPrincipal, draft_id: string) =>
            delete_draft(principal, draft_id).pipe(
                Effect.provideService(Sql, db)
            ),
        load_transactional: (
            principal: SubscriptionsPrincipal,
            history_template_id: string | null,
            before_version: number | null
        ) =>
            load_transactional(
                principal,
                history_template_id,
                before_version
            ).pipe(Effect.provideService(Sql, db)),
        change_transactional: (
            principal: SubscriptionsPrincipal,
            input: TransactionalOperationInput
        ) =>
            change_transactional(principal, input).pipe(
                Effect.provideService(Sql, db)
            ),
        send_transactional: (
            principal: SubscriptionsPrincipal,
            input: SendTransactionalInput
        ) =>
            send_transactional(principal, input).pipe(
                Effect.provideService(Sql, db),
                Effect.provideService(EmailTransport, transport)
            ),
        send_newsletter: (
            principal: SubscriptionsPrincipal,
            input: SendNewsletterInput
        ) =>
            send_newsletter_draft(principal, input, config.appUrl).pipe(
                Effect.provideService(Sql, db),
                Effect.provideService(EmailSql, email_db),
                Effect.provideService(EmailTransport, transport),
                Effect.provideService(NewsletterImagePublisher, image_publisher)
            ),
    }
})

export class SubscriptionsRepository extends Context.Service<
    SubscriptionsRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/SubscriptionsRepository") {}

export const SubscriptionsRepositoryLive = Layer.effect(
    SubscriptionsRepository,
    make
)
