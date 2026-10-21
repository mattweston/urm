import { sql } from "drizzle-orm"
import * as Effect from "effect/Effect"
import {
    DatabaseOperationError,
    databaseOperationError,
} from "../database-operation-error.ts"
import { DB } from "../services/database-service.ts"

export type DomainContactProfileBackfillOptions = Readonly<{
    readonly batch_size: number
    readonly max_batches: number
}>

export type DomainContactProfileBackfillResult = Readonly<{
    readonly batches: number
    readonly rows_updated: number
    readonly stopped: "exhausted" | "batch_limit"
}>

export const domainContactProfileBackfillDefaults: DomainContactProfileBackfillOptions =
    {
        batch_size: 250,
        max_batches: 20,
    }

type UpdatedDomainContactProfile = Readonly<{
    readonly id: string
}>

/**
 * Runs an externally supplied bounded batch operation until it finds no more
 * work or reaches the caller-supplied batch limit.
 */
export const runDomainContactProfileBackfill = <E, R>(
    options: DomainContactProfileBackfillOptions,
    run_batch: (batch_size: number) => Effect.Effect<number, E, R>
): Effect.Effect<DomainContactProfileBackfillResult, E, R> =>
    Effect.gen(function* () {
        let batches = 0
        let rows_updated = 0

        while (batches < options.max_batches) {
            const updated = yield* run_batch(options.batch_size)
            batches += 1
            rows_updated += updated

            if (updated < options.batch_size) {
                return { batches, rows_updated, stopped: "exhausted" }
            }
        }

        return { batches, rows_updated, stopped: "batch_limit" }
    })

const updateDomainContactProfileBatch = (batch_size: number) =>
    Effect.gen(function* () {
        const db = yield* DB
        const { rows } = yield* db.execute<UpdatedDomainContactProfile>(sql`
            WITH candidates AS (
                SELECT domain_contact.id, NULLIF(BTRIM(contact.name), '') AS display_name
                FROM domain_contacts AS domain_contact
                INNER JOIN contacts AS contact
                    ON contact.id = domain_contact.contact_id
                WHERE domain_contact.deleted_at IS NULL
                    AND domain_contact.display_name IS NULL
                    AND contact.deleted_at IS NULL
                    AND NULLIF(BTRIM(contact.name), '') IS NOT NULL
                ORDER BY domain_contact.id
                FOR UPDATE OF domain_contact SKIP LOCKED
                LIMIT ${batch_size}
            )
            UPDATE domain_contacts AS domain_contact
            SET display_name = candidates.display_name,
                updated_at = NOW()
            FROM candidates
            WHERE domain_contact.id = candidates.id
            RETURNING domain_contact.id
        `)

        return rows.length
    })

/**
 * Backfills empty domain-contact profile names in bounded, lock-skipping
 * batches. It is safe to repeat and never overwrites an existing profile name.
 */
export const backfillDomainContactProfiles = (
    options: DomainContactProfileBackfillOptions = domainContactProfileBackfillDefaults
): Effect.Effect<
    DomainContactProfileBackfillResult,
    DatabaseOperationError,
    DB
> =>
    runDomainContactProfileBackfill(
        options,
        updateDomainContactProfileBatch
    ).pipe(
        Effect.mapError((cause) =>
            databaseOperationError(
                "DomainContactProfileBackfill.run",
                "Failed to update domain-contact profiles",
                cause
            )
        )
    )
