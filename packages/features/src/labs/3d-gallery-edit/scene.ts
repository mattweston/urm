import * as THREE from "three"
import { Option, Schema } from "effect"
import {
    default_image_settings,
    image_layout,
    type ImageSettings,
} from "./gallery.presentation.ts"
import type { FrameDef } from "./images.ts"
import { GOLDEN_RATIO, getGalleryText, type GalleryText } from "./images.ts"
import type { GalleryInstance } from "./host.ts"

const MIN_RADIUS = 1
const MAX_RADIUS = 2.5
const MIN_PHI = 0.1
const MAX_PHI = Math.PI / 2 - 0.1
const DAMPING = 0.08
const ROTATE_SPEED = 0.005
const ZOOM_SPEED = 0.002
const DEFAULT_THETA = Math.PI
const DEFAULT_PHI = Math.PI / 4
const DEFAULT_RADIUS = MAX_RADIUS
const FOCUS_DISTANCE_DEFAULT = 1.25
const MIN_FOCUS_DISTANCE = 0.35
const FOCUS_BLEND_OUTER_DISTANCE = 2
const FOCUS_ZOOM_SPEED = 0.002
const FOCUS_HANDOFF_POSITION_EPSILON = 0.01
const FOCUS_HANDOFF_ROTATION_EPSILON = 0.01
const LABEL_CANVAS_WIDTH = 420
const LABEL_CANVAS_HEIGHT = 420
const LABEL_PLANE_WIDTH = 0.56
const LABEL_PLANE_HEIGHT = 0.56
const LABEL_SIDE_OFFSET = 0.86
const LABEL_FORWARD_OFFSET = 0.1
const LABEL_PADDING_X = 18
const LABEL_PADDING_Y = 26
const LABEL_LINE_GAP = 22
const LABEL_TITLE_FONT = "bold 34px sans-serif"
const LABEL_ARTIST_FONT = "26px sans-serif"
const LABEL_OVERVIEW_FONT = "bold 20px sans-serif"
const LABEL_BACKGROUND = "#f5f0e8"
const LABEL_BORDER = "#bbb"
const LABEL_TEXT = "#333"
const LABEL_MUTED_TEXT = "#666"

const resolveCssColor = (variable: string, fallback: number): THREE.Color => {
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim()
    if (raw === "") {
        return new THREE.Color(fallback)
    }

    if (raw.startsWith("#")) {
        return new THREE.Color(raw)
    }

    const ctx = document.createElement("canvas").getContext("2d")
    if (ctx === null) {
        return new THREE.Color(fallback)
    }

    try {
        ctx.fillStyle = raw
        const parsed = ctx.fillStyle
        const rgbMatch = parsed.match(
            /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
        )
        const red = rgbMatch?.[1]
        const green = rgbMatch?.[2]
        const blue = rgbMatch?.[3]
        if (red !== undefined && green !== undefined && blue !== undefined) {
            return new THREE.Color(
                parseInt(red) / 255,
                parseInt(green) / 255,
                parseInt(blue) / 255
            )
        }
        const hexMatch = parsed.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/i)
        const hexRed = hexMatch?.[1]
        const hexGreen = hexMatch?.[2]
        const hexBlue = hexMatch?.[3]
        if (
            hexRed !== undefined &&
            hexGreen !== undefined &&
            hexBlue !== undefined
        ) {
            return new THREE.Color(
                parseInt(hexRed, 16) / 255,
                parseInt(hexGreen, 16) / 255,
                parseInt(hexBlue, 16) / 255
            )
        }
        const oklchMatch = parsed.match(
            /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)/
        )
        if (oklchMatch !== null) {
            return oklchToColor(oklchMatch)
        }
    } catch {
        // fallback
    }

    return new THREE.Color(fallback)
}

const oklchToColor = (m: RegExpMatchArray): THREE.Color => {
    const lightness = m[1] ?? "0"
    const chroma = m[2] ?? "0"
    const hue = m[3] ?? "0"
    let L = parseFloat(lightness)
    if (lightness.endsWith("%")) {
        L /= 100
    }
    let C = parseFloat(chroma)
    if (chroma.endsWith("%")) {
        C /= 100
    }
    let H = parseFloat(hue)
    if (hue.endsWith("%")) {
        H = (H / 100) * 360
    }

    const hRad = (H * Math.PI) / 180
    const a = C * Math.cos(hRad)
    const b = C * Math.sin(hRad)

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b
    const s_ = L - 0.0894841775 * a - 1.291485548 * b

    const lCubed = l_ * l_ * l_
    const mCubed = m_ * m_ * m_
    const sCubed = s_ * s_ * s_

    const rLin =
        4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed
    const gLin =
        -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed
    const bLin =
        -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed

    const srgb = (c: number): number => {
        if (c <= 0.0031308) {
            return c * 12.92
        }
        return 1.055 * Math.pow(c, 1 / 2.4) - 0.055
    }

    return new THREE.Color(srgb(rLin), srgb(gLin), srgb(bLin))
}

interface RoomMaterials {
    readonly ceiling: THREE.MeshStandardMaterial
    readonly floor: THREE.MeshStandardMaterial
    readonly walls: THREE.MeshBasicMaterial
}

const createRoom = (scene: THREE.Scene, materials: RoomMaterials): void => {
    const rw = 6
    const rd = 6
    const rh = 3
    const hw = rw / 2
    const hd = rd / 2
    const floorY = -0.5
    const wallCenterY = floorY + rh / 2
    const ceilingY = floorY + rh

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(rw, rd),
        materials.floor
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, floorY, 0)
    scene.add(floor)

    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(rw, rd),
        materials.ceiling
    )
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.set(0, ceilingY, 0)
    scene.add(ceiling)

    const back = new THREE.Mesh(
        new THREE.PlaneGeometry(rw, rh),
        materials.walls
    )
    back.position.set(0, wallCenterY, hd)
    scene.add(back)

    const front = new THREE.Mesh(
        new THREE.PlaneGeometry(rw, rh),
        materials.walls
    )
    front.position.set(0, wallCenterY, -hd)
    scene.add(front)

    const left = new THREE.Mesh(
        new THREE.PlaneGeometry(rd, rh),
        materials.walls
    )
    left.rotation.y = Math.PI / 2
    left.position.set(-hw, wallCenterY, 0)
    scene.add(left)

    const right = new THREE.Mesh(
        new THREE.PlaneGeometry(rd, rh),
        materials.walls
    )
    right.rotation.y = -Math.PI / 2
    right.position.set(hw, wallCenterY, 0)
    scene.add(right)
}

const createRoomMaterials = (): RoomMaterials => {
    const roomColor = resolveCssColor("--muted", 0x333344)

    return {
        ceiling: new THREE.MeshStandardMaterial({
            color: roomColor,
            emissive: roomColor.clone().multiplyScalar(0.08),
            metalness: 0,
            roughness: 0.95,
            side: THREE.DoubleSide,
        }),
        floor: new THREE.MeshStandardMaterial({
            color: roomColor,
            metalness: 0,
            roughness: 0.8,
        }),
        walls: new THREE.MeshBasicMaterial({
            color: roomColor,
            side: THREE.DoubleSide,
        }),
    }
}

const applyThemeToRoom = (
    scene: THREE.Scene,
    materials: RoomMaterials
): void => {
    const background = resolveCssColor("--background", 0x191920)
    const roomColor = resolveCssColor("--muted", 0x333344)

    scene.background = background
    if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(background)
    }
    materials.floor.color.copy(roomColor)
    materials.walls.color.copy(roomColor)
    materials.ceiling.color.copy(roomColor)
    materials.ceiling.emissive.copy(roomColor).multiplyScalar(0.08)
}

export const initGalleryScene = (
    container: HTMLElement,
    frameDefs: ReadonlyArray<FrameDef>
): GalleryInstance => {
    const width = Math.max(1, container.clientWidth)
    const height = Math.max(1, container.clientHeight)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    container.appendChild(renderer.domElement)
    renderer.domElement.tabIndex = 0
    renderer.domElement.setAttribute(
        "aria-label",
        "3D artwork gallery. Drag to look around, use arrow keys to browse, Escape to close selection. The artwork list is available above."
    )
    renderer.domElement.style.touchAction = "none"
    renderer.domElement.style.maxWidth = "100%"

    const bgColor = resolveCssColor("--background", 0x191920)
    const borderColor = resolveCssColor("--border", 0x151515)
    const placeholderColor = resolveCssColor("--muted", 0x333333)

    const scene = new THREE.Scene()
    let mounted_instance: GalleryInstance | undefined
    try {
        scene.background = bgColor
        scene.fog = new THREE.Fog(bgColor, 5, 12)

        const aspect = width / height
        const camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 100)
        const orbital = {
            theta: DEFAULT_THETA,
            phi: DEFAULT_PHI,
            radius: DEFAULT_RADIUS,
            targetTheta: DEFAULT_THETA,
            targetPhi: DEFAULT_PHI,
            targetRadius: DEFAULT_RADIUS,
        }
        updateCameraPosition(camera, orbital, true)

        const ambientLight = new THREE.AmbientLight(0x404040)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(5, 10, 7.5)
        scene.add(directionalLight)

        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3)
        fillLight.position.set(-5, 0, 5)
        scene.add(fillLight)

        const roomMaterials = createRoomMaterials()
        createRoom(scene, roomMaterials)

        const frameMeshes = createFrameMeshes(
            scene,
            frameDefs,
            borderColor,
            placeholderColor
        )
        const labelMeshes = createLabelMeshes(scene, frameDefs)

        const instance: GalleryInstance = {
            renderer,
            scene,
            camera,
            frameMeshes,
            labelMeshes,
            frameKeys: frameDefs.map((f) => f.key),
            orbital,
            isDragging: false,
            previousMouse: { x: 0, y: 0 },
            pointer: new THREE.Vector2(),
            raycaster: new THREE.Raycaster(),
            disposed: false,
            active: true,
            visible: true,
            reduced_motion: window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches,
            request_render: () => {},
            cleanup_render: () => {},
            texture_versions: new Map(),
            object_urls: new Set(),
            image_settings: {},
            on_texture_state: null,
            on_close: null,
            onClickFrame: null,
            onClickLabel: null,
            onHoverFrame: null,
            onResizeCleanup: null,
            onThemeCleanup: null,
            _cleanupInteraction: undefined,
            _cleanupKeys: undefined,
            focusTargetPosition: null,
            focusTargetQuaternion: null,
            focusFrameGroup: null,
            focusDistance: FOCUS_DISTANCE_DEFAULT,
            focusApproachDirection: null,
            focusHandoffPending: false,
        }

        mounted_instance = instance
        setupInteraction(renderer.domElement, instance)
        setupKeyboard(instance, container.parentElement ?? container)
        const themeObserver = new MutationObserver(() => {
            applyThemeToRoom(scene, roomMaterials)
            instance.request_render()
        })
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class", "data-theme", "style"],
        })
        instance.onThemeCleanup = () => themeObserver.disconnect()
        renderer.render(scene, camera)
        startAnimationLoop(instance)

        const onResize = () => {
            const w = container.clientWidth
            const h = container.clientHeight
            if (w === 0 || h === 0) return
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h)
            instance.request_render()
        }
        const resize_observer = new ResizeObserver(onResize)
        resize_observer.observe(container)
        instance.onResizeCleanup = () => {
            resize_observer.disconnect()
        }

        return instance
    } catch (error) {
        if (mounted_instance !== undefined)
            cleanupGalleryScene(mounted_instance)
        else {
            disposeScene(scene)
            renderer.dispose()
            renderer.domElement.remove()
        }
        throw error
    }
}

export const cleanupGalleryScene = (instance: GalleryInstance): void => {
    instance.disposed = true
    cleanupInteraction(instance)
    if (instance._cleanupKeys !== undefined) {
        instance._cleanupKeys()
    }
    if (instance.onResizeCleanup !== null) {
        instance.onResizeCleanup()
    }
    if (instance.onThemeCleanup !== null) {
        instance.onThemeCleanup()
    }
    instance.cleanup_render()
    disposeScene(instance.scene)
    for (const url of instance.object_urls) URL.revokeObjectURL(url)
    instance.object_urls.clear()
    instance.renderer.dispose()
    instance.renderer.domElement.remove()
}

const disposeScene = (scene: THREE.Scene): void => {
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const textures = new Set<THREE.Texture>()
    scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        geometries.add(object.geometry)
        const mesh_materials = Array.isArray(object.material)
            ? object.material
            : [object.material]
        for (const material of mesh_materials) {
            materials.add(material)
            if (
                (material instanceof THREE.MeshBasicMaterial ||
                    material instanceof THREE.MeshStandardMaterial) &&
                material.map !== null
            )
                textures.add(material.map)
        }
    })
    for (const texture of textures) texture.dispose()
    for (const material of materials) material.dispose()
    for (const geometry of geometries) geometry.dispose()
}

const cameraLookAtMatrix = new THREE.Matrix4()
const cameraLookAtQuaternion = new THREE.Quaternion()
const ROOM_CENTER = new THREE.Vector3(0, GOLDEN_RATIO / 2, 0)
const WORLD_UP = new THREE.Vector3(0, 1, 0)

const updateCameraPosition = (
    camera: THREE.PerspectiveCamera,
    orbital: GalleryInstance["orbital"],
    snap: boolean = false,
    damping: number = DAMPING
): void => {
    camera.position.x =
        orbital.radius * Math.sin(orbital.phi) * Math.sin(orbital.theta)
    camera.position.y = orbital.radius * Math.cos(orbital.phi)
    camera.position.z =
        orbital.radius * Math.sin(orbital.phi) * Math.cos(orbital.theta)
    cameraLookAtMatrix.lookAt(camera.position, ROOM_CENTER, WORLD_UP)
    cameraLookAtQuaternion.setFromRotationMatrix(cameraLookAtMatrix)
    if (snap) {
        camera.quaternion.copy(cameraLookAtQuaternion)
    } else {
        camera.quaternion.slerp(cameraLookAtQuaternion, damping)
    }
}

const createFrameMeshes = (
    scene: THREE.Scene,
    frameDefs: ReadonlyArray<FrameDef>,
    borderColor: THREE.Color,
    placeholderColor: THREE.Color
): ReadonlyArray<Readonly<{ key: string; group: THREE.Group }>> =>
    frameDefs.map((def) => {
        const group = new THREE.Group()
        group.position.set(def.position[0], def.position[1], def.position[2])
        group.rotation.set(def.rotation[0], def.rotation[1], def.rotation[2])
        group.userData.frameKey = def.key

        const borderGeo = new THREE.BoxGeometry(1, GOLDEN_RATIO, 0.05)
        const borderMat = new THREE.MeshStandardMaterial({
            color: borderColor,
            metalness: 0.5,
            roughness: 0.5,
        })
        const borderMesh = new THREE.Mesh(borderGeo, borderMat)
        borderMesh.position.set(0, GOLDEN_RATIO / 2, 0)
        borderMesh.userData.frameKey = def.key
        group.add(borderMesh)

        const matGeo = new THREE.BoxGeometry(0.9, 0.93 * GOLDEN_RATIO, 0.04)
        const matMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            toneMapped: false,
        })
        const matMesh = new THREE.Mesh(matGeo, matMat)
        matMesh.position.set(0, GOLDEN_RATIO / 2, 0.05)
        matMesh.userData.frameKey = def.key
        matMesh.userData.isMat = true
        group.add(matMesh)

        const imageGeo = new THREE.PlaneGeometry(0.85, 0.85 * GOLDEN_RATIO)
        const imageMat = new THREE.MeshBasicMaterial({
            color: placeholderColor,
            toneMapped: false,
            side: THREE.DoubleSide,
        })
        const imageMesh = new THREE.Mesh(imageGeo, imageMat)
        imageMesh.position.set(0, GOLDEN_RATIO / 2, 0.075)
        imageMesh.userData.frameKey = def.key
        imageMesh.userData.isImage = true
        group.add(imageMesh)

        scene.add(group)

        return { key: def.key, group }
    })

export const loadGalleryTextures = (
    instance: GalleryInstance,
    frame_defs: ReadonlyArray<FrameDef>
): void => {
    for (const frame of frame_defs) {
        instance.on_texture_state?.(frame.key, "loading")
        const loading = setFrameTexture(instance, frame.key, frame.url)
        const version = instance.texture_versions.get(frame.key)
        const report = (status: "loaded" | "failed") => {
            if (
                !instance.disposed &&
                instance.texture_versions.get(frame.key) === version
            )
                instance.on_texture_state?.(frame.key, status)
        }
        void loading.catch(() => report("failed"))
    }
}

const findImageMesh = (group: THREE.Group): THREE.Mesh | undefined => {
    for (const child of group.children) {
        if (child instanceof THREE.Mesh && child.userData.isImage === true) {
            return child
        }
    }
    return undefined
}

export const setFrameTexture = async (
    instance: GalleryInstance,
    frameKey: string,
    url: string
): Promise<void> => {
    const frame = instance.frameMeshes.find(
        (frameMesh) => frameMesh.key === frameKey
    )
    if (frame === undefined) {
        throw new Error(`Frame not found: ${frameKey}`)
    }
    const imageMesh = findImageMesh(frame.group)
    if (imageMesh === undefined) {
        throw new Error(`Image mesh not found: ${frameKey}`)
    }
    const material = imageMesh.material
    if (!(material instanceof THREE.MeshBasicMaterial)) {
        throw new Error(`Unexpected image material: ${frameKey}`)
    }
    const version = (instance.texture_versions.get(frameKey) ?? 0) + 1
    instance.texture_versions.set(frameKey, version)
    const texture = await new THREE.TextureLoader().loadAsync(url)
    if (
        instance.disposed ||
        instance.texture_versions.get(frameKey) !== version
    ) {
        texture.dispose()
        throw new Error("Image load was superseded or the gallery was closed.")
    }
    texture.colorSpace = THREE.SRGBColorSpace
    if (material.map !== null) {
        material.map.dispose()
    }
    material.map = texture
    material.color.set(0xffffff)
    material.needsUpdate = true
    applyImageSettings(instance, frameKey)
    instance.on_texture_state?.(frameKey, "loaded")
    instance.request_render()
}

const createLabelMeshes = (
    scene: THREE.Scene,
    frameDefs: ReadonlyArray<FrameDef>
): ReadonlyArray<THREE.Mesh> =>
    frameDefs.map((def) => {
        const texture = createLabelTexture(
            getGalleryText(def.key) ?? {
                title: def.label,
                artist: "",
                year: "",
                medium: "",
                dimensions: "",
                price: "",
                description: "",
            }
        )

        const geo = new THREE.PlaneGeometry(
            LABEL_PLANE_WIDTH,
            LABEL_PLANE_HEIGHT
        )
        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            toneMapped: false,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.name = def.key

        const ry = def.rotation[1]
        const isWallAlongX = Math.abs(Math.cos(ry)) > 0.5
        const sideDirection = isWallAlongX
            ? Math.sign(def.position[0]) || 1
            : Math.sign(def.position[2]) || 1

        mesh.position.set(
            isWallAlongX
                ? def.position[0] + sideDirection * LABEL_SIDE_OFFSET
                : def.position[0] + LABEL_FORWARD_OFFSET * Math.sin(ry),
            GOLDEN_RATIO / 2,
            isWallAlongX
                ? def.position[2] + LABEL_FORWARD_OFFSET * Math.cos(ry)
                : def.position[2] + sideDirection * LABEL_SIDE_OFFSET
        )
        mesh.rotation.set(def.rotation[0], def.rotation[1], def.rotation[2])
        mesh.userData.frameKey = def.key
        mesh.userData.isLabel = true

        scene.add(mesh)
        return mesh
    })

const createLabelTexture = (text: GalleryText): THREE.CanvasTexture => {
    const canvas = document.createElement("canvas")
    canvas.width = LABEL_CANVAS_WIDTH
    canvas.height = LABEL_CANVAS_HEIGHT
    const ctx = canvas.getContext("2d")
    if (ctx === null) throw new Error("Artwork labels could not be rendered.")
    ctx.textBaseline = "top"
    ctx.textAlign = "left"
    ctx.fillStyle = LABEL_BACKGROUND
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = LABEL_BORDER
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
    let y = LABEL_PADDING_Y
    for (const { value, font, color, limit, gap } of [
        {
            value: text.title,
            font: LABEL_TITLE_FONT,
            color: LABEL_TEXT,
            limit: 4,
            gap: 40,
        },
        {
            value: text.artist,
            font: LABEL_ARTIST_FONT,
            color: LABEL_MUTED_TEXT,
            limit: 3,
            gap: 32,
        },
    ]) {
        const lines = wrapText(
            ctx,
            value,
            canvas.width - LABEL_PADDING_X * 2,
            font
        )
        ctx.font = font
        ctx.fillStyle = color
        lines.slice(0, limit).forEach((line, index) => {
            ctx.fillText(
                index === limit - 1 && lines.length > limit
                    ? `${line.slice(0, -1)}…`
                    : line,
                LABEL_PADDING_X,
                y,
                canvas.width - LABEL_PADDING_X * 2
            )
            y += gap
        })
        y += LABEL_LINE_GAP
    }
    ctx.font = LABEL_OVERVIEW_FONT
    ctx.fillStyle = LABEL_MUTED_TEXT
    ctx.fillText("View details →", LABEL_PADDING_X, canvas.height - 36)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
}

const ImageDimensions = Schema.Struct({
    width: Schema.Number.check(Schema.isGreaterThan(0)),
    height: Schema.Number.check(Schema.isGreaterThan(0)),
})

const applyImageSettings = (
    instance: GalleryInstance,
    frame_key: string
): void => {
    const frame = instance.frameMeshes.find(
        (candidate) => candidate.key === frame_key
    )
    if (frame === undefined) return
    const mesh = findImageMesh(frame.group)
    if (
        mesh === undefined ||
        !(mesh.material instanceof THREE.MeshBasicMaterial) ||
        mesh.material.map === null
    )
        return
    const texture = mesh.material.map
    const source: unknown = texture.image
    const dimensions = Schema.decodeUnknownOption(ImageDimensions)(source)
    if (Option.isNone(dimensions)) return
    const layout = image_layout(
        dimensions.value.width,
        dimensions.value.height,
        instance.image_settings[frame_key] ?? default_image_settings
    )
    mesh.scale.set(layout.scale_x, layout.scale_y, 1)
    texture.repeat.set(layout.repeat_x, layout.repeat_y)
    texture.offset.set(layout.offset_x, layout.offset_y)
}

export const syncScene = (
    instance: GalleryInstance,
    settings: {
        readonly active: boolean
        readonly text_overrides: Readonly<Record<string, GalleryText>>
        readonly image_settings: Readonly<Record<string, ImageSettings>>
    }
): void => {
    instance.active = settings.active
    instance.image_settings = settings.image_settings
    for (const frame_key of instance.frameKeys)
        applyImageSettings(instance, frame_key)
    for (const label of instance.labelMeshes) {
        const text =
            settings.text_overrides[label.name] ?? getGalleryText(label.name)
        if (
            text === undefined ||
            !(label.material instanceof THREE.MeshBasicMaterial)
        )
            continue
        const signature = JSON.stringify([text.title, text.artist])
        if (label.userData.text_signature === signature) continue
        label.material.map?.dispose()
        label.material.map = createLabelTexture(text)
        label.material.needsUpdate = true
        label.userData.text_signature = signature
    }
    instance.request_render()
}

const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: string
): ReadonlyArray<string> => {
    ctx.font = font

    const words = text.split(" ")
    const lines: Array<string> = []
    let currentLine = ""

    words.forEach((word) => {
        const testLine = currentLine === "" ? word : `${currentLine} ${word}`
        if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine
            return
        }

        if (currentLine !== "") {
            lines.push(currentLine)
        }
        currentLine = word
    })

    if (currentLine !== "") {
        lines.push(currentLine)
    }

    return lines
}

const CLICK_THRESHOLD = 5

export const focusCameraOn = (
    instance: GalleryInstance,
    group: THREE.Group,
    distance: number = FOCUS_DISTANCE_DEFAULT,
    approachDirection: THREE.Vector3 | null = null
): void => {
    instance.focusFrameGroup = group
    instance.focusDistance = Math.max(MIN_FOCUS_DISTANCE, distance)
    instance.focusApproachDirection = approachDirection
    instance.focusHandoffPending = false
    updateFocusTarget(instance)
    instance.request_render()
}

const findFacingFrame = (
    instance: GalleryInstance
):
    | Readonly<{
          group: THREE.Group
          distance: number
          approachDirection: THREE.Vector3
      }>
    | undefined => {
    const cameraPosition = instance.camera.position
    const forward = new THREE.Vector3()
    instance.camera.getWorldDirection(forward)

    return instance.frameMeshes.reduce<
        | Readonly<{
              group: THREE.Group
              distance: number
              approachDirection: THREE.Vector3
              alignment: number
          }>
        | undefined
    >((best, frame) => {
        const toAnchor = new THREE.Vector3(0, GOLDEN_RATIO / 2, 0)
        frame.group.localToWorld(toAnchor)
        toAnchor.sub(cameraPosition)
        const distance = toAnchor.length()
        if (distance === 0) {
            return best
        }
        const alignment = toAnchor.dot(forward) / distance
        if (
            alignment <= 0 ||
            (best !== undefined && alignment <= best.alignment)
        ) {
            return best
        }
        return {
            group: frame.group,
            distance,
            approachDirection: toAnchor.multiplyScalar(-1).normalize(),
            alignment,
        }
    }, undefined)
}

const updateFocusTarget = (instance: GalleryInstance): void => {
    const group = instance.focusFrameGroup
    if (group === null) {
        return
    }
    const anchor = new THREE.Vector3(0, GOLDEN_RATIO / 2, 0)
    group.localToWorld(anchor)
    const frameQuaternion = new THREE.Quaternion()
    group.getWorldQuaternion(frameQuaternion)
    const normalDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
        frameQuaternion
    )

    const blend = Math.max(
        0,
        Math.min(
            1,
            (FOCUS_BLEND_OUTER_DISTANCE - instance.focusDistance) /
                (FOCUS_BLEND_OUTER_DISTANCE - FOCUS_DISTANCE_DEFAULT)
        )
    )
    const approachDirection =
        instance.focusApproachDirection === null
            ? normalDirection
            : instance.focusApproachDirection
                  .clone()
                  .lerp(normalDirection, blend)
                  .normalize()

    const targetPosition = anchor
        .clone()
        .add(approachDirection.multiplyScalar(instance.focusDistance))

    cameraLookAtMatrix.lookAt(targetPosition, anchor, WORLD_UP)

    instance.focusTargetPosition = targetPosition
    instance.focusTargetQuaternion =
        new THREE.Quaternion().setFromRotationMatrix(cameraLookAtMatrix)
}

const getFocusOuterDistance = (instance: GalleryInstance): number | null => {
    const group = instance.focusFrameGroup
    if (group === null) {
        return null
    }

    const anchor = new THREE.Vector3(0, GOLDEN_RATIO / 2, 0)
    group.localToWorld(anchor)
    const frameQuaternion = new THREE.Quaternion()
    group.getWorldQuaternion(frameQuaternion)
    const normalDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
        frameQuaternion
    )
    const approachDirection =
        instance.focusApproachDirection === null
            ? normalDirection
            : instance.focusApproachDirection

    const projection = anchor.dot(approachDirection)
    const discriminant =
        projection * projection + MAX_RADIUS * MAX_RADIUS - anchor.lengthSq()
    if (discriminant < 0) {
        return null
    }

    return -projection + Math.sqrt(discriminant)
}

const handoffFocusToOrbital = (instance: GalleryInstance): void => {
    instance.focusTargetPosition = null
    instance.focusTargetQuaternion = null
    instance.focusFrameGroup = null
    instance.focusApproachDirection = null
    instance.focusHandoffPending = false
    syncOrbitalToCamera(instance)
    instance.orbital.targetRadius = MAX_RADIUS
}

const syncOrbitalToCamera = (instance: GalleryInstance): void => {
    const position = instance.camera.position
    const radius = position.length()
    if (radius === 0) {
        return
    }
    const o = instance.orbital
    o.radius = radius
    o.phi = Math.acos(position.y / radius)
    o.theta = Math.atan2(position.x, position.z)
    o.targetRadius = radius
    o.targetPhi = o.phi
    o.targetTheta = o.theta
}

export const resetCamera = (instance: GalleryInstance): void => {
    const o = instance.orbital
    o.theta = DEFAULT_THETA
    o.phi = DEFAULT_PHI
    o.radius = DEFAULT_RADIUS
    o.targetTheta = DEFAULT_THETA
    o.targetPhi = DEFAULT_PHI
    o.targetRadius = DEFAULT_RADIUS
    instance.focusFrameGroup = null
    instance.focusApproachDirection = null
    instance.focusHandoffPending = false

    const homePosition = new THREE.Vector3(
        DEFAULT_RADIUS * Math.sin(DEFAULT_PHI) * Math.sin(DEFAULT_THETA),
        DEFAULT_RADIUS * Math.cos(DEFAULT_PHI),
        DEFAULT_RADIUS * Math.sin(DEFAULT_PHI) * Math.cos(DEFAULT_THETA)
    )
    const lookAtMatrix = new THREE.Matrix4().lookAt(
        homePosition,
        ROOM_CENTER,
        new THREE.Vector3(0, 1, 0)
    )
    instance.focusTargetPosition = homePosition
    instance.focusTargetQuaternion =
        new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix)
    instance.request_render()
}

export const animateFrame = (instance: GalleryInstance): void => {
    if (instance.disposed) {
        return
    }

    if (
        instance.focusTargetPosition !== null &&
        instance.focusTargetQuaternion !== null
    ) {
        if (instance.reduced_motion) {
            instance.camera.position.copy(instance.focusTargetPosition)
            instance.camera.quaternion.copy(instance.focusTargetQuaternion)
        } else {
            instance.camera.position.lerp(instance.focusTargetPosition, DAMPING)
            instance.camera.quaternion.slerp(
                instance.focusTargetQuaternion,
                DAMPING
            )
        }
        if (
            instance.focusHandoffPending &&
            instance.camera.position.distanceTo(instance.focusTargetPosition) <=
                FOCUS_HANDOFF_POSITION_EPSILON &&
            instance.camera.quaternion.angleTo(
                instance.focusTargetQuaternion
            ) <= FOCUS_HANDOFF_ROTATION_EPSILON
        ) {
            handoffFocusToOrbital(instance)
        }
    } else {
        const o = instance.orbital
        const damping = instance.reduced_motion ? 1 : DAMPING
        o.theta += (o.targetTheta - o.theta) * damping
        o.phi += (o.targetPhi - o.phi) * damping
        o.radius += (o.targetRadius - o.radius) * damping
        o.phi = Math.max(MIN_PHI, Math.min(MAX_PHI, o.phi))
        o.radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, o.radius))

        updateCameraPosition(instance.camera, o, false, damping)
    }

    instance.renderer.render(instance.scene, instance.camera)
}

export const startAnimationLoop = (instance: GalleryInstance): void => {
    let animation_id: number | undefined
    const previous_position = new THREE.Vector3()
    const previous_rotation = new THREE.Quaternion()
    const can_render = () =>
        !instance.disposed &&
        instance.active &&
        instance.visible &&
        !document.hidden
    const animate = () => {
        animation_id = undefined
        if (!can_render()) return
        previous_position.copy(instance.camera.position)
        previous_rotation.copy(instance.camera.quaternion)
        animateFrame(instance)
        if (
            instance.camera.position.distanceToSquared(previous_position) >
                0.00000001 ||
            instance.camera.quaternion.angleTo(previous_rotation) > 0.0001
        ) {
            instance.request_render()
        }
    }
    instance.request_render = () => {
        if (!can_render()) {
            if (animation_id !== undefined) cancelAnimationFrame(animation_id)
            animation_id = undefined
        } else if (animation_id === undefined) {
            animation_id = requestAnimationFrame(animate)
        }
    }
    const motion_query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on_motion = () => {
        instance.reduced_motion = motion_query.matches
        instance.request_render()
    }
    const on_visibility = () => instance.request_render()
    const observer = new IntersectionObserver((entries) => {
        instance.visible = entries.some((entry) => entry.isIntersecting)
        instance.request_render()
    })
    observer.observe(instance.renderer.domElement)
    document.addEventListener("visibilitychange", on_visibility)
    motion_query.addEventListener("change", on_motion)
    instance.cleanup_render = () => {
        if (animation_id !== undefined) cancelAnimationFrame(animation_id)
        observer.disconnect()
        document.removeEventListener("visibilitychange", on_visibility)
        motion_query.removeEventListener("change", on_motion)
    }
    instance.request_render()
}

export const setupInteraction = (
    canvas: HTMLCanvasElement,
    instance: GalleryInstance
): void => {
    const pointerNDC = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        return {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
        }
    }

    let pointerDownX = 0
    let pointerDownY = 0
    let active_pointer: number | undefined
    let dragged = false

    const onPointerDown = (event: PointerEvent) => {
        if (
            !instance.active ||
            active_pointer !== undefined ||
            event.button !== 0
        )
            return
        active_pointer = event.pointerId
        dragged = false
        canvas.setPointerCapture(event.pointerId)
        canvas.focus({ preventScroll: true })
        pointerDownX = event.clientX
        pointerDownY = event.clientY
        const ndc = pointerNDC(event)
        instance.pointer.x = ndc.x
        instance.pointer.y = ndc.y
        instance.isDragging = true
        instance.previousMouse = { x: event.clientX, y: event.clientY }
    }

    const onPointerMove = (event: PointerEvent) => {
        if (event.pointerId !== active_pointer) return
        instance.request_render()
        if (
            Math.hypot(
                event.clientX - pointerDownX,
                event.clientY - pointerDownY
            ) > CLICK_THRESHOLD
        )
            dragged = true
        const ndc = pointerNDC(event)
        instance.pointer.x = ndc.x
        instance.pointer.y = ndc.y

        if (instance.isDragging) {
            if (instance.focusTargetPosition !== null) {
                const totalDx = event.clientX - pointerDownX
                const totalDy = event.clientY - pointerDownY
                if (
                    Math.sqrt(totalDx * totalDx + totalDy * totalDy) >
                    CLICK_THRESHOLD
                ) {
                    instance.focusTargetPosition = null
                    instance.focusTargetQuaternion = null
                    instance.focusFrameGroup = null
                    instance.focusApproachDirection = null
                    instance.focusHandoffPending = false
                    syncOrbitalToCamera(instance)
                }
            }

            const dx = event.clientX - instance.previousMouse.x
            const dy = event.clientY - instance.previousMouse.y
            instance.orbital.targetTheta += dx * ROTATE_SPEED
            instance.orbital.targetPhi += dy * ROTATE_SPEED
            instance.orbital.targetPhi = Math.max(
                MIN_PHI,
                Math.min(MAX_PHI, instance.orbital.targetPhi)
            )
            instance.previousMouse = { x: event.clientX, y: event.clientY }
        }
    }

    const cancel_pointer = () => {
        instance.isDragging = false
        const pointer_id = active_pointer
        active_pointer = undefined
        if (pointer_id !== undefined && canvas.hasPointerCapture(pointer_id))
            canvas.releasePointerCapture(pointer_id)
    }
    const onPointerUp = (event: PointerEvent) => {
        if (active_pointer !== event.pointerId) return
        cancel_pointer()

        const dx = event.clientX - pointerDownX
        const dy = event.clientY - pointerDownY

        if (dragged || Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) {
            return
        }

        const ndc = pointerNDC(event)
        instance.pointer.x = ndc.x
        instance.pointer.y = ndc.y

        instance.raycaster.setFromCamera(instance.pointer, instance.camera)
        const intersects = instance.raycaster.intersectObjects(
            instance.scene.children,
            true
        )

        for (const intersection of intersects) {
            const obj = intersection.object
            const frameKey: unknown = obj.userData.frameKey

            if (typeof frameKey === "string" && obj.userData.isLabel === true) {
                if (instance.onClickLabel !== null) {
                    instance.onClickLabel(frameKey)
                    return
                }
            }

            if (
                typeof frameKey === "string" &&
                instance.onClickFrame !== null
            ) {
                instance.onClickFrame(frameKey)
                return
            }
        }
    }

    const onWheel = (event: WheelEvent) => {
        if (!instance.active || event.ctrlKey) return
        event.preventDefault()
        instance.request_render()

        if (
            instance.focusTargetPosition !== null &&
            instance.focusFrameGroup !== null
        ) {
            const focusOuterDistance = getFocusOuterDistance(instance)
            const maximumFocusDistance =
                focusOuterDistance === null
                    ? instance.focusDistance
                    : Math.max(MIN_FOCUS_DISTANCE, focusOuterDistance)
            instance.focusDistance = Math.max(
                MIN_FOCUS_DISTANCE,
                Math.min(
                    maximumFocusDistance,
                    instance.focusDistance *
                        (1 + event.deltaY * FOCUS_ZOOM_SPEED)
                )
            )
            updateFocusTarget(instance)

            instance.focusHandoffPending =
                event.deltaY > 0 &&
                instance.focusDistance >= maximumFocusDistance
            return
        }

        if (event.deltaY < 0) {
            const facing = findFacingFrame(instance)
            if (facing !== undefined) {
                focusCameraOn(
                    instance,
                    facing.group,
                    facing.distance,
                    facing.approachDirection
                )
                return
            }
        }

        instance.orbital.targetRadius += event.deltaY * ZOOM_SPEED
        instance.orbital.targetRadius = Math.max(
            MIN_RADIUS,
            Math.min(MAX_RADIUS, instance.orbital.targetRadius)
        )
    }

    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerup", onPointerUp)
    canvas.addEventListener("pointercancel", cancel_pointer)
    canvas.addEventListener("lostpointercapture", cancel_pointer)
    canvas.addEventListener("wheel", onWheel, { passive: false })

    instance._cleanupInteraction = () => {
        canvas.removeEventListener("pointerdown", onPointerDown)
        canvas.removeEventListener("pointermove", onPointerMove)
        cancel_pointer()
        canvas.removeEventListener("pointerup", onPointerUp)
        canvas.removeEventListener("pointercancel", cancel_pointer)
        canvas.removeEventListener("lostpointercapture", cancel_pointer)
        canvas.removeEventListener("wheel", onWheel)
    }
}

const cleanupInteraction = (instance: GalleryInstance): void => {
    if (instance._cleanupInteraction !== undefined) {
        instance._cleanupInteraction()
    }
}

export const setupKeyboard = (
    instance: GalleryInstance,
    root: HTMLElement
): void => {
    const onKeydown = (event: KeyboardEvent) => {
        if (
            !instance.active ||
            event.defaultPrevented ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            (event.target instanceof Element &&
                event.target.closest(
                    "input, textarea, select, [contenteditable]"
                ))
        )
            return
        if (event.key === "Escape") {
            instance.on_close?.()
            instance.renderer.domElement.focus({ preventScroll: true })
            return
        }
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
            return
        }

        const currentKey = instance.frameMeshes.find(
            ({ group }) => group === instance.focusFrameGroup
        )?.key
        const idx =
            currentKey === undefined
                ? event.key === "ArrowRight"
                    ? -1
                    : 0
                : instance.frameKeys.indexOf(currentKey)

        const offset = event.key === "ArrowRight" ? 1 : -1
        const nextIdx =
            (idx + offset + instance.frameKeys.length) %
            instance.frameKeys.length

        event.preventDefault()
        const nextKey = instance.frameKeys[nextIdx]
        if (instance.onClickFrame !== null && nextKey !== undefined) {
            instance.onClickFrame(nextKey)
        }
    }

    root.addEventListener("keydown", onKeydown)
    instance._cleanupKeys = () => {
        root.removeEventListener("keydown", onKeydown)
    }
}
