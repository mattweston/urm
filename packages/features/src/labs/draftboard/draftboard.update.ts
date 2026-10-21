import { Array, Match as M, Option } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import { SaveBoard } from "./draftboard.command.ts"
import type { Message } from "./draftboard.message.ts"
import { initialModel, type Document, type Model } from "./draftboard.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const changed = (model: Model, document: Document): UpdateReturn => {
    const revision = model.revision + 1
    const next = evo(model, {
        document: () => document,
        undo_stack: (stack) => [...stack, model.document],
        redo_stack: () => [],
        revision: () => revision,
        sync_state: () => (model.is_online ? "Saving" : "Queued"),
    })
    return [next, model.is_online ? [SaveBoard({ revision, document })] : []]
}
const restored = (
    model: Model,
    document: Document,
    undo_stack: ReadonlyArray<Document>,
    redo_stack: ReadonlyArray<Document>
): UpdateReturn => {
    const revision = model.revision + 1
    const next = evo(model, {
        document: () => document,
        undo_stack: () => undo_stack,
        redo_stack: () => redo_stack,
        revision: () => revision,
        sync_state: () => (model.is_online ? "Saving" : "Queued"),
    })
    return [next, model.is_online ? [SaveBoard({ revision, document })] : []]
}
export const init = (): UpdateReturn => [initialModel("launch"), []]
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedBoard: ({ id }) => [initialModel(id), []],
            SelectedTool: ({ tool }) => [evo(model, { tool: () => tool }), []],
            ClickedShape: ({ id, is_additive }) => [
                evo(model, {
                    selected_ids: (ids) =>
                        is_additive
                            ? ids.includes(id)
                                ? ids.filter((selected) => selected !== id)
                                : [...ids, id]
                            : [id],
                }),
                [],
            ],
            ClickedCanvas: () => [evo(model, { selected_ids: () => [] }), []],
            AddedRectangle: () =>
                changed(
                    model,
                    evo(model.document, {
                        shapes: (shapes) => [
                            ...shapes,
                            {
                                id: `shape-${model.revision + 1}`,
                                label:
                                    shapes.length === 0
                                        ? "First idea"
                                        : "New idea",
                                x: 390,
                                y: 235,
                                width: 250,
                                height: 150,
                                fill: "fill-chart-4",
                            },
                        ],
                    })
                ),
            NudgedSelection: ({ delta_x, delta_y }) =>
                changed(
                    model,
                    evo(model.document, {
                        shapes: (shapes) =>
                            shapes.map((shape) =>
                                model.selected_ids.includes(shape.id)
                                    ? evo(shape, {
                                          x: (x) => x + delta_x,
                                          y: (y) => y + delta_y,
                                      })
                                    : shape
                            ),
                    })
                ),
            DeletedSelection: () =>
                changed(
                    model,
                    evo(model.document, {
                        shapes: (shapes) =>
                            shapes.filter(
                                (shape) =>
                                    !model.selected_ids.includes(shape.id)
                            ),
                    })
                ),
            ChangedShapeLabel: ({ id, value }) =>
                changed(
                    model,
                    evo(model.document, {
                        shapes: (shapes) =>
                            shapes.map((shape) =>
                                shape.id === id
                                    ? evo(shape, {
                                          label: () => value.slice(0, 120),
                                      })
                                    : shape
                            ),
                    })
                ),
            ClickedUndo: () =>
                Option.match(Array.last(model.undo_stack), {
                    onNone: () => [model, []],
                    onSome: (document) =>
                        restored(
                            model,
                            document,
                            model.undo_stack.slice(0, -1),
                            [...model.redo_stack, model.document]
                        ),
                }),
            ClickedRedo: () =>
                Option.match(Array.last(model.redo_stack), {
                    onNone: () => [model, []],
                    onSome: (document) =>
                        restored(
                            model,
                            document,
                            [...model.undo_stack, model.document],
                            model.redo_stack.slice(0, -1)
                        ),
                }),
            ChangedZoom: ({ amount }) => [
                evo(model, {
                    zoom: (zoom) => Math.max(0.5, Math.min(2, zoom + amount)),
                }),
                [],
            ],
            ToggledOnline: () => {
                const is_online = !model.is_online
                const next = evo(model, {
                    is_online: () => is_online,
                    sync_state: () =>
                        is_online && model.revision > model.saved_revision
                            ? "Saving"
                            : is_online
                              ? "Saved"
                              : "Queued",
                })
                return [
                    next,
                    is_online && model.revision > model.saved_revision
                        ? [
                              SaveBoard({
                                  revision: model.revision,
                                  document: model.document,
                              }),
                          ]
                        : [],
                ]
            },
            CompletedSave: ({ revision, is_success }) =>
                revision < model.revision
                    ? [model, []]
                    : [
                          evo(model, {
                              saved_revision: () =>
                                  is_success ? revision : model.saved_revision,
                              sync_state: () =>
                                  is_success ? "Saved" : "Error",
                              activity: () =>
                                  Option.some(
                                      is_success
                                          ? "All board changes saved"
                                          : "Saving failed. Retry when ready."
                                  ),
                          }),
                          [],
                      ],
        })
    )
