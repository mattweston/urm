import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import {
    PublishThreadlinePost,
    SaveThreadlineLike,
} from "./threadline.command.ts"
import type { Message } from "./threadline.message.ts"
import {
    emptyNotice,
    initialModel,
    people,
    type Model,
    type Notice,
    type Post,
} from "./threadline.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const notice = (model: Model, values: Omit<Notice, "id">): Notice => ({
    id: model.next_notice,
    ...values,
})
export const init = (): UpdateReturn => [initialModel(), []]
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedRoute: ({ route }) => [
                modifyFields(model, { route: () => route }),
                [],
            ],
            ChangedComposer: ({ value }) => [
                modifyFields(model, { composer: () => value.slice(0, 280) }),
                [],
            ],
            SubmittedPost: () => {
                const body = model.composer.trim()
                if (body === "") return [model, []]
                const id = `local-post-${model.next_sequence}`
                const post: Post = {
                    id,
                    author: "avery",
                    body,
                    time: "now",
                    likes: 0,
                    liked: false,
                    saved: false,
                    replies: 0,
                    status: "Sending",
                }
                return [
                    modifyFields(model, {
                        posts: (posts) => [post, ...posts],
                        composer: () => "",
                        next_sequence: (value) => value + 1,
                    }),
                    [PublishThreadlinePost({ id, body, online: model.online })],
                ]
            },
            CompletedPost: ({ id, body, is_success }) =>
                is_success
                    ? [
                          modifyFields(model, {
                              posts: (posts) =>
                                  posts.map((post) =>
                                      post.id === id
                                          ? modifyFields(post, {
                                                status: () => "Published",
                                            })
                                          : post
                                  ),
                              notices: (notices) => [
                                  ...notices,
                                  notice(model, {
                                      ...emptyNotice,
                                      tone: "Success",
                                      title: "Post published",
                                      detail: "Your update is live.",
                                      retry_kind: "None",
                                  }),
                              ],
                              next_notice: (value) => value + 1,
                          }),
                          [],
                      ]
                    : [
                          modifyFields(model, {
                              posts: (posts) =>
                                  posts.filter((post) => post.id !== id),
                              notices: (notices) => [
                                  ...notices,
                                  notice(model, {
                                      tone: "Error",
                                      title: `Post rolled back: “${body}”`,
                                      detail: "Reconnect and retry this post.",
                                      retry_kind: "Post",
                                      post_id: Option.none(),
                                      body,
                                      target_liked: false,
                                  }),
                              ],
                              next_notice: (value) => value + 1,
                          }),
                          [],
                      ],
            ToggledLike: ({ id }) => {
                const post = model.posts.find((item) => item.id === id)
                if (post === undefined) return [model, []]
                const operation = model.next_operation
                return [
                    modifyFields(model, {
                        posts: (posts) =>
                            posts.map((item) =>
                                item.id === id
                                    ? modifyFields(item, {
                                          liked: (liked) => !liked,
                                          likes: (likes) =>
                                              likes + (item.liked ? -1 : 1),
                                      })
                                    : item
                            ),
                        pending_likes: (pending) => [
                            ...pending.filter((item) => item.post_id !== id),
                            {
                                post_id: id,
                                operation,
                                previous_liked: post.liked,
                                previous_likes: post.likes,
                            },
                        ],
                        notices: (notices) =>
                            notices.filter(
                                (item) => !Option.contains(item.post_id, id)
                            ),
                        next_operation: (value) => value + 1,
                    }),
                    [
                        SaveThreadlineLike({
                            id,
                            operation,
                            online: model.online,
                        }),
                    ],
                ]
            },
            CompletedLike: ({ id, operation, is_success }) => {
                const pending = model.pending_likes.find(
                    (item) =>
                        item.post_id === id && item.operation === operation
                )
                if (pending === undefined) return [model, []]
                if (is_success)
                    return [
                        modifyFields(model, {
                            pending_likes: (items) =>
                                items.filter((item) => item.post_id !== id),
                        }),
                        [],
                    ]
                const author =
                    people.find(
                        (person) =>
                            model.posts.find((post) => post.id === id)
                                ?.author === person.handle
                    )?.name ?? "Post"
                return [
                    modifyFields(model, {
                        posts: (posts) =>
                            posts.map((post) =>
                                post.id === id
                                    ? modifyFields(post, {
                                          liked: () => pending.previous_liked,
                                          likes: () => pending.previous_likes,
                                      })
                                    : post
                            ),
                        pending_likes: (items) =>
                            items.filter((item) => item.post_id !== id),
                        notices: (items) => [
                            ...items,
                            notice(model, {
                                tone: "Error",
                                title: `${author} reaction rolled back`,
                                detail: "Reconnect and retry this reaction.",
                                retry_kind: "Like",
                                post_id: Option.some(id),
                                body: "",
                                target_liked: !pending.previous_liked,
                            }),
                        ],
                        next_notice: (value) => value + 1,
                    }),
                    [],
                ]
            },
            ToggledSave: ({ id }) => [
                modifyFields(model, {
                    posts: (posts) =>
                        posts.map((post) =>
                            post.id === id
                                ? modifyFields(post, { saved: (saved) => !saved })
                                : post
                        ),
                }),
                [],
            ],
            ToggledFollow: ({ handle }) => [
                modifyFields(model, {
                    following: (following) =>
                        following.includes(handle)
                            ? following.filter((item) => item !== handle)
                            : [...following, handle],
                }),
                [],
            ],
            ToggledOnline: () => [
                modifyFields(model, { online: (online) => !online }),
                [],
            ],
            ReceivedLivePost: () =>
                model.posts.some((post) => post.id === "lena-live")
                    ? [model, []]
                    : [
                          modifyFields(model, {
                              posts: (posts) => [
                                  {
                                      id: "lena-live",
                                      author: "lena",
                                      body: "Preserving the thing someone is typing matters more than making a refreshing timeline look clever.",
                                      time: "now",
                                      likes: 9,
                                      liked: false,
                                      saved: false,
                                      replies: 2,
                                      status: "Published",
                                  },
                                  ...posts,
                              ],
                          }),
                          [],
                      ],
            RetriedNotice: ({ id }) => {
                const selected = model.notices.find((item) => item.id === id)
                if (selected === undefined || !model.online) return [model, []]
                if (selected.retry_kind === "Post") {
                    const without = modifyFields(model, {
                        notices: (items) =>
                            items.filter((item) => item.id !== id),
                        composer: () => selected.body,
                    })
                    return update(without, { _tag: "SubmittedPost" })
                }
                if (selected.retry_kind === "Like")
                    return Option.match(selected.post_id, {
                        onNone: () => [model, []],
                        onSome: (post_id) =>
                            update(
                                modifyFields(model, {
                                    notices: (items) =>
                                        items.filter((item) => item.id !== id),
                                }),
                                { _tag: "ToggledLike", id: post_id }
                            ),
                    })
                return [model, []]
            },
            DismissedNotice: ({ id }) => [
                modifyFields(model, {
                    notices: (items) => items.filter((item) => item.id !== id),
                }),
                [],
            ],
        })
    )
