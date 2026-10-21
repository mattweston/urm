#!/usr/bin/env tsx

import * as Effect from "effect/Effect"
import {
    backfillDomainContactProfiles,
    domainContactProfileBackfillDefaults,
} from "../src/jobs/domain-contact-profile-backfill.ts"
import { DatabaseLive } from "../src/services/database-selector.ts"

const program = backfillDomainContactProfiles().pipe(
    Effect.provide(DatabaseLive)
)

Effect.runPromise(program)
    .then((result) => {
        console.log(
            `Domain-contact profile backfill updated ${result.rows_updated} rows in ${result.batches} batches; stopped: ${result.stopped}.`
        )

        if (result.stopped === "batch_limit") {
            console.log(
                `Run again to continue. Each run processes at most ${domainContactProfileBackfillDefaults.batch_size * domainContactProfileBackfillDefaults.max_batches} rows.`
            )
        }
    })
    .catch((error: unknown) => {
        console.error("Domain-contact profile backfill failed", error)
        process.exitCode = 1
    })
