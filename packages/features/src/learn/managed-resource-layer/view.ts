import { Match as M, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Button } from "@foldkit/ui"

import {
    ClickedComputeSquare,
    ClickedStartComputeEngine,
    ClickedStopComputeEngine,
    type ManagedResourceLayerMessage,
} from "./message.ts"
import { isEngineReady, type EngineState } from "./engine.ts"
import type { Model } from "./model.ts"

const BUTTON_CLASS =
    "px-4 py-2 rounded-[var(--radius-control)] font-medium transition data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const actionButton = <ParentMessage>(
    label: string,
    message: ParentMessage,
    colorClassName: string,
    isDisabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Button.view(
        {
            onClick: message,
            isDisabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(`${BUTTON_CLASS} ${colorClassName}`),
                    ],
                    [label]
                ),
        },
        h
    )

const engineStatusView = <ParentMessage>(
    engine: EngineState,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const status = M.value(engine).pipe(
        M.tag("EngineOff", () => ({
            colorClassName: "text-muted-foreground",
            text: "Engine is off.",
        })),
        M.tag("EngineBooting", () => ({
            colorClassName: "text-primary",
            text: "Booting engine...",
        })),
        M.tag("EngineReady", ({ engineId }) => ({
            colorClassName: "text-foreground",
            text: `Engine ready: ${engineId}`,
        })),
        M.tag("EngineFailed", ({ reason }) => ({
            colorClassName: "text-destructive",
            text: `Engine failed: ${reason}`,
        })),
        M.exhaustive
    )

    return h.p(
        [h.Class(`font-mono text-sm ${status.colorClassName}`)],
        [status.text]
    )
}

const engineControlsView = <ParentMessage>(
    engine: EngineState,
    toManagedResourceLayerMessage: (
        message: ManagedResourceLayerMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const controls = M.value(engine).pipe(
        M.tag("EngineBooting", "EngineReady", () => ({
            label: "Stop engine",
            message: ClickedStopComputeEngine(),
            colorClassName:
                "border-(length:--surface-border-width) border-destructive text-destructive hover:bg-destructive/10",
        })),
        M.tag("EngineOff", "EngineFailed", () => ({
            label: "Start engine",
            message: ClickedStartComputeEngine(),
            colorClassName:
                "bg-primary text-primary-foreground hover:opacity-90",
        })),
        M.exhaustive
    )

    return actionButton(
        controls.label,
        toManagedResourceLayerMessage(controls.message),
        controls.colorClassName,
        false,
        h
    )
}

const squareResultView = <ParentMessage>(
    maybeSquareResult: Option.Option<number>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.p(
        [h.Class("font-mono text-sm text-foreground")],
        [
            Option.match(maybeSquareResult, {
                onNone: () => "No result yet.",
                onSome: (value) => `Square result: ${value}`,
            }),
        ]
    )

export const view = <ParentMessage>(
    model: Model,
    toManagedResourceLayerMessage: (
        message: ManagedResourceLayerMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { engine, maybeSquareResult } = model
    return h.main(
        [h.Class("w-full min-w-0")],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Managed resource layer"]
            ),
            h.div(
                [
                    h.Class(
                        "max-w-md bg-card text-card-foreground border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] p-6 flex flex-col gap-4"
                    ),
                ],
                [
                    h.h3(
                        [h.Class("text-lg font-semibold")],
                        ["Layer-backed managed resource"]
                    ),
                    engineStatusView(engine, h),
                    engineControlsView(
                        engine,
                        toManagedResourceLayerMessage,
                        h
                    ),
                    actionButton(
                        "Compute next square",
                        toManagedResourceLayerMessage(ClickedComputeSquare()),
                        "border-(length:--surface-border-width) border-border text-foreground hover:bg-muted",
                        !isEngineReady(engine),
                        h
                    ),
                    squareResultView(maybeSquareResult, h),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Stop the engine and the teardown logs to the console. Computing while it is off resolves to a skip rather than a crash, because the tag reports the resource as unavailable.",
                        ]
                    ),
                ]
            ),
        ]
    )
}
