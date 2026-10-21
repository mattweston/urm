#!/usr/bin/env tsx
/**
 * Operations-only lifecycle controls for disposable demo workspaces.
 *
 * This command requires an `IS_DEMO=true` process. `DatabaseLive` then selects
 * only `DATABASE_URL_DEMO`; it cannot run against the normal database.
 *
 * Usage:
 *
 *   pnpm --filter @urm/db demo:workspaces -- expire
 *   pnpm --filter @urm/db demo:workspaces -- reset <contact-id> --confirm-reset=<contact-id>
 *   pnpm --filter @urm/db demo:workspaces -- purge --confirm-purge
 */

import {
    DatabaseLive,
    databaseOperationError,
    expireDemoWorkspaces,
    loadEnvironmentConfig,
    purgeExpiredDemoWorkspaces,
    resetDemoWorkspace,
} from "@urm/db"
import { Effect } from "effect"

type LifecycleCommand =
    | Readonly<{ kind: "expire" }>
    | Readonly<{ kind: "reset"; contact_id: string }>
    | Readonly<{ kind: "purge" }>

const usage = (): Error =>
    new Error(
        "Usage: pnpm --filter @urm/db demo:workspaces -- expire | reset <contact-id> --confirm-reset=<contact-id> | purge --confirm-purge"
    )

const parseCommand = (
    arguments_: ReadonlyArray<string>
): LifecycleCommand | Error => {
    const command = arguments_[0]

    if (command === "expire") {
        return { kind: "expire" }
    }

    if (command === "purge") {
        return arguments_.includes("--confirm-purge")
            ? { kind: "purge" }
            : new Error(
                  "Pass --confirm-purge to permanently delete expired demo workspaces"
              )
    }

    const contact_id = arguments_[1]

    if (
        command === "reset" &&
        contact_id !== undefined &&
        arguments_.includes(`--confirm-reset=${contact_id}`)
    ) {
        return { kind: "reset", contact_id }
    }

    return usage()
}

const runCommand = (command: LifecycleCommand) =>
    Effect.gen(function* () {
        const environment = yield* loadEnvironmentConfig

        if (!environment.is_demo) {
            return yield* Effect.fail(
                databaseOperationError(
                    "DemoWorkspaceLifecycle.run",
                    "Demo workspace lifecycle commands require IS_DEMO=true"
                )
            )
        }

        switch (command.kind) {
            case "expire": {
                const expired_count = yield* expireDemoWorkspaces()
                console.log(`Expired ${expired_count} demo workspace(s).`)
                return
            }
            case "reset": {
                const workspace = yield* resetDemoWorkspace(command.contact_id)
                console.log(
                    `Reset demo workspace ${workspace.workspace_id} for ${command.contact_id}.`
                )
                return
            }
            case "purge": {
                const purged_count = yield* purgeExpiredDemoWorkspaces()
                console.log(
                    `Permanently purged ${purged_count} expired demo workspace(s).`
                )
                return
            }
        }
    })

const command = parseCommand(process.argv.slice(2))

if (command instanceof Error) {
    console.error(command.message)
    process.exit(1)
}

Effect.runPromise(runCommand(command).pipe(Effect.provide(DatabaseLive)))
    .then(() => process.exit(0))
    .catch((error: unknown) => {
        console.error("Demo workspace lifecycle command failed.")
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
    })
