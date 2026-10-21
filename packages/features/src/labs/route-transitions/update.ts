import { Array, Match as M, Option, pipe } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import { LoadRtCatalog, LoadRtPainting, SaveRtDraft } from "./command.ts"
import {
    ChangedRouteTransitionsRoute,
    type RouteTransitionsMessage as Message,
} from "./message.ts"
import type { Model } from "./model.ts"
import {
    MAX_LOGGED_TRANSITIONS,
    PaintingIdle,
    PaintingLoading,
    PaintingReady,
    type RtRoute,
} from "./route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const nextSequenceNumber = (model: Model): number =>
    Option.match(Array.head(model.transitionLog), {
        onNone: () => 1,
        onSome: ({ sequenceNumber }) => sequenceNumber + 1,
    })

const transitionCommands = (
    model: Model,
    previous: Option.Option<RtRoute>,
    next: RtRoute
): ReadonlyArray<Command.Command<Message>> => {
    const commands: Array<Command.Command<Message>> = []
    const previousTag = Option.map(previous, (route) => route._tag)

    if (
        next._tag === "RtGallery" &&
        !Option.contains(previousTag, "RtGallery") &&
        model.catalogStatus !== "Loading"
    ) {
        commands.push(LoadRtCatalog())
    }

    if (
        next._tag === "RtPainting" &&
        Option.match(previous, {
            onNone: () => true,
            onSome: (route) =>
                route._tag !== "RtPainting" ||
                route.paintingId !== next.paintingId,
        })
    ) {
        commands.push(LoadRtPainting({ paintingId: next.paintingId }))
    }

    if (
        Option.exists(previous, (route) => route._tag === "RtStudio") &&
        next._tag !== "RtStudio" &&
        model.studioDraft !== ""
    ) {
        commands.push(SaveRtDraft({ draft: model.studioDraft }))
    }

    return commands
}

export const init = (route: RtRoute): UpdateReturn => {
    const initial: Model = {
        route,
        transitionLog: [],
        catalogStatus: "Idle",
        paintingStatus: PaintingIdle(),
        studioDraft: "",
        maybeSavedDraft: Option.none(),
    }

    return update(
        initial,
        ChangedRouteTransitionsRoute({
            route,
            isColdLoad: true,
        })
    )
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedRouteTransitionsRoute: ({ route, isColdLoad }) => {
                const previous = isColdLoad
                    ? Option.none<RtRoute>()
                    : Option.some(model.route)
                const commands = transitionCommands(model, previous, route)
                const catalogStatus = commands.some(
                    (command) => command.name === "LoadRtCatalog"
                )
                    ? "Loading"
                    : model.catalogStatus
                const paintingStatus =
                    route._tag === "RtPainting" &&
                    commands.some(
                        (command) => command.name === "LoadRtPainting"
                    )
                        ? PaintingLoading({ paintingId: route.paintingId })
                        : model.paintingStatus

                return [
                    evo(model, {
                        route: () => route,
                        catalogStatus: () => catalogStatus,
                        paintingStatus: () => paintingStatus,
                        transitionLog: (log) =>
                            pipe(
                                log,
                                Array.prepend({
                                    sequenceNumber: nextSequenceNumber(model),
                                    maybePreviousRoute: previous,
                                    nextRoute: route,
                                }),
                                Array.take(MAX_LOGGED_TRANSITIONS)
                            ),
                    }),
                    commands,
                ]
            },
            SucceededLoadRtCatalog: () => [
                evo(model, { catalogStatus: () => "Ready" }),
                [],
            ],
            SucceededLoadRtPainting: ({ paintingId }) =>
                model.paintingStatus._tag === "PaintingLoading" &&
                model.paintingStatus.paintingId === paintingId
                    ? [
                          evo(model, {
                              paintingStatus: () =>
                                  PaintingReady({ paintingId }),
                          }),
                          [],
                      ]
                    : [model, []],
            UpdatedRtStudioDraft: ({ value }) => [
                evo(model, { studioDraft: () => value }),
                [],
            ],
            SucceededSaveRtDraft: ({ draft }) => [
                evo(model, { maybeSavedDraft: () => Option.some(draft) }),
                [],
            ],
        })
    )
