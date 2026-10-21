import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import type { Message } from "./streambox.message.ts"
import {
    initialModel,
    videoForId,
    type Model,
    type VideoId,
} from "./streambox.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const toggleId = (
    ids: ReadonlyArray<VideoId>,
    id: VideoId
): ReadonlyArray<VideoId> =>
    ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
const queued = (model: Model) =>
    model.is_online ? model.queued_actions : model.queued_actions + 1
export const init = (): UpdateReturn => [initialModel(), []]
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedVideo: ({ id }) => [
                modifyFields(model, {
                    video_id: () => id,
                    panel: () => "Overview",
                    current_time: () => 0,
                    is_playing: () => false,
                    activity: () =>
                        Option.some(`${videoForId(id).title} is ready to play`),
                }),
                [],
            ],
            SelectedPanel: ({ panel }) => [
                modifyFields(model, { panel: () => panel }),
                [],
            ],
            ToggledPlayback: () => [
                modifyFields(model, {
                    is_playing: (value) => !value,
                    activity: () =>
                        Option.some(
                            model.is_playing
                                ? "Video paused"
                                : `Playing ${videoForId(model.video_id).title}`
                        ),
                }),
                [],
            ],
            SoughtVideo: ({ time }) => [
                modifyFields(model, {
                    current_time: () =>
                        Math.max(0, Math.min(model.duration, time)),
                    activity: () =>
                        Option.some(
                            `Jumped to ${Math.max(0, Math.min(model.duration, time)).toFixed(0)} seconds`
                        ),
                }),
                [],
            ],
            ToggledMute: () => [
                modifyFields(model, { is_muted: (value) => !value }),
                [],
            ],
            ToggledTheater: () => [
                modifyFields(model, { is_theater: (value) => !value }),
                [],
            ],
            ToggledLike: () => [
                modifyFields(model, {
                    liked_video_ids: (ids) => toggleId(ids, model.video_id),
                    queued_actions: () => queued(model),
                }),
                [],
            ],
            ToggledSave: () => [
                modifyFields(model, {
                    saved_video_ids: (ids) => toggleId(ids, model.video_id),
                    queued_actions: () => queued(model),
                }),
                [],
            ],
            ToggledFollow: () => {
                const creator = videoForId(model.video_id).creator
                return [
                    modifyFields(model, {
                        followed_creators: (creators) =>
                            creators.includes(creator)
                                ? creators.filter((item) => item !== creator)
                                : [...creators, creator],
                        queued_actions: () => queued(model),
                    }),
                    [],
                ]
            },
            ToggledOnline: () => [
                modifyFields(model, {
                    is_online: (value) => !value,
                    queued_actions: () =>
                        model.is_online ? model.queued_actions : 0,
                    activity: () =>
                        Option.some(
                            model.is_online
                                ? "Actions will sync on reconnect"
                                : `${model.queued_actions} queued actions synced`
                        ),
                }),
                [],
            ],
            ChangedCatalogQuery: ({ value }) => [
                modifyFields(model, { catalog_query: () => value }),
                [],
            ],
            ChangedCommentQuery: ({ value }) => [
                modifyFields(model, { comment_query: () => value }),
                [],
            ],
            ChangedCommentSort: ({ sort }) => [
                modifyFields(model, { comment_sort: () => sort }),
                [],
            ],
        })
    )
