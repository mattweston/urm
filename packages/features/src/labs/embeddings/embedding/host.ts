import { Function, Option } from "effect"
import { Runtime } from "foldkit"

import { makeElement } from "./widget.ts"

const ROOT_ELEMENT_ID = "root"
const MOUNT_TOGGLE_BUTTON_ID = "mount-toggle"
const STEP_RANGE_ID = "step-range"
const STEP_VALUE_ID = "step-value"
const HOST_COUNT_ID = "host-count"
const WIDGET_SLOT_ID = "widget-slot"
const INITIAL_COUNT = 10
const STEP_MIN = 1
const STEP_MAX = 10

export const createWidgetHandle = (
    widgetSlot: HTMLElement,
    initialCount = INITIAL_COUNT
) => Runtime.embed(makeElement(widgetSlot, { initialCount }))

const getElement = (elementId: string): HTMLElement => {
    const element = document.getElementById(elementId)
    if (element === null) {
        throw new Error(`Missing host element "${elementId}"`)
    }

    return element
}

const getInputElement = (elementId: string): HTMLInputElement => {
    const element = document.getElementById(elementId)
    if (!(element instanceof HTMLInputElement)) {
        throw new Error(`Missing host input "${elementId}"`)
    }

    return element
}

export const startHost = (): void => {
    getElement(ROOT_ELEMENT_ID).outerHTML = `
    <div class="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <header class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold text-gray-900">Host application</h1>
        <p class="text-sm text-gray-600">
          This page is plain TypeScript with no Foldkit runtime of its own. It
          embeds the widget below with <code>Runtime.embed</code> and talks to it
          only through the handle: Flags at mount, <code>send</code> in,
          <code>subscribe</code> out, <code>dispose</code> on unmount.
        </p>
      </header>

      <section class="flex flex-col gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6">
        <h2 class="text-sm font-semibold text-gray-900">Host controls</h2>
        <div class="flex flex-wrap items-center gap-4">
          <button
            id="${MOUNT_TOGGLE_BUTTON_ID}"
            class="cursor-pointer rounded-[var(--radius-control)] bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 [box-shadow:var(--shadow-control)]"
          ></button>
          <label class="flex items-center gap-2 text-sm text-gray-700">
            Step
            <input id="${STEP_RANGE_ID}" type="range" min="${STEP_MIN}" max="${STEP_MAX}" value="1" />
            <span id="${STEP_VALUE_ID}" class="w-4 font-semibold tabular-nums">1</span>
          </label>
        </div>
        <p class="text-sm text-gray-700">
          Last count received from the widget:
          <span id="${HOST_COUNT_ID}" class="font-semibold tabular-nums">none yet</span>
        </p>
      </section>

      <div id="${WIDGET_SLOT_ID}"></div>
    </div>
  `

    const mountToggleButton = getElement(MOUNT_TOGGLE_BUTTON_ID)
    const stepRange = getInputElement(STEP_RANGE_ID)
    const stepValueDisplay = getElement(STEP_VALUE_ID)
    const hostCountDisplay = getElement(HOST_COUNT_ID)
    const widgetSlot = getElement(WIDGET_SLOT_ID)

    type WidgetHandle = ReturnType<typeof createWidgetHandle>

    let maybeHandle: Option.Option<WidgetHandle> = Option.none()

    const mountWidget = (): void => {
        const handle = createWidgetHandle(widgetSlot)

        handle.ports.countChanged.subscribe((count) => {
            hostCountDisplay.textContent = String(count)
        })
        handle.ports.stepChanged.send(Number(stepRange.value))

        maybeHandle = Option.some(handle)
        mountToggleButton.textContent = "Unmount widget"
    }

    const unmountWidget = (handle: WidgetHandle): void => {
        handle.dispose()
        maybeHandle = Option.none()
        mountToggleButton.textContent = "Mount widget"
    }

    mountToggleButton.addEventListener("click", () => {
        Option.match(maybeHandle, {
            onNone: mountWidget,
            onSome: unmountWidget,
        })
    })

    stepRange.addEventListener("input", () => {
        stepValueDisplay.textContent = stepRange.value
        Option.match(maybeHandle, {
            onNone: Function.constVoid,
            onSome: (handle) => {
                handle.ports.stepChanged.send(Number(stepRange.value))
            },
        })
    })

    mountWidget()
}
