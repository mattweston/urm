import { Effect } from "effect"
import { Mount } from "foldkit"
import { createTimer } from "animejs"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { PerspectiveCamera, Scene, WebGLRenderer } from "three"

import { CompletedMountedThreeJsDemo } from "./message.ts"

export type ThreeJsDemoContext = Readonly<{
    mountElement: HTMLElement
    scene: Scene
    camera: PerspectiveCamera
    renderer: WebGLRenderer
    controls: OrbitControls
    addCleanup: (cleanup: () => void) => void
}>

type ThreeJsDemoSetup = (context: ThreeJsDemoContext) => void

export const createThreeJsDemoMount = (
    mountName: string,
    setup: ThreeJsDemoSetup
) =>
    Mount.define(mountName, {
        messages: [CompletedMountedThreeJsDemo],
        execute: ({ element }) =>
            Effect.acquireRelease(
                Effect.sync(() => {
                    if (!(element instanceof HTMLElement)) {
                        return {
                            message: CompletedMountedThreeJsDemo(),
                            cleanup: (): void => undefined,
                        }
                    }

                    const scene = new Scene()
                    const camera = new PerspectiveCamera(45, 1, 0.1, 100)
                    const renderer = new WebGLRenderer({
                        antialias: true,
                        alpha: true,
                    })
                    const controls = new OrbitControls(
                        camera,
                        renderer.domElement
                    )
                    const cleanups: Array<() => void> = []

                    const addCleanup = (cleanup: () => void) => {
                        cleanups.push(cleanup)
                    }

                    const host =
                        element.querySelector<HTMLElement>(
                            "[data-threejs-host]"
                        ) ?? element

                    if (!(host instanceof HTMLElement)) {
                        return {
                            message: CompletedMountedThreeJsDemo(),
                            cleanup: (): void => undefined,
                        }
                    }

                    const resize = () => {
                        const width = host.clientWidth
                        const height = host.clientHeight

                        if (width <= 0 || height <= 0) {
                            return
                        }

                        camera.aspect = width / height
                        camera.updateProjectionMatrix()
                        renderer.setSize(width, height, false)
                    }

                    renderer.setPixelRatio(window.devicePixelRatio || 1)
                    renderer.domElement.style.display = "block"
                    renderer.domElement.style.width = "100%"
                    renderer.domElement.style.height = "100%"
                    renderer.domElement.style.flex = "1 1 auto"
                    renderer.domElement.style.minHeight = "0"

                    controls.enableDamping = true

                    const resizeObserver = new ResizeObserver(resize)
                    resizeObserver.observe(host)
                    addCleanup(() => resizeObserver.disconnect())

                    host.replaceChildren(renderer.domElement)
                    setup({
                        mountElement: element,
                        scene,
                        camera,
                        renderer,
                        controls,
                        addCleanup,
                    })

                    resize()
                    controls.update()

                    const renderTimer = createTimer({
                        onUpdate: () => {
                            controls.update()
                            renderer.render(scene, camera)
                        },
                    })
                    addCleanup(() => renderTimer.cancel())
                    addCleanup(() => controls.dispose())
                    addCleanup(() => renderer.dispose())

                    return {
                        message: CompletedMountedThreeJsDemo(),
                        cleanup: (): void => {
                            cleanups.forEach((cleanup) => cleanup())
                        },
                    }
                }),
                ({ cleanup }) => Effect.sync(cleanup)
            ).pipe(Effect.as(CompletedMountedThreeJsDemo())),
    })
