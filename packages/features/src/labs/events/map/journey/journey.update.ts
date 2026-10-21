import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import {
    drawRoute,
    FetchJourney,
    playJourney,
    resetJourney,
} from "./journey.command.ts"
import type { Message } from "./journey.message.ts"
import type { Model } from "./journey.model.ts"
import {
    initialModel,
    JourneyFailed,
    JourneyFinished,
    JourneyPlaying,
    JourneyReady,
} from "./journey.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

// The fetched route travels between every state, so it is read back out of
// whichever state currently holds it rather than kept in a second field.
//
// The fields are picked out rather than the state passed along whole: a tagged
// value carries its own _tag, and handing that to another tag's constructor
// lets the old tag win — JourneyPlaying(route) built a JourneyReady.
const routeOf = (
    model: Model
): Option.Option<{
    coordinates: ReadonlyArray<readonly [number, number]>
    distanceMeters: number
    durationSeconds: number
}> =>
    model.journeyState._tag === "JourneyLoading" ||
    model.journeyState._tag === "JourneyFailed"
        ? Option.none()
        : Option.some({
              coordinates: model.journeyState.coordinates,
              distanceMeters: model.journeyState.distanceMeters,
              durationSeconds: model.journeyState.durationSeconds,
          })

export const init = (): UpdateReturn => [initialModel, [FetchJourney()]]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SucceededMountMap: ({ hostId }) => {
                const maybeMapHostId = Option.some(hostId)

                // The route usually arrives before the map is ready, so it is
                // drawn here rather than when it lands.
                return [
                    { ...model, maybeMapHostId },
                    Option.match(routeOf(model), {
                        onNone: () => [],
                        onSome: ({ coordinates }) => [
                            drawRoute(maybeMapHostId, coordinates, 1),
                        ],
                    }),
                ]
            },
            FailedMountMap: ({ reason }) => [
                { ...model, maybeMapError: Option.some(reason) },
                [],
            ],
            SucceededFetchJourney: ({
                coordinates,
                distanceMeters,
                durationSeconds,
            }) => [
                {
                    ...model,
                    journeyState: JourneyReady({
                        coordinates,
                        distanceMeters,
                        durationSeconds,
                    }),
                },
                [drawRoute(model.maybeMapHostId, coordinates, 1)],
            ],
            FailedFetchJourney: ({ reason }) => [
                { ...model, journeyState: JourneyFailed({ reason }) },
                [],
            ],
            ClickedPlay: () =>
                Option.match(routeOf(model), {
                    onNone: () => [model, []],
                    onSome: (route) => [
                        { ...model, journeyState: JourneyPlaying(route) },
                        [
                            drawRoute(
                                model.maybeMapHostId,
                                route.coordinates,
                                0
                            ),
                            playJourney(
                                model.maybeMapHostId,
                                route.coordinates
                            ),
                        ],
                    ],
                }),
            ClickedReset: () =>
                Option.match(routeOf(model), {
                    onNone: () => [model, []],
                    onSome: (route) => [
                        { ...model, journeyState: JourneyReady(route) },
                        [resetJourney(model.maybeMapHostId, route.coordinates)],
                    ],
                }),
            CompletedJourney: () =>
                Option.match(routeOf(model), {
                    onNone: () => [model, []],
                    onSome: (route) => [
                        { ...model, journeyState: JourneyFinished(route) },
                        [],
                    ],
                }),
            // A run that was superseded leaves the Model alone: whatever
            // cancelled it has already said what the state should be.
            CancelledJourney: () => [model, []],
            CompletedDrawRoute: () => [model, []],
        })
    )
