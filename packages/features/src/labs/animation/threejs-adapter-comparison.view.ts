import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    AmbientLight,
    BoxGeometry,
    DirectionalLight,
    GridHelper,
    Group,
    Mesh,
    MeshStandardMaterial,
    type BufferGeometry,
    type Material,
} from "three"
import { animate, createTimeline, utils } from "animejs"

import { createThreeJsDemoMount } from "./threejs-demo.mount.ts"
import type { CompletedMountedThreeJsDemo } from "./message.ts"

type DemoMaterial = Material | Array<Material>

const sectionClassName = "space-y-4"
const cardClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const hostClassName =
    "h-[30rem] overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background"

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

export const view = <ParentMessage>(
    toMountedMessage: (message: CompletedMountedThreeJsDemo) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const mountAdapterComparison = createThreeJsDemoMount(
        "MountThreeJsAdapterComparison",
        ({ scene, camera, controls, addCleanup }) => {
            scene.add(new AmbientLight(0xffffff, 0.45))

            const directionalLight = new DirectionalLight(0xffffff, 1.25)
            directionalLight.position.set(3, 5, 4)
            scene.add(directionalLight)

            const grid = new GridHelper(12, 12, 0xffffff, 0xffffff)
            scene.add(grid)
            addCleanup(() => {
                scene.remove(grid)
                disposeGeometryAndMaterial(grid.geometry, grid.material)
            })

            const root = new Group()
            scene.add(root)
            addCleanup(() => scene.remove(root))

            camera.position.set(0, 0, 10)
            controls.target.set(0, 0, 0)

            const createCube = (x: number) => {
                const material = new MeshStandardMaterial({
                    color: 0xffffff,
                    transparent: true,
                })
                const cube = new Mesh(new BoxGeometry(1, 1, 1), material)
                cube.position.x = x
                root.add(cube)
                addCleanup(() => {
                    root.remove(cube)
                    disposeGeometryAndMaterial(cube.geometry, cube.material)
                })

                return { cube, material }
            }

            const { cube: leftCube, material: leftMaterial } = createCube(-2)
            const { cube: rightCube } = createCube(2)

            const leftTimeline = createTimeline({
                defaults: {
                    duration: 350,
                    ease: "inOutSine",
                },
            })
                .add(leftCube.position, { y: -1 }, 0)
                .add(
                    leftCube.rotation,
                    { x: utils.degToRad(90), y: utils.degToRad(180) },
                    0
                )
                .add(leftCube.scale, { x: 1.5, y: 1.5, z: 1.5 }, 0)
                .add(leftMaterial, { opacity: 0.3 }, 0)
                .add(leftMaterial.color, { r: 1, g: 0.4, b: 0.66 }, 0)
            addCleanup(() => leftTimeline.cancel())

            const rightAnimation = animate(rightCube, {
                y: -1,
                rotateX: 90,
                rotateY: 180,
                scaleAll: 1.5,
                opacity: 0.3,
                color: "#ff66aa",
                duration: 350,
                ease: "inOutSine",
            })
            addCleanup(() => rightAnimation.cancel())
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
                        ["3D Adapter Comparison"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-3xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The left cube animates via vanilla three.js object properties. The right cube uses animejs flat properties on the raw mesh.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(cardClassName)],
                [
                    h.div(
                        [h.Class("mb-4 grid gap-3 md:grid-cols-2")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs uppercase tracking-wide text-muted-foreground"
                                            ),
                                        ],
                                        ["Without adapter"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Tween nested three.js objects directly.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs uppercase tracking-wide text-muted-foreground"
                                            ),
                                        ],
                                        ["With adapter"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Animate the mesh with flat properties.",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(hostClassName),
                            h.OnMount(
                                Mount.mapMessage(
                                    mountAdapterComparison(),
                                    toMountedMessage
                                )
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.DataAttribute("threejs-host", ""),
                                    h.Class("h-full w-full"),
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
