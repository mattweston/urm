import { Array } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    AmbientLight,
    BatchedMesh,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    ConeGeometry,
    DirectionalLight,
    GridHelper,
    Group,
    InstancedMesh,
    Line,
    LineBasicMaterial,
    Material,
    Mesh,
    MeshStandardMaterial,
    Points,
    PointsMaterial,
    Sprite,
    SpriteMaterial,
    SphereGeometry,
    CanvasTexture,
} from "three"
import { animate, stagger, utils } from "animejs"
import { getInstances } from "animejs/adapters/three"

import { createThreeJsDemoMount } from "./threejs-demo.mount.ts"
import type { CompletedMountedThreeJsDemo } from "./message.ts"

type DemoMaterial = Material | Array<Material>

const sectionClassName = "space-y-4"
const cardClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const hostClassName =
    "h-[34rem] overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background"

const disposeGeometryAndMaterial = (
    geometry: BufferGeometry,
    material: DemoMaterial
) => {
    geometry.dispose()

    if (globalThis.Array.isArray(material)) {
        material.forEach((currentMaterial) => currentMaterial.dispose())
        return
    }

    material.dispose()
}

const disposeSprite = (sprite: Sprite) => {
    sprite.material.map?.dispose()
    sprite.material.dispose()
}

const toFloat32Array = (
    vectors: ReadonlyArray<Readonly<[number, number, number]>>
) => new Float32Array(vectors.flat())

export const view = <ParentMessage>(
    toMountedMessage: (message: CompletedMountedThreeJsDemo) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const mountObjectProperties = createThreeJsDemoMount(
        "MountThreeJsObjectProperties",
        ({ scene, camera, controls, addCleanup }) => {
            scene.add(new AmbientLight(0xffffff, 0.55))

            const directionalLight = new DirectionalLight(0xffffff, 1.5)
            directionalLight.position.set(6, 12, 8)
            scene.add(directionalLight)

            const grid = new GridHelper(20, 20, 0xffffff, 0xffffff)
            grid.position.set(0.5, -0.5, 0.5)
            scene.add(grid)
            addCleanup(() => {
                disposeGeometryAndMaterial(grid.geometry, grid.material)
                scene.remove(grid)
            })

            const root = new Group()
            scene.add(root)
            addCleanup(() => scene.remove(root))

            camera.position.set(0, 7, 14)
            controls.target.set(0, 1, 0)

            const cube = new Mesh(
                new BoxGeometry(1.2, 1.2, 1.2),
                new MeshStandardMaterial({
                    color: 0xff4b4b,
                    transparent: true,
                    roughness: 0.35,
                    metalness: 0.05,
                })
            )
            utils.set(cube, { x: -7 })
            cube.castShadow = true
            cube.receiveShadow = true
            root.add(cube)
            addCleanup(() => {
                root.remove(cube)
                disposeGeometryAndMaterial(cube.geometry, cube.material)
            })

            const spriteCanvas = document.createElement("canvas")
            spriteCanvas.width = spriteCanvas.height = 128
            const spriteContext = spriteCanvas.getContext("2d")
            if (spriteContext !== null) {
                const gradient = spriteContext.createRadialGradient(
                    64,
                    64,
                    4,
                    64,
                    64,
                    64
                )
                gradient.addColorStop(0, "#ffffff")
                gradient.addColorStop(0.4, "#ffcc00")
                gradient.addColorStop(1, "#ff000000")
                spriteContext.fillStyle = gradient
                spriteContext.fillRect(0, 0, 128, 128)
            }

            const sprite = new Sprite(
                new SpriteMaterial({
                    map: new CanvasTexture(spriteCanvas),
                    transparent: true,
                    depthWrite: false,
                })
            )
            utils.set(sprite, { x: 7, y: 1, scale: 1.5 })
            root.add(sprite)
            addCleanup(() => {
                root.remove(sprite)
                disposeSprite(sprite)
            })

            const pointCount = 600
            const pointPositions = toFloat32Array(
                Array.makeBy(pointCount, (index) => {
                    const angle = (index / pointCount) * Math.PI * 2
                    const radius = 9 + Math.random() * 1.5

                    return [
                        Math.cos(angle) * radius,
                        (Math.random() - 0.5) * 0.6,
                        Math.sin(angle) * radius,
                    ]
                })
            )

            const pointsGeometry = new BufferGeometry()
            pointsGeometry.setAttribute(
                "position",
                new BufferAttribute(pointPositions, 3)
            )
            const points = new Points(
                pointsGeometry,
                new PointsMaterial({
                    color: 0xffffff,
                    size: 0.08,
                    transparent: true,
                    opacity: 0.9,
                })
            )
            root.add(points)
            addCleanup(() => {
                root.remove(points)
                disposeGeometryAndMaterial(points.geometry, points.material)
            })

            const ringSegments = 128
            const ringPositions = toFloat32Array(
                Array.makeBy(ringSegments + 1, (index) => {
                    const angle = (index / ringSegments) * Math.PI * 2

                    return [Math.cos(angle) * 6, 0, Math.sin(angle) * 6]
                })
            )

            const ringGeometry = new BufferGeometry()
            ringGeometry.setAttribute(
                "position",
                new BufferAttribute(ringPositions, 3)
            )
            const ring = new Line(
                ringGeometry,
                new LineBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.65,
                })
            )
            utils.set(ring, { rotateX: 90 })
            root.add(ring)
            addCleanup(() => {
                root.remove(ring)
                disposeGeometryAndMaterial(ring.geometry, ring.material)
            })

            const instancePalette = [
                "#ff4b4b",
                "#ff8f42",
                "#ffc730",
                "#a4ff4f",
                "#3cffec",
                "#5a87ff",
                "#8453e3",
                "#fb89fb",
            ]
            const instanced = new InstancedMesh(
                new BoxGeometry(0.3, 0.3, 0.3),
                new MeshStandardMaterial({ color: 0xffffff }),
                4000
            )
            instanced.castShadow = true
            utils.set(instanced, { y: 5 })
            root.add(instanced)
            addCleanup(() => {
                root.remove(instanced)
                disposeGeometryAndMaterial(
                    instanced.geometry,
                    instanced.material
                )
            })

            const instancedInstances = getInstances(instanced)
            const instancedAnimation = animate(instancedInstances, {
                x: stagger(0.45, { grid: [80, 50], from: "center", axis: "x" }),
                y: stagger(0.45, { grid: [80, 50], from: "center", axis: "y" }),
                color: () => utils.randomPick(instancePalette),
                z: () => utils.random(-10, 10),
                rotateX: () => utils.random(-180, 180),
                rotateY: () => utils.random(-180, 180),
                duration: 3000,
                delay: stagger([0, 1000], { grid: true, from: "center" }),
                loop: true,
                alternate: true,
                ease: "inOutSine",
            })
            addCleanup(() => instancedAnimation.cancel())

            const cubeAnimation = animate(cube, {
                x: [-7, -7.5, -6.5, -7],
                y: [0, 1.5, 0],
                rotateY: 360,
                rotateX: [0, 180],
                scale: [{ to: 1.6 }, { to: 0 }, { to: 1 }],
                color: ["#fff", "#f0a", "#fff"],
                opacity: [1, 0, 1],
                duration: 3000,
                loop: true,
            })
            addCleanup(() => cubeAnimation.cancel())

            const spriteAnimation = animate(sprite, {
                y: [1, 3, 1],
                scale: [1.5, 2.5, 1.5],
                opacity: [0.5, 1, 0.5],
                color: ["#ffcc00", "#ff66ff", "#66ffff", "#ffcc00"],
                duration: 3000,
                loop: true,
                ease: "inOutSine",
            })
            addCleanup(() => spriteAnimation.cancel())

            const pointsAnimation = animate(points, {
                rotateY: 360,
                color: ["#fff", "#ff7", "#7ff", "#fff"],
                duration: 8000,
                loop: true,
                ease: "linear",
            })
            addCleanup(() => pointsAnimation.cancel())

            const ringAnimation = animate(ring, {
                rotateZ: 360,
                color: ["#fff", "#88f", "#fff"],
                opacity: [0.3, 0.8, 0.3],
                duration: 4000,
                loop: true,
                ease: "inOutSine",
            })
            addCleanup(() => ringAnimation.cancel())

            const batchedMaterial = new MeshStandardMaterial({
                color: 0x88ffaa,
            })
            const batched = new BatchedMesh(24, 2000, 4000, batchedMaterial)
            const batchedGeometryIds = [
                batched.addGeometry(new BoxGeometry(0.7, 0.7, 0.7)),
                batched.addGeometry(new SphereGeometry(0.45, 12, 8)),
                batched.addGeometry(new ConeGeometry(0.45, 0.9, 6)),
            ]

            Array.forEach(
                Array.makeBy(24, (index) => index),
                (index) => {
                    const geometryId =
                        batchedGeometryIds[index % batchedGeometryIds.length]
                    if (geometryId !== undefined) {
                        batched.addInstance(geometryId)
                    }
                }
            )

            batched.castShadow = true
            utils.set(batched, { y: 2 })
            scene.add(batched)
            addCleanup(() => {
                scene.remove(batched)
                batched.geometry.dispose()
                batched.material.dispose()
            })

            const batchedInstances = getInstances(batched)
            Array.forEach(batchedInstances, (instance, index) => {
                if (instance === null) {
                    return
                }

                const angle = (index / 24) * Math.PI * 2
                utils.set(instance, {
                    x: Math.cos(angle) * 6,
                    z: Math.sin(angle) * 6,
                })
            })

            const batchedAnimation = animate(batchedInstances, {
                scale: [1, 0, 1],
                rotateY: 360,
                color: ["#88ffaa", "#ffaa88", "#88ffaa"],
                duration: 3000,
                loop: true,
                alternate: true,
                ease: "inOutSine",
            })
            addCleanup(() => batchedAnimation.cancel())
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
                        ["3D Object Properties"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-3xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Port of the animejs three.js adapter playground. It animates raw meshes, sprites, points, lines, instanced meshes, and batched meshes with flat properties.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(cardClassName)],
                [
                    h.div(
                        [
                            h.Class(
                                "mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground"
                            ),
                        ],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border-(length:--control-outline-border-width) border-border px-3 py-1"
                                    ),
                                ],
                                ["Mesh"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border-(length:--control-outline-border-width) border-border px-3 py-1"
                                    ),
                                ],
                                ["Sprite"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border-(length:--control-outline-border-width) border-border px-3 py-1"
                                    ),
                                ],
                                ["Points"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border-(length:--control-outline-border-width) border-border px-3 py-1"
                                    ),
                                ],
                                ["Line"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border-(length:--control-outline-border-width) border-border px-3 py-1"
                                    ),
                                ],
                                ["InstancedMesh"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border-(length:--control-outline-border-width) border-border px-3 py-1"
                                    ),
                                ],
                                ["BatchedMesh"]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(hostClassName),
                            h.OnMount(
                                Mount.mapMessage(
                                    mountObjectProperties(),
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
