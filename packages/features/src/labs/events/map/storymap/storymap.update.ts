import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import { moveCamera, scrollToChapter } from "./storymap.command.ts"
import type { Message } from "./storymap.message.ts"
import type { Model } from "./storymap.model.ts"
import { initialModel } from "./storymap.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SucceededMountMap: ({ hostId }) => [
                { ...model, maybeMapHostId: Option.some(hostId) },
                [],
            ],
            FailedMountMap: ({ reason }) => [
                { ...model, maybeMapError: Option.some(reason) },
                [],
            ],
            SucceededObserveChapter: () => [model, []],
            FailedObserveChapter: ({ reason }) => [
                { ...model, maybeMapError: Option.some(reason) },
                [],
            ],
            // The observer fires on every crossing, including the one that put
            // us here, so a repeat of the active chapter is not a camera move.
            EnteredChapter: ({ chapterId }) =>
                Option.contains(model.maybeActiveChapterId, chapterId)
                    ? [model, []]
                    : [
                          {
                              ...model,
                              maybeActiveChapterId: Option.some(chapterId),
                          },
                          moveCamera(model.maybeMapHostId, chapterId),
                      ],
            ClickedChapter: ({ chapterId }) => [
                model,
                [scrollToChapter(chapterId)],
            ],
            CompletedMoveCamera: () => [model, []],
        })
    )
