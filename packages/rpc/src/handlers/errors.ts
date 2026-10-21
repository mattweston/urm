/**
 * # Handler Errors
 *
 * The cause is deliberately dropped: an unexpected failure can carry a
 * connection string, and this has no way to tell a safe one from a dangerous
 * one. Used by the read-only groups (audit, studio, observability-log), where
 * there is nothing to distinguish.
 */

import { DatabaseError } from "@urm/domain/errors"

export const databaseError = (message: string) => (_error: unknown) =>
    new DatabaseError({ message })

export const repositoryError = (error: unknown): DatabaseError =>
    new DatabaseError({
        message: error instanceof Error ? error.message : String(error),
    })
