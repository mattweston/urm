import { Effect, Option } from "effect"
import { vi } from "vitest"
import { play } from "cuelume"
import * as Console from "./publishing-legacy.ts"
vi.mock("cuelume", () => ({ play: vi.fn() }))
import { Remote } from "foldkit-remote"
import { describe, expect, test } from "vitest"
import * as Publishing from "./publishing-console.ts"
const account = { account_id: "account", domain_id: "domain", can_write: true }
describe("PostgreSQL publishing state", () => {
    test("loads once, clears account scope and rejects late results", () => {
        const [model, commands] = Publishing.synchronize(
            Publishing.init(),
            account
        )
        expect(commands[0]?.name).toBe("ReadOrBuildPublication")
        expect(Publishing.synchronize(model, account)[1]).toEqual([])
        const next = Publishing.clear(model)
        expect(next.epoch).toBeGreaterThan(model.epoch)
        expect(
            Publishing.update(next, {
                _tag: "PublishingLoaded",
                epoch: model.epoch,
                remote: Remote.initial,
                built: true,
                job_id: null,
            })[0]
        ).toBe(next)
    })
    test("blocks build until loaded and leaves deployment controls unavailable", () => {
        const [model] = Publishing.synchronize(Publishing.init(), account)
        expect(Publishing.update(model, { _tag: "RequestedBuild" })[1]).toEqual(
            []
        )
        expect(Publishing.project(model).can_deploy).toBe(false)
        expect(
            Publishing.update(model, {
                _tag: "SelectedOwner",
                subdomain_id: "unknown",
            })[0]
        ).toBe(model)
    })
})

describe("retained publishing feedback", () => {
    test("success shows the toast and plays the original success cue", async () => {
        const [model, commands] = Console.success_feedback(
            Console.init(),
            "Release build complete",
            "Ready"
        )
        expect(JSON.stringify(model.toast)).toContain("Release build complete")
        const audio = commands.find(
            (command) => command.name === "PlayDeploymentSuccessAudio"
        )
        if (audio === undefined) throw new Error("Missing success audio")
        expect((await Effect.runPromise(audio.effect))._tag).toBe(
            "CompletedSuccessAudio"
        )
        expect(play).toHaveBeenCalledWith("success")
        expect(commands.length).toBeGreaterThan(1)
    })
    test("failed polling keeps a scoped retry and switching owners discards it", () => {
        const model = {
            ...Publishing.init(),
            ...account,
            watched_job: "job",
            pending: true,
        }
        const [failed, commands] = Publishing.update(model, {
            _tag: "PublishingFailed",
            epoch: model.epoch,
            error: "Disconnected",
        })
        expect(failed.pending).toBe(false)
        expect(failed.ui.error).toEqual(Option.some("Disconnected"))
        expect(commands[0]?.name).toBe("WaitForPublication")
        const next = Publishing.clear(failed)
        expect(
            Publishing.update(next, {
                _tag: "PollPublishing",
                epoch: model.epoch,
                token: model.poll_token,
            })
        ).toEqual([next, []])
    })
})
