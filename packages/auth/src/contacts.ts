/**
 * # Contacts
 *
 * The single identity every auth path resolves to, keyed on email.
 */
import { Effect } from "effect"
import * as Schema from "effect/Schema"
import { eq } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"
import { schema, relations } from "@urm/database"
import type { EffectPgDatabase } from "drizzle-orm/effect-postgres"

export type Contact = typeof schema.contacts.$inferSelect

export class GetOrCreateContactError extends Schema.TaggedError<GetOrCreateContactError>()(
    "GetOrCreateContactError",
    {
        message: Schema.String,
        email: Schema.String,
    }
) {}

export function getOrCreateContactFromDatabase(
    db: EffectPgDatabase<typeof relations>,
    _contactsTable: PgTable,
    email: string,
    name?: string,
    _providerAccountId?: string,
    image?: string,
    emailVerified = false
): Effect.Effect<Contact, GetOrCreateContactError> {
    return Effect.gen(function* () {
        // Exact, case-sensitive match with no normalisation. Google returns
        // lowercase claims, so a contact stored with mixed case will not match
        // and a second contact gets created for the same person — with its own
        // sessions and domain memberships, and nothing linking the two.
        const contactQueryResult = yield* db
            .select()
            .from(schema.contacts)
            .where(eq(schema.contacts.email, email))
            .limit(1)
            .pipe(
                Effect.catchCause(
                    (cause): Effect.Effect<never, GetOrCreateContactError> =>
                        Effect.fail(
                            new GetOrCreateContactError({
                                message: `Contact query failed: ${cause}`,
                                email,
                            })
                        )
                )
            )

        const existingContact = contactQueryResult[0]
        if (existingContact !== undefined) {
            return existingContact
        }

        const displayName = name || email.split("@")[0] || email
        const now = Date.now()

        const contactId = crypto.randomUUID()

        const contactValues: typeof schema.contacts.$inferInsert = {
            id: contactId,
            email,
            name: displayName,
            image: image ?? null,
            email_verified: emailVerified,
            is_test_contact: false,
            created_at: now,
            updated_at: now,
        }

        const insertResult = yield* db
            .insert(schema.contacts)
            .values(contactValues)
            .returning()
            .pipe(
                Effect.catchCause(
                    (cause): Effect.Effect<never, GetOrCreateContactError> =>
                        Effect.fail(
                            new GetOrCreateContactError({
                                message: `Contact creation failed: ${cause}`,
                                email,
                            })
                        )
                )
            )

        const contact = insertResult[0]
        if (contact !== undefined) {
            return contact
        }

        return yield* Effect.fail(
            new GetOrCreateContactError({
                message: "Contact creation failed or returned empty result",
                email,
            })
        )
    })
}
