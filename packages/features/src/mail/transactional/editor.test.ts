import { expect, test } from "vitest"
import {
    default_transactional_copy,
    type TransactionalTemplateState,
} from "@urm/email/transactional-content"
import {
    init,
    update,
    LoadedTransactionalTemplates,
    ChangedTransactionalCopy,
    ToggledTransactionalEditing,
    SaveTransactionalCopy,
    ActivateTransactionalCopy,
    CompletedTransactionalCopy,
    FailedTransactionalCopy,
    ReloadTransactionalCopy,
    RestoreTransactionalCopy,
    RequestedTransactionalHistory,
    LoadedTransactionalHistory,
    FailedTransactionalHistory,
} from "./editor.ts"

const template_id = "auth_password_reset"
const state: TransactionalTemplateState = {
    template_id,
    latest: { version: 1, copy: default_transactional_copy(template_id) },
    active: null,
}
test("loads history without replacing edits and rejects stale history responses", () => {
    const [loaded] = update(
        init("domain-a"),
        LoadedTransactionalTemplates({ states: [state] })
    )
    const [dirty] = update(
        loaded,
        ChangedTransactionalCopy({
            template_id,
            field: "subject",
            value: "Unsaved",
        })
    )
    const [loading, commands] = update(
        dirty,
        RequestedTransactionalHistory({ template_id, older: false })
    )
    expect(commands[0]?.name).toBe("LoadTransactionalHistory")
    expect(commands[0]?.args).toMatchObject({
        domain_id: "domain-a",
        template_id,
        before_version: null,
    })
    const request_id =
        loading.editors.find((editor) => editor.template_id === template_id)
            ?.history.request_id ?? -1
    const entry = {
        version: 1,
        copy: default_transactional_copy(template_id),
        created_at: 1,
        restored_from_version: null,
    }
    const response: Omit<typeof LoadedTransactionalHistory.Type, "_tag"> = {
        domain_id: "domain-a",
        template_id,
        request_id,
        before_version: null,
        page: { versions: [entry], next_before_version: 1 },
    }
    expect(
        update(
            loading,
            LoadedTransactionalHistory({ ...response, domain_id: "domain-b" })
        )[0]
    ).toEqual(loading)
    expect(
        update(
            loading,
            LoadedTransactionalHistory({
                ...response,
                request_id: request_id - 1,
            })
        )[0]
    ).toEqual(loading)
    const [history] = update(loading, LoadedTransactionalHistory(response))
    expect(
        history.editors.find((editor) => editor.template_id === template_id)
    ).toMatchObject({
        dirty: true,
        copy: { subject: "Unsaved" },
        history: { loaded: true, versions: [entry] },
    })
    expect(
        update(
            history,
            RestoreTransactionalCopy({ template_id, source_version: 1 })
        )[1]
    ).toEqual([])
    const [older, older_commands] = update(
        history,
        RequestedTransactionalHistory({ template_id, older: true })
    )
    expect(older_commands[0]?.args).toMatchObject({ before_version: 1 })
    const [failed] = update(
        older,
        FailedTransactionalHistory({
            ...response,
            request_id: request_id + 1,
            before_version: 1,
            error: "Offline",
        })
    )
    expect(
        failed.editors.find((editor) => editor.template_id === template_id)
            ?.history
    ).toMatchObject({ loading: false, error: "Offline", versions: [entry] })
})

test("restoration uses optimistic concurrency and never automatically activates", () => {
    const [loaded] = update(
        init("domain-a"),
        LoadedTransactionalTemplates({ states: [state] })
    )
    expect(
        update(
            loaded,
            RestoreTransactionalCopy({ template_id, source_version: 99 })
        )[1]
    ).toEqual([])
    const [restoring, commands] = update(
        loaded,
        RestoreTransactionalCopy({ template_id, source_version: 0 })
    )
    expect(commands[0]?.args).toMatchObject({
        operation: "restore",
        expected_version: 1,
        source_version: 0,
    })
    expect(
        update(
            restoring,
            RestoreTransactionalCopy({ template_id, source_version: 0 })
        )[1]
    ).toEqual([])
    const [restored, next_commands] = update(
        restoring,
        CompletedTransactionalCopy({
            domain_id: "domain-a",
            state: {
                ...state,
                latest: {
                    version: 2,
                    copy: default_transactional_copy(template_id),
                },
            },
        })
    )
    expect(next_commands).toEqual([])
    expect(restored.states[0]?.active).toBeNull()
    expect(
        restored.editors.find((editor) => editor.template_id === template_id)
    ).toMatchObject({
        dirty: false,
        busy: false,
        base_version: 2,
        history: { loaded: false },
    })
    expect(
        update(restored, ActivateTransactionalCopy({ template_id }))[1][0]?.args
    ).toMatchObject({ operation: "activate", expected_version: 2 })
})

test("switches between inline editing and preview without saving or losing edits", () => {
    const [loaded] = update(
        init("domain-a"),
        LoadedTransactionalTemplates({ states: [state] })
    )
    const [dirty] = update(
        loaded,
        ChangedTransactionalCopy({
            template_id,
            field: "heading",
            value: "Draft heading",
        })
    )
    const [preview, commands] = update(
        dirty,
        ToggledTransactionalEditing({ template_id })
    )
    expect(commands).toEqual([])
    expect(
        preview.editors.find((editor) => editor.template_id === template_id)
    ).toMatchObject({
        editing: false,
        dirty: true,
        copy: { heading: "Draft heading" },
    })
    const [editing] = update(
        preview,
        ToggledTransactionalEditing({ template_id })
    )
    expect(editing).toEqual(dirty)
    const [reloaded] = update(preview, ReloadTransactionalCopy({ template_id }))
    expect(
        reloaded.editors.find((editor) => editor.template_id === template_id)
    ).toMatchObject({ editing: false, dirty: false })
})
test("keeps dirty edits and their base version when remote versions change", () => {
    const [loaded] = update(
        init("domain-a"),
        LoadedTransactionalTemplates({ states: [state] })
    )
    const [dirty] = update(
        loaded,
        ChangedTransactionalCopy({
            template_id,
            field: "subject",
            value: "My subject",
        })
    )
    const [remote] = update(
        dirty,
        LoadedTransactionalTemplates({
            states: [
                {
                    ...state,
                    latest: {
                        version: 2,
                        copy: default_transactional_copy(template_id),
                    },
                },
            ],
        })
    )
    const editor = remote.editors.find(
        (editor) => editor.template_id === template_id
    )
    expect(editor).toMatchObject({
        base_version: 1,
        dirty: true,
        copy: { subject: "My subject" },
    })
    expect(
        update(remote, ActivateTransactionalCopy({ template_id }))[1]
    ).toHaveLength(0)
    const [saving, commands] = update(
        remote,
        SaveTransactionalCopy({ template_id })
    )
    expect(commands[0]?.args).toMatchObject({
        expected_version: 1,
        operation: "save",
    })
    expect(
        update(
            saving,
            ChangedTransactionalCopy({
                template_id,
                field: "subject",
                value: "During save",
            })
        )[0]
    ).toEqual(saving)
    const [failed] = update(
        saving,
        FailedTransactionalCopy({
            domain_id: "domain-a",
            template_id,
            error: "Conflict",
        })
    )
    expect(
        failed.editors.find((editor) => editor.template_id === template_id)
            ?.copy.subject
    ).toBe("My subject")
    const [reloaded] = update(failed, ReloadTransactionalCopy({ template_id }))
    expect(
        reloaded.editors.find((editor) => editor.template_id === template_id)
    ).toMatchObject({ base_version: 2, dirty: false })
})
test("activation is explicit and stale-domain responses are ignored", () => {
    const empty = init("domain-b")
    expect(
        update(
            empty,
            CompletedTransactionalCopy({ domain_id: "domain-a", state })
        )[0]
    ).toEqual(empty)
    expect(
        update(empty, SaveTransactionalCopy({ template_id }))[1]
    ).toHaveLength(0)
    const [loaded] = update(
        init("domain-a"),
        LoadedTransactionalTemplates({ states: [state] })
    )
    expect(
        update(loaded, ActivateTransactionalCopy({ template_id }))[1][0]?.args
    ).toMatchObject({
        operation: "activate",
        expected_version: 1,
        expected_active_version: 0,
    })
})
