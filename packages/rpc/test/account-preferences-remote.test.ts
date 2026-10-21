import { Effect, Layer } from "effect"
import { REMOTE_PROTOCOL_VERSION } from "foldkit-remote"
import { RemoteServer } from "foldkit-remote-server"
import { describe, expect, it } from "vitest"
import {
    AccountNavigation,
    AccountPreferences,
} from "@urm/contracts/account-preferences"
import { DEFAULT_SPOTIFY_PLAYLIST_ID } from "@urm/domain/schemas/settings"
import { AccountPreferencesRepository } from "../src/handlers/account-preferences/repository.ts"
import { AccountPreferencesServer } from "../src/handlers/account-preferences/remote.ts"

const principal = {
    account_id: "account-one",
    contact_id: null,
    session_id: "session-one",
    domain_id: "domain-one",
}
const snapshot: typeof AccountPreferences.Type = {
    id: principal.account_id,
    appearance: {
        theme: "light",
        font: "theme",
        code_font: "theme",
        is_saved: false,
    },
    spotify: { playlist_id: DEFAULT_SPOTIFY_PLAYLIST_ID, is_saved: false },
}
const navigation: typeof AccountNavigation.Type = {
    id: "account-one/domain-one",
    domain_id: "domain-one",
    sidebar_order: ["Stats", "Settings"],
    hidden_modules: [],
    enabled_modules: ["Mail"],
    can_manage_modules: true,
}
const repository = Layer.mock(AccountPreferencesRepository, {
    load: () => Effect.succeed(snapshot),
    load_navigation: () => Effect.succeed(navigation),
    save_appearance: (_principal, value) => Effect.succeed(value),
    save_spotify: (_principal, playlist_id) => Effect.succeed({ playlist_id }),
    save_sidebar: () => Effect.succeed(navigation),
    save_modules: () => Effect.succeed(navigation),
})
const handlers = RemoteServer.handlers(AccountPreferencesServer, principal)

describe("account preferences Remote boundary", () => {
    it("reads only the authenticated account's snapshot", async () => {
        const allowed = await Effect.runPromise(
            handlers
                .FoldkitRemoteRead({
                    version: REMOTE_PROTOCOL_VERSION,
                    requests: [
                        {
                            entity: "AccountPreferences",
                            id: principal.account_id,
                            fields: ["id", "appearance", "spotify"],
                        },
                    ],
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(allowed)).toContain(DEFAULT_SPOTIFY_PLAYLIST_ID)
        const denied = await Effect.runPromise(
            handlers
                .FoldkitRemoteRead({
                    version: REMOTE_PROTOCOL_VERSION,
                    requests: [
                        {
                            entity: "AccountPreferences",
                            id: "account-two",
                            fields: ["id"],
                        },
                    ],
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(denied._tag).toBe("Failure")
    })

    it("rejects forged account and workspace mutation inputs", async () => {
        const input = {
            domain_id: principal.domain_id,
            account_id: principal.account_id,
            theme: "dark",
            font: "inter",
            code_font: "theme",
        }
        const allowed = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "save-appearance-one",
                    mutation: "SaveAccountAppearance",
                    input,
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(allowed)).toContain("dark")
        for (const forged of [
            { ...input, account_id: "account-two" },
            { ...input, domain_id: "domain-two" },
        ]) {
            const denied = await Effect.runPromise(
                handlers
                    .FoldkitRemoteMutate({
                        requestId: `forged-${forged.account_id}-${forged.domain_id}`,
                        mutation: "SaveAccountAppearance",
                        input: forged,
                    })
                    .pipe(Effect.result, Effect.provide(repository))
            )
            expect(denied._tag).toBe("Failure")
        }
    })

    it("scopes navigation reads and module writes to this account and domain", async () => {
        const allowed = await Effect.runPromise(
            handlers
                .FoldkitRemoteRead({
                    version: REMOTE_PROTOCOL_VERSION,
                    requests: [
                        {
                            entity: "AccountNavigation",
                            id: navigation.id,
                            fields: ["id", "enabled_modules"],
                        },
                    ],
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(allowed)).toContain("Mail")
        const foreign = await Effect.runPromise(
            handlers
                .FoldkitRemoteRead({
                    version: REMOTE_PROTOCOL_VERSION,
                    requests: [
                        {
                            entity: "AccountNavigation",
                            id: "account-two/domain-one",
                            fields: ["id"],
                        },
                    ],
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(foreign._tag).toBe("Failure")
        const forged = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "forged-navigation",
                    mutation: "SaveAccountModules",
                    input: {
                        account_id: "account-two",
                        domain_id: "domain-one",
                        enabled_modules: [],
                    },
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(forged._tag).toBe("Failure")
    })
})
