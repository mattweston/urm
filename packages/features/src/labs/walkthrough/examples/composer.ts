import { Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

export const Model = S.Struct({
    draft: S.String,
})
export type Model = typeof Model.Type

export const UpdatedComposerDraft = taggedStruct("UpdatedComposerDraft", {
    value: S.String,
})
export const SubmittedComposer = taggedStruct("SubmittedComposer")
export const Message = S.Union([UpdatedComposerDraft, SubmittedComposer])
export type Message = typeof Message.Type

// The parent hears about a post through this rather than by reading the
// composer's fields, so the composer stays the only writer of its own state.
export const PostedComment = taggedStruct("PostedComment", { text: S.String })
export const OutMessage = S.Union([PostedComment])
export type OutMessage = typeof OutMessage.Type

export const init: Model = Model.make({ draft: "" })

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedComposerDraft: ({ value }) => ({
                model: modifyFields(model, { draft: () => value }),
            }),
            SubmittedComposer: () => {
                const text = model.draft.trim()
                return text === ""
                    ? { model }
                    : {
                          model: modifyFields(model, { draft: () => "" }),
                          outMessage: PostedComment({ text }),
                      }
            },
        })
    )
