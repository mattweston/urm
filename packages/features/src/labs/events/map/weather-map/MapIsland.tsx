import { RegistryContext, useAtom } from "@effect/atom-solid"
import { Show, createSignal, onCleanup, onMount, type JSX } from "solid-js"

import { mount_weather_map, unmount_weather_map } from "./map-runtime.ts"
import { position_atom, weather_map_registry } from "./state.ts"

const MapIslandContent = (): JSX.Element => {
    const [host, set_host] = createSignal<HTMLDivElement>()
    const [map_error, set_map_error] = createSignal<string | undefined>(
        undefined
    )
    const [position, set_position] = useAtom(() => position_atom)

    onMount(() => {
        const element = host()

        if (element === undefined) {
            set_map_error("Map host is not an HTMLElement.")
            return
        }

        // The atom's current value seeds the map rather than a constant, so a
        // marker moved before this island remounts comes back where it was.
        void mount_weather_map(element, position(), set_position).then(
            (result) => {
                if (result.kind === "failed") {
                    set_map_error(result.reason)
                }
            }
        )
    })

    onCleanup(() => unmount_weather_map())

    return (
        <section class="relative overflow-hidden rounded-lg border border-border bg-card">
            <p class="border-b border-border px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Astro island 1 · writable atom
            </p>

            <div
                ref={set_host}
                class="h-[26rem] w-full"
                aria-label="Weather location map"
            />

            <p class="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                Drag the marker, or click anywhere on the map. Now at{" "}
                <span class="font-mono tabular-nums text-card-foreground">
                    {position().lat.toFixed(3)}, {position().lng.toFixed(3)}
                </span>
                .
            </p>

            <Show when={map_error()}>
                {(reason) => (
                    <div
                        aria-label="Map failed to load"
                        class="absolute top-16 left-1/2 z-20 max-w-md -translate-x-1/2 rounded-md border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm"
                    >
                        <div class="mb-0.5 font-semibold">
                            Could not load the map.
                        </div>
                        <div class="text-xs text-muted-foreground">
                            {reason()}
                        </div>
                    </div>
                )}
            </Show>
        </section>
    )
}

const MapIsland = (): JSX.Element => (
    <RegistryContext.Provider value={weather_map_registry}>
        <MapIslandContent />
    </RegistryContext.Provider>
)

export default MapIsland
