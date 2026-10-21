import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    AmbientLight,
    BoxGeometry,
    DirectionalLight,
    GridHelper,
    Group,
    InstancedMesh,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    type BufferGeometry,
    type Material,
} from "three"
import type { AnimationParams } from "animejs"
import { animate, utils } from "animejs"
import { getInstances } from "animejs/adapters/three"

import { createThreeJsDemoMount } from "./threejs-demo.mount.ts"
import type { CompletedMountedThreeJsDemo } from "./message.ts"

type DemoMaterial = Material | Array<Material>
type Mode = "Mesh" | "InstancedMesh"

type CubeSpec = Readonly<{
    pos: Readonly<[number, number, number]>
    color: string
    anim: AnimationParams
    staticOrigin?: Readonly<[number, number, number]>
    staticScale?: number
}>

type Instance = NonNullable<ReturnType<typeof getInstances>[number]>

const sectionClassName = "space-y-4"
const cardClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const hostClassName =
    "flex h-[40rem] flex-col gap-4 overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
const buttonBaseClassName =
    "rounded-full border-(length:--control-outline-border-width) border-border px-4 py-2 text-sm [font-weight:var(--control-font-weight)] [letter-spacing:var(--control-letter-spacing)] [text-transform:var(--control-text-transform)] [box-shadow:var(--shadow-control)] transition"
const buttonActiveClassName = `${buttonBaseClassName} bg-foreground text-background`
const buttonInactiveClassName = `${buttonBaseClassName} bg-background text-foreground hover:bg-accent hover:text-accent-foreground`

const disposeGeometryAndMaterial = (
    geometry: BufferGeometry,
    material: DemoMaterial
) => {
    geometry.dispose()

    if (Array.isArray(material)) {
        material.forEach((currentMaterial) => currentMaterial.dispose())
        return
    }

    material.dispose()
}

const cubeSpecs: ReadonlyArray<CubeSpec> = [
    {
        pos: [-3, 0, -4],
        color: "#ff4b4b",
        anim: {
            x: [-4, -2],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [-1, 0, -4],
        color: "#ff4b4b",
        anim: {
            y: [0, 2],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [1, 0, -4],
        color: "#ff4b4b",
        anim: {
            z: [-5, -3],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [3, 0, -4],
        color: "#ff4b4b",
        anim: {
            x: [2, 4],
            y: [0, 2],
            z: [-5, -3],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [-3, 0, -2],
        color: "#ff4b4b",
        anim: { rotateX: 360, duration: 3000, loop: true, ease: "linear" },
    },
    {
        pos: [-1, 0, -2],
        color: "#ff4b4b",
        anim: { rotateY: 360, duration: 3000, loop: true, ease: "linear" },
    },
    {
        pos: [1, 0, -2],
        color: "#ff4b4b",
        anim: { rotateZ: 360, duration: 3000, loop: true, ease: "linear" },
    },
    {
        pos: [3, 0, -2],
        color: "#ff4b4b",
        anim: {
            rotateX: 360,
            rotateY: 360,
            rotateZ: 360,
            duration: 3000,
            loop: true,
            ease: "linear",
        },
    },
    {
        pos: [-3, 0, 0],
        color: "#ff4b4b",
        anim: {
            scaleX: [0.5, 1.5],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [-1, 0, 0],
        color: "#ff4b4b",
        anim: {
            scaleY: [0.5, 1.5],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [1, 0, 0],
        color: "#ff4b4b",
        anim: {
            scaleZ: [0.5, 1.5],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [3, 0, 0],
        color: "#ff4b4b",
        anim: {
            scale: [0.5, 1.5],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [-3, 0, 2],
        color: "#ff4b4b",
        anim: {
            skewX: [-30, 30],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [-1, 0, 2],
        color: "#ff4b4b",
        anim: {
            skewY: [-30, 30],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [1, 0, 2],
        color: "#ff4b4b",
        anim: {
            skewZ: [-30, 30],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [3, 0, 2],
        color: "#ff4b4b",
        anim: {
            skewX: [-30, 30],
            skewY: [30, -30],
            skewZ: [-30, 30],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [-3, 0, 4],
        color: "#ff4b4b",
        staticOrigin: [-0.5, 0, 0],
        anim: {
            scaleX: [0.2, 1.2],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [-1, 0, 4],
        color: "#ff4b4b",
        staticOrigin: [0, -0.5, 0],
        anim: {
            scaleY: [0.2, 1.2],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [1, 0, 4],
        color: "#ff4b4b",
        staticOrigin: [0, 0, -0.5],
        anim: {
            scaleZ: [0.2, 1.2],
            duration: 2000,
            loop: true,
            alternate: true,
            ease: "inOutSine",
        },
    },
    {
        pos: [3, 3, 0],
        color: "#ff8f42",
        anim: {
            x: [0, -1, 1, 0],
            y: [3, 2, 4, 3],
            z: [0, -1, 1, 0],
            rotateX: [0, -180, 180, 0],
            rotateY: [0, -180, 180, 0],
            rotateZ: [0, -180, 180, 0],
            scaleX: [1, 2, -2, 1],
            scaleY: [1, 2, -2, 1],
            scaleZ: [1, 2, -2, 1],
            skewX: [0, -30, 30, 0],
            skewY: [0, -30, 30, 0],
            skewZ: [0, -30, 30, 0],
            transformOrigin: [
                "0 0 0",
                "-0.5 -0.5 -0.5",
                "0.5 0.5 0.5",
                "0 0 0",
            ],
            color: ["#ff8f42", "#ff4b4b", "#a4ff4f", "#ff8f42"],
            duration: 4000,
            loop: true,
            ease: "inOutSine",
        },
    },
]

const setupTarget = (target: Mesh | Instance, spec: CubeSpec) => {
    utils.set(target, {
        x: spec.pos[0],
        y: spec.pos[1],
        z: spec.pos[2],
        color: spec.color,
    })

    if (spec.staticOrigin !== undefined) {
        utils.set(target, {
            transformOriginX: spec.staticOrigin[0],
            transformOriginY: spec.staticOrigin[1],
            transformOriginZ: spec.staticOrigin[2],
        })
    }

    if (spec.staticScale !== undefined) {
        utils.set(target, { scale: spec.staticScale })
    }
}

export const view = <ParentMessage>(
    toMountedMessage: (message: CompletedMountedThreeJsDemo) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const mountExtendedTransforms = createThreeJsDemoMount(
        "MountThreeJsExtendedTransforms",
        ({ mountElement, scene, camera, controls, addCleanup }) => {
            scene.add(new AmbientLight(0xffffff, 0.45))

            const directionalLight = new DirectionalLight(0xffffff, 1.35)
            directionalLight.position.set(6, 12, 8)
            scene.add(directionalLight)

            const grid = new GridHelper(20, 20, 0xffffff, 0xffffff)
            grid.position.set(0.5, -0.5, 0.5)
            scene.add(grid)
            addCleanup(() => {
                scene.remove(grid)
                disposeGeometryAndMaterial(grid.geometry, grid.material)
            })

            const root = new Group()
            scene.add(root)
            addCleanup(() => scene.remove(root))

            camera.position.set(0, 7, 14)
            controls.target.set(0, 1, 0)

            const state: {
                mode: Mode
                objectCleanups: Array<() => void>
                animationCleanups: Array<() => void>
                objects: Array<Object3D>
            } = {
                mode: "Mesh",
                objectCleanups: [],
                animationCleanups: [],
                objects: [],
            }

            const clearMode = () => {
                state.animationCleanups.forEach((cleanup) => cleanup())
                state.animationCleanups.length = 0
                state.objectCleanups.forEach((cleanup) => cleanup())
                state.objectCleanups.length = 0
                state.objects.forEach((object) => root.remove(object))
                state.objects.length = 0
            }

            const registerObject = (object: Object3D, cleanup: () => void) => {
                root.add(object)
                state.objects.push(object)
                state.objectCleanups.push(cleanup)
            }

            const buildMeshMode = () => {
                cubeSpecs.forEach((spec) => {
                    const geometry = new BoxGeometry(1, 1, 1)
                    const material = new MeshStandardMaterial({
                        color: 0xff4b4b,
                        transparent: true,
                        roughness: 0.35,
                        metalness: 0.05,
                    })
                    const cube = new Mesh(geometry, material)

                    setupTarget(cube, spec)
                    registerObject(cube, () =>
                        disposeGeometryAndMaterial(cube.geometry, cube.material)
                    )

                    const animation = animate(cube, spec.anim)
                    state.animationCleanups.push(() => animation.cancel())
                })
            }

            const buildInstancedMode = () => {
                const geometry = new BoxGeometry(1, 1, 1)
                const material = new MeshStandardMaterial({
                    color: 0xffffff,
                    transparent: true,
                    roughness: 0.35,
                    metalness: 0.05,
                })
                const instanced = new InstancedMesh(
                    geometry,
                    material,
                    cubeSpecs.length
                )

                utils.set(instanced, { y: 5 })
                registerObject(instanced, () =>
                    disposeGeometryAndMaterial(
                        instanced.geometry,
                        instanced.material
                    )
                )

                const instances = getInstances(instanced)
                cubeSpecs.forEach((spec, index) => {
                    const instance = instances[index]

                    if (instance == null) {
                        return
                    }

                    setupTarget(instance, spec)
                    const animation = animate(instance, spec.anim)
                    state.animationCleanups.push(() => animation.cancel())
                })
            }

            const rebuild = (mode: Mode) => {
                clearMode()
                state.mode = mode

                if (mode === "Mesh") {
                    buildMeshMode()
                } else {
                    buildInstancedMode()
                }
            }

            const updateButtons = () => {
                const buttons =
                    mountElement.querySelectorAll<HTMLButtonElement>(
                        "[data-threejs-mode]"
                    )

                buttons.forEach((button) => {
                    const isActive = button.dataset.threejsMode === state.mode
                    button.className = isActive
                        ? buttonActiveClassName
                        : buttonInactiveClassName
                    button.setAttribute(
                        "aria-pressed",
                        isActive ? "true" : "false"
                    )
                })
            }

            rebuild("Mesh")
            updateButtons()

            const onModeClick = (mode: Mode) => () => {
                rebuild(mode)
                updateButtons()
            }

            const meshButton = mountElement.querySelector<HTMLButtonElement>(
                '[data-threejs-mode="Mesh"]'
            )
            const instancedButton =
                mountElement.querySelector<HTMLButtonElement>(
                    '[data-threejs-mode="InstancedMesh"]'
                )

            if (meshButton !== null && meshButton !== undefined) {
                const handleClick = onModeClick("Mesh")
                meshButton.addEventListener("click", handleClick)
                addCleanup(() =>
                    meshButton.removeEventListener("click", handleClick)
                )
            }

            if (instancedButton !== null && instancedButton !== undefined) {
                const handleClick = onModeClick("InstancedMesh")
                instancedButton.addEventListener("click", handleClick)
                addCleanup(() =>
                    instancedButton.removeEventListener("click", handleClick)
                )
            }

            addCleanup(clearMode)
        }
    )

    return h.section(
        [h.Class(sectionClassName)],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["3D Extended Transforms"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-3xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "A direct port of the extended three.js transform playground. Toggle between mesh and instanced modes to compare adapter-driven transforms.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(cardClassName)],
                [
                    h.div(
                        [
                            h.Class(`${hostClassName} min-h-0`),
                            h.OnMount(
                                Mount.mapMessage(
                                    mountExtendedTransforms(),
                                    toMountedMessage
                                )
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    h.button(
                                        [
                                            h.DataAttribute(
                                                "threejs-mode",
                                                "Mesh"
                                            ),
                                            h.AriaPressed("true"),
                                            h.Class(buttonActiveClassName),
                                        ],
                                        ["Mesh"]
                                    ),
                                    h.button(
                                        [
                                            h.DataAttribute(
                                                "threejs-mode",
                                                "InstancedMesh"
                                            ),
                                            h.AriaPressed("false"),
                                            h.Class(buttonInactiveClassName),
                                        ],
                                        ["InstancedMesh"]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.DataAttribute("threejs-host", ""),
                                    h.Class(
                                        "flex-1 min-h-0 overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background"
                                    ),
                                ],
                                []
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}
