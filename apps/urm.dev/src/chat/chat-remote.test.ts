import { Option } from "effect"
import { Scene } from "foldkit"
import { describe, expect, test } from "vitest"

import * as Chat from "./chat-ui.ts"
import * as DesktopChat from "./submodel.ts"

const scope = { account_id: "account", domain_id: "domain", can_write: true }

const loaded = (model: DesktopChat.Model): DesktopChat.Model => {
    const [next] = DesktopChat.update(model, DesktopChat.Refreshed())
    const [ready] = DesktopChat.update(next, {
        _tag: "ChatLoaded",
        epoch: next.epoch,
        generation: next.generation,
        remote: next.remote,
    })
    return ready
}

describe("PostgreSQL admin chat state", () => {
    test("polls only for an authorized workspace administrator", () => {
        const read_only = DesktopChat.synchronize(DesktopChat.init(), {
            ...scope,
            can_write: false,
        })
        const [unchanged, denied_commands] = DesktopChat.update(
            read_only,
            DesktopChat.Refreshed()
        )

        expect(DesktopChat.project(read_only).can_send).toBe(false)
        expect(DesktopChat.project(read_only).status).toBe(
            "Administrator access required"
        )
        expect(denied_commands).toEqual([])
        expect(unchanged).toBe(read_only)

        const administrator = DesktopChat.synchronize(DesktopChat.init(), scope)
        const [loading, commands] = DesktopChat.update(
            administrator,
            DesktopChat.Refreshed()
        )

        expect(loading.loading).toBe(true)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("LoadChat")
        expect(commands[0]?.args).toEqual({
            account_id: "account",
            domain_id: "domain",
            epoch: administrator.epoch,
            generation: administrator.generation,
        })
    })

    test("one poll is in flight at a time", () => {
        const [loading] = DesktopChat.update(
            DesktopChat.synchronize(DesktopChat.init(), scope),
            DesktopChat.Refreshed()
        )
        const [same, commands] = DesktopChat.update(
            loading,
            DesktopChat.Refreshed()
        )

        expect(same).toBe(loading)
        expect(commands).toEqual([])
    })

    test("a workspace change rejects the response of the previous scope", () => {
        const first = DesktopChat.synchronize(DesktopChat.init(), scope)
        const [loading] = DesktopChat.update(first, DesktopChat.Refreshed())
        const switched = DesktopChat.synchronize(loading, {
            ...scope,
            domain_id: "other-domain",
        })
        const [ignored] = DesktopChat.update(switched, {
            _tag: "ChatLoaded",
            epoch: loading.epoch,
            generation: loading.generation,
            remote: loading.remote,
        })

        expect(switched.domain_id).toBe("other-domain")
        expect(switched.loading).toBe(false)
        expect(ignored).toBe(switched)
        expect(ignored.loaded).toBe(false)
    })

    test("leaving the workspace clears the scope and its draft", () => {
        const drafted = (() => {
            const [next] = DesktopChat.update(
                loaded(DesktopChat.synchronize(DesktopChat.init(), scope)),
                Chat.ChangedChatDraft({ value: "Hello admins" })
            )
            return next
        })()
        const cleared = DesktopChat.synchronize(drafted, null)

        expect(drafted.ui.draft).toBe("Hello admins")
        expect(cleared.domain_id).toBe("")
        expect(cleared.ui.draft).toBe("")
        expect(cleared.epoch).toBe(drafted.epoch + 1)
    })

    test("a send is prepared once and retried under the same identity", () => {
        const ready = loaded(DesktopChat.synchronize(DesktopChat.init(), scope))
        const [drafted] = DesktopChat.update(
            ready,
            Chat.ChangedChatDraft({ value: "  Hello admins  " })
        )
        const [sending, prepare_commands] = DesktopChat.update(
            drafted,
            Chat.SubmittedChatMessage()
        )

        expect(sending.ui.sending).toBe(true)
        expect(prepare_commands).toHaveLength(1)
        expect(prepare_commands[0]?.name).toBe("PrepareChatSend")
        expect(prepare_commands[0]?.args).toMatchObject({
            body: "Hello admins",
            id: "",
            mentioned_user_ids: [],
        })

        const message = {
            id: "message-1",
            body: "Hello admins",
            mentioned_user_ids: [],
        }
        const [prepared, send_commands] = DesktopChat.update(sending, {
            _tag: "ChatSendPrepared",
            epoch: sending.epoch,
            generation: sending.generation,
            message,
        })

        expect(prepared.send_id).toBe("message-1")
        expect(send_commands).toHaveLength(1)
        expect(send_commands[0]?.name).toBe("SendChatMessage")
        expect(send_commands[0]?.args).toMatchObject({ message })

        const [failed] = DesktopChat.update(prepared, {
            _tag: "ChatSaved",
            epoch: prepared.epoch,
            generation: prepared.generation,
            message: {
                _tag: "MutationFailed",
                requestId: message.id,
                error: {
                    _tag: "ChatSendFailed",
                    message: "Message could not be confirmed.",
                },
            },
        })

        expect(failed.ui.sending).toBe(false)
        expect(Option.getOrNull(failed.ui.maybe_error)).toBe(
            "Message could not be confirmed."
        )
        expect(failed.send_id).toBe("message-1")

        const [retried, retry_commands] = DesktopChat.update(
            failed,
            Chat.SubmittedChatMessage()
        )

        expect(retried.ui.sending).toBe(true)
        expect(retry_commands[0]?.args).toMatchObject({ id: "message-1" })
    })

    test("editing the draft after a failure sends a new message identity", () => {
        const ready = loaded(DesktopChat.synchronize(DesktopChat.init(), scope))
        const [drafted] = DesktopChat.update(
            ready,
            Chat.ChangedChatDraft({ value: "First" })
        )
        const [sending] = DesktopChat.update(
            drafted,
            Chat.SubmittedChatMessage()
        )
        const [prepared] = DesktopChat.update(sending, {
            _tag: "ChatSendPrepared",
            epoch: sending.epoch,
            generation: sending.generation,
            message: {
                id: "message-1",
                body: "First",
                mentioned_user_ids: [],
            },
        })
        const [failed] = DesktopChat.update(prepared, {
            _tag: "ChatSaved",
            epoch: prepared.epoch,
            generation: prepared.generation,
            message: {
                _tag: "MutationFailed",
                requestId: "message-1",
                error: { _tag: "ChatSendFailed", message: "Unavailable" },
            },
        })
        const [edited] = DesktopChat.update(
            failed,
            Chat.ChangedChatDraft({ value: "Second" })
        )

        expect(edited.send_id).toBe("")
    })

    test("a failed load offers a retry without claiming loaded data", () => {
        const [loading] = DesktopChat.update(
            DesktopChat.synchronize(DesktopChat.init(), scope),
            DesktopChat.Refreshed()
        )
        const [failed] = DesktopChat.update(loading, {
            _tag: "ChatLoadFailed",
            epoch: loading.epoch,
            generation: loading.generation,
        })

        expect(failed.loading).toBe(false)
        expect(failed.loaded).toBe(false)
        expect(DesktopChat.project(failed).status).toBe(
            "Chat unavailable — refresh to retry"
        )
        // A pending or failed load must not disable the composer, as it did
        // before the catalog was reachable.
        expect(DesktopChat.project(failed).can_send).toBe(true)
        const [loading_again] = DesktopChat.update(
            DesktopChat.synchronize(DesktopChat.init(), scope),
            DesktopChat.Refreshed()
        )
        expect(DesktopChat.project(loading_again).can_send).toBe(true)
        expect(DesktopChat.project(loading_again).status).toBe("Loading chat")
    })

    test("renders the composer and the refresh control", () => {
        const ready = loaded(DesktopChat.synchronize(DesktopChat.init(), scope))

        Scene.scene(
            {
                update: (model: DesktopChat.Model, message) => {
                    const [next, commands] = DesktopChat.update(model, message)
                    return { model: next, commands }
                },
                view: DesktopChat.view,
            },
            Scene.given(ready),
            Scene.expect(
                Scene.role("heading", { name: "Admin chat" })
            ).toExist(),
            Scene.expect(
                Scene.role("button", { name: "Refresh chat" })
            ).toExist(),
            Scene.expect(Scene.role("button", { name: "@urmbot" })).toExist()
        )
    })
})
