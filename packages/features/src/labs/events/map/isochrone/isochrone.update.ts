import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import { drawBands, fetchBands, flyToOrigin } from "./isochrone.command.ts"
import type { Message } from "./isochrone.message.ts"
import type { Model } from "./isochrone.model.ts"
import {
    BandsFailed,
    BandsLoading,
    BandsReady,
    initialModel,
} from "./isochrone.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    initialModel,
    [fetchBands(initialModel.originStudioId, initialModel.profile)],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SucceededMountMap: ({ hostId }) => {
                const maybeMapHostId = Option.some(hostId)

                // Bands usually land before the map is ready, so they are drawn
                // here rather than when they arrive.
                return [
                    { ...model, maybeMapHostId },
                    model.bandsState._tag === "BandsReady"
                        ? [drawBands(maybeMapHostId, model.bandsState.bands)]
                        : [],
                ]
            },
            FailedMountMap: ({ reason }) => [
                { ...model, maybeMapError: Option.some(reason) },
                [],
            ],
            SucceededFetchBands: ({ bands }) => [
                { ...model, bandsState: BandsReady({ bands }) },
                [drawBands(model.maybeMapHostId, bands)],
            ],
            FailedFetchBands: ({ reason }) => [
                { ...model, bandsState: BandsFailed({ reason }) },
                [drawBands(model.maybeMapHostId, [])],
            ],
            // Changing either the origin or the profile invalidates the bands
            // on screen, so they are cleared as the new request goes out rather
            // than left showing a catchment for somewhere else.
            SelectedOrigin: ({ studioId }) => [
                {
                    ...model,
                    originStudioId: studioId,
                    bandsState: BandsLoading(),
                },
                [
                    drawBands(model.maybeMapHostId, []),
                    flyToOrigin(model.maybeMapHostId, studioId),
                    fetchBands(studioId, model.profile),
                ],
            ],
            SelectedProfile: ({ profile }) => [
                { ...model, profile, bandsState: BandsLoading() },
                [
                    drawBands(model.maybeMapHostId, []),
                    fetchBands(model.originStudioId, profile),
                ],
            ],
            CompletedDrawBands: () => [model, []],
            CompletedFlyToOrigin: () => [model, []],
        })
    )
