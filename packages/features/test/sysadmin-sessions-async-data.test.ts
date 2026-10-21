import { AsyncData } from "foldkit"
import { describe, expect, test } from "vitest"
import * as Message from "../src/sysadmin/platform/app.message.ts"
import { init, update } from "../src/sysadmin/platform/app.update.ts"
import type { SessionItem } from "../src/sysadmin/platform/app.model.ts"

const rows: ReadonlyArray<SessionItem> = [
    {
        id: "session_current",
        user_id: "user_1",
        status: "active",
        created_at: new Date(1),
    },
]
const loaded_payload = {
    sessions: rows,
    total: 1,
    has_more: false,
    scope_name: "Tenant A",
    can_view_all: true,
}
const loaded_model = () => {
    const [requested] = update(
        init("/sysadmin/sessions")[0],
        Message.RequestedSessions({ as_of: 1, request_id: "initial" })
    )
    return update(
        requested,
        Message.SucceededLoadSessions({
            ...loaded_payload,
            as_of: 1,
            request_id: "initial",
        })
    )[0]
}

describe("session AsyncData lifecycle", () => {
    test("refresh preserves loaded rows until its account response arrives", () => {
        const [refreshing, commands] = update(
            loaded_model(),
            Message.ClickedRefresh()
        )
        expect(refreshing.sessions).toEqual(
            AsyncData.Refreshing({ data: rows })
        )
        expect(commands.map((command) => command.name)).toEqual([
            "FetchSessions",
        ])
        const [requested] = update(
            refreshing,
            Message.RequestedSessions({ as_of: 100, request_id: "refresh" })
        )
        const [received] = update(
            requested,
            Message.SucceededLoadSessions({
                ...loaded_payload,
                as_of: 100,
                request_id: "refresh",
            })
        )
        expect(received.sessions).toEqual(AsyncData.Success({ data: rows }))
    })

    test("failed refresh retains data as stale and permits retry", () => {
        const [requested] = update(
            loaded_model(),
            Message.RequestedSessions({ as_of: 100, request_id: "refresh" })
        )
        const [failed] = update(
            requested,
            Message.FailedLoadSessions({
                as_of: 100,
                request_id: "refresh",
                error: "Account service unavailable",
            })
        )
        expect(failed.sessions).toEqual(
            AsyncData.Stale({
                data: rows,
                error: "Account service unavailable",
            })
        )
        const [retry, commands] = update(failed, Message.ClickedRefresh())
        expect(retry.sessions._tag).toBe("Refreshing")
        expect(commands).toHaveLength(1)
    })

    test("initial loading settles when the first account response arrives", () => {
        const [loading] = update(
            init("/sysadmin/sessions")[0],
            Message.RequestedSessions({ as_of: 100, request_id: "initial" })
        )
        expect(loading.sessions._tag).toBe("Loading")
        const [received] = update(
            loading,
            Message.SucceededLoadSessions({
                ...loaded_payload,
                as_of: 100,
                request_id: "initial",
            })
        )
        expect(received.sessions._tag).toBe("Success")
    })

    test("scope changes discard previous data and ignore an older response", () => {
        const [requested] = update(
            loaded_model(),
            Message.RequestedSessions({ as_of: 100, request_id: "old" })
        )
        const [scoped] = update(
            requested,
            Message.UpdatedSessionScope({ all_tenants: true })
        )
        expect(AsyncData.hasData(scoped.sessions)).toBe(false)
        const [next] = update(
            scoped,
            Message.RequestedSessions({ as_of: 200, request_id: "new" })
        )
        const [ignored] = update(
            next,
            Message.FailedLoadSessions({
                as_of: 100,
                request_id: "old",
                error: "Old request failed",
            })
        )
        expect(ignored).toBe(next)
    })

    test("a second refresh while pending does not issue another request", () => {
        const [requested] = update(
            loaded_model(),
            Message.RequestedSessions({ as_of: 100, request_id: "pending" })
        )
        expect(update(requested, Message.ClickedRefresh())[1]).toEqual([])
    })
})
