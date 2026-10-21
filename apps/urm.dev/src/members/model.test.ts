import { describe, expect, test } from "vitest"
import * as Ui from "@foldkit/ui"
import { Scene } from "foldkit"
import { Remote } from "foldkit-remote"
import * as Manage from "@urm/features/mail/members/manage"
import { initial, Message, synchronize, update } from "./model.ts"
import { view, is_members_path, ViewModel } from "./view.ts"

const scope = { account_id: "account", domain_id: "first", can_write: true }
const ready = { ...initial, ...scope }
describe("PostgreSQL Members", () => {
    test("loads once for a Mail scope and clears drafts and late results on workspace/account changes", () => {
        const opened = synchronize(initial, scope)
        expect(opened.commands).toHaveLength(1)
        expect(synchronize(opened.model, scope).commands).toBeUndefined()
        const changed = synchronize(
            { ...opened.model, draft: { ...initial.draft, first: "Private" } },
            { ...scope, domain_id: "second" }
        )
        expect(changed.model.draft.first).toBe("")
        expect(changed.model.remote).toEqual(Remote.initial)
        expect(
            update(
                changed.model,
                Message.Loaded({
                    epoch: opened.model.epoch,
                    remote: Remote.initial,
                    saved: false,
                    can_write: true,
                })
            ).model
        ).toBe(changed.model)
        const signed_out = synchronize(changed.model, null)
        expect(signed_out.model.domain_id).toBe("")
        expect(signed_out.model.can_write).toBe(false)
        expect(
            synchronize(changed.model, { ...scope, account_id: "other" })
                .commands
        ).toHaveLength(1)
    })
    test("read-only and loading models cannot create or upload", () => {
        for (const model of [
            { ...ready, can_write: false },
            { ...ready, busy: true },
        ]) {
            expect(
                update(
                    model,
                    Message.Interaction({
                        message: Manage.ClickedCreateMember(),
                    })
                ).commands
            ).toBeUndefined()
            expect(
                update(
                    model,
                    Message.Interaction({
                        message: Manage.ClickedUploadAvatar(),
                    })
                ).commands
            ).toBeUndefined()
        }
        Scene.scene(
            {
                update: (model: typeof ViewModel.Type, message: Message) => {
                    const result = update(model, message)
                    return {
                        ...result,
                        model: { ...result.model, managing: model.managing },
                    }
                },
                view,
            },
            Scene.given({ ...ready, can_write: false, managing: true }),
            Scene.expect(Scene.role("button", { name: "New" })).toBeDisabled()
        )
    })
    test("retains a create id for retries and rejects an invalid draft", () => {
        const prepared = update(
            ready,
            Message.PreparedCreate({ epoch: ready.epoch, id: "001" })
        ).model
        const invalid = update(
            prepared,
            Message.Interaction({ message: Manage.SubmittedMemberForm() })
        )
        expect(invalid.commands).toBeUndefined()
        expect(invalid.model.error).toContain("first and last")
        const failed = update(
            prepared,
            Message.Failed({
                epoch: prepared.epoch,
                error: "Network",
                forbidden: false,
            })
        )
        expect(failed.model.create_id).toBe("001")
        expect(failed.model.form_mode).toBe("create")
    })
    test("selects and uploads an avatar while ignoring results after closing or switching workspace", () => {
        const form = update(
            ready,
            Message.PreparedCreate({ epoch: ready.epoch, id: "create" })
        ).model
        const file = new File(
            [new Uint8Array([137, 80, 78, 71])],
            "avatar.png",
            { type: "image/png" }
        )
        const selected = update(
            form,
            Message.Interaction({
                message: Manage.GotAvatarDropMessage({
                    message: Ui.FileDrop.Message.DroppedFiles({
                        files: [file],
                    }),
                }),
            })
        ).model
        expect(selected.avatar_files).toEqual([file])
        const upload = update(
            selected,
            Message.Interaction({ message: Manage.ClickedUploadAvatar() })
        )
        expect(upload.model.upload_busy).toBe(true)
        expect(upload.commands).toHaveLength(1)
        expect(
            update(
                upload.model,
                Message.Interaction({ message: Manage.SubmittedMemberForm() })
            ).commands
        ).toBeUndefined()
        const done = Message.AvatarUploaded({
            epoch: upload.model.epoch,
            url: "/api/uploads/workspace/id",
        })
        expect(update(upload.model, done).model.draft.avatar).toBe(done.url)
        expect(
            update(
                upload.model,
                Message.AvatarUploadFailed({
                    epoch: upload.model.epoch,
                    error: "Unavailable",
                })
            ).model.error
        ).toBe("Unavailable")
        const closed = update(
            upload.model,
            Message.Interaction({ message: Manage.ClosedMemberForm() })
        ).model
        expect(update(closed, done).model).toBe(closed)
        const changed = synchronize(upload.model, {
            ...scope,
            domain_id: "other",
        }).model
        expect(update(changed, done).model).toBe(changed)
        expect(changed.avatar_files).toEqual([])
    })
    test("matches both original routes only", () => {
        expect(is_members_path("/mail/members")).toBe(true)
        expect(is_members_path("/mail/members/manage/")).toBe(true)
        expect(is_members_path("/mail/membership")).toBe(false)
        expect(is_members_path("/mail/members/manage/extra")).toBe(false)
    })
})
