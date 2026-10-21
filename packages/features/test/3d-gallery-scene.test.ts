import { GlobalRegistrator } from "@happy-dom/global-registrator"
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from "vitest"
import * as THREE from "three"
import type { GalleryInstance } from "../src/labs/3d-gallery-edit/host.ts"
import {
    cleanupGalleryScene,
    setFrameTexture,
    setupKeyboard,
    setupInteraction,
    startAnimationLoop,
} from "../src/labs/3d-gallery-edit/scene.ts"

vi.mock("three", async (original) => {
    const three = await original<typeof import("three")>()
    return {
        ...three,
        WebGLRenderer: class {
            domElement = document.createElement("canvas")
            render = vi.fn()
            dispose = vi.fn()
        },
    }
})

beforeAll(() => GlobalRegistrator.register())
afterAll(() => GlobalRegistrator.unregister())
afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

const instance = (): GalleryInstance => {
    const group = new THREE.Group()
    const image = new THREE.Mesh(
        new THREE.PlaneGeometry(),
        new THREE.MeshBasicMaterial()
    )
    image.userData.isImage = true
    group.add(image)
    const scene = new THREE.Scene()
    scene.add(group)
    return {
        renderer: new THREE.WebGLRenderer(),
        scene,
        camera: new THREE.PerspectiveCamera(),
        frameMeshes: [{ key: "bridge", group }],
        labelMeshes: [],
        frameKeys: ["bridge", "city"],
        orbital: {
            theta: Math.PI,
            phi: Math.PI / 4,
            radius: 2.5,
            targetTheta: Math.PI,
            targetPhi: Math.PI / 4,
            targetRadius: 2.5,
        },
        isDragging: false,
        previousMouse: { x: 0, y: 0 },
        pointer: new THREE.Vector2(),
        raycaster: new THREE.Raycaster(),
        disposed: false,
        active: true,
        visible: true,
        reduced_motion: false,
        request_render: vi.fn(),
        cleanup_render: vi.fn(),
        texture_versions: new Map(),
        image_settings: {},
        object_urls: new Set(),
        on_texture_state: null,
        on_close: vi.fn(),
        onClickFrame: vi.fn(),
        onClickLabel: null,
        onHoverFrame: null,
        onResizeCleanup: null,
        onThemeCleanup: null,
        _cleanupInteraction: undefined,
        _cleanupKeys: undefined,
        focusTargetPosition: null,
        focusTargetQuaternion: null,
        focusFrameGroup: null,
        focusDistance: 1.25,
        focusApproachDirection: null,
        focusHandoffPending: false,
    }
}

describe("gallery scene lifecycle and input", () => {
    it("scopes shortcuts to the gallery and leaves text inputs alone", () => {
        const gallery = instance()
        const root = document.createElement("section")
        const input = document.createElement("input")
        root.append(input, gallery.renderer.domElement)
        setupKeyboard(gallery, root)
        const key = () =>
            new KeyboardEvent("keydown", {
                key: "ArrowRight",
                bubbles: true,
                cancelable: true,
            })
        input.dispatchEvent(key())
        window.dispatchEvent(key())
        expect(gallery.onClickFrame).not.toHaveBeenCalled()
        gallery.renderer.domElement.dispatchEvent(key())
        expect(gallery.onClickFrame).toHaveBeenCalledWith("bridge")
        gallery.renderer.domElement.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        )
        expect(gallery.on_close).toHaveBeenCalledOnce()
        gallery.active = false
        gallery.renderer.domElement.dispatchEvent(key())
        expect(gallery.onClickFrame).toHaveBeenCalledOnce()
        gallery._cleanupKeys?.()
    })

    it("cancels a captured drag without selecting an artwork", () => {
        const gallery = instance()
        const canvas = gallery.renderer.domElement
        const capture = vi.fn()
        const release = vi.fn()
        Object.defineProperties(canvas, {
            setPointerCapture: { value: capture },
            releasePointerCapture: { value: release },
            hasPointerCapture: { value: () => true },
        })
        setupInteraction(canvas, gallery)
        canvas.dispatchEvent(
            new PointerEvent("pointerdown", { pointerId: 1, button: 0 })
        )
        expect(gallery.isDragging).toBe(true)
        expect(capture).toHaveBeenCalledWith(1)
        canvas.dispatchEvent(
            new PointerEvent("pointercancel", { pointerId: 1 })
        )
        canvas.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }))
        expect(gallery.isDragging).toBe(false)
        expect(gallery.onClickFrame).not.toHaveBeenCalled()
        expect(release).toHaveBeenCalledWith(1)
        gallery._cleanupInteraction?.()
    })

    it("discards superseded textures and textures that finish after teardown", async () => {
        const gallery = instance()
        const first = Promise.withResolvers<THREE.Texture<HTMLImageElement>>()
        const second = Promise.withResolvers<THREE.Texture<HTMLImageElement>>()
        vi.spyOn(THREE.TextureLoader.prototype, "loadAsync")
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise)
        const old_texture = new THREE.Texture(document.createElement("img"))
        const new_texture = new THREE.Texture(document.createElement("img"))
        const old_dispose = vi.spyOn(old_texture, "dispose")
        const new_dispose = vi.spyOn(new_texture, "dispose")
        const old_load = setFrameTexture(gallery, "bridge", "old")
        const new_load = setFrameTexture(gallery, "bridge", "new")
        second.resolve(new_texture)
        await new_load
        first.resolve(old_texture)
        await expect(old_load).rejects.toThrow("superseded")
        expect(old_dispose).toHaveBeenCalledOnce()
        cleanupGalleryScene(gallery)
        expect(new_dispose).toHaveBeenCalledOnce()

        const late = Promise.withResolvers<THREE.Texture<HTMLImageElement>>()
        vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockReturnValue(
            late.promise
        )
        const closed = instance()
        const pending = setFrameTexture(closed, "bridge", "late")
        cleanupGalleryScene(closed)
        const late_texture = new THREE.Texture(document.createElement("img"))
        const late_dispose = vi.spyOn(late_texture, "dispose")
        late.resolve(late_texture)
        await expect(pending).rejects.toThrow("closed")
        expect(late_dispose).toHaveBeenCalledOnce()
    })

    it("stops scheduling when settled or hidden and honors reduced motion", () => {
        const gallery = instance()
        const callbacks = new Map<number, FrameRequestCallback>()
        let next_id = 0
        vi.stubGlobal(
            "requestAnimationFrame",
            (callback: FrameRequestCallback) => {
                callbacks.set(++next_id, callback)
                return next_id
            }
        )
        vi.stubGlobal("cancelAnimationFrame", (id: number) =>
            callbacks.delete(id)
        )
        vi.stubGlobal(
            "IntersectionObserver",
            class {
                observe() {}
                disconnect() {}
            }
        )
        vi.spyOn(document, "hidden", "get").mockReturnValue(false)
        startAnimationLoop(gallery)
        for (let i = 0; i < 1000 && callbacks.size > 0; i++) {
            const frame_callbacks = [...callbacks]
            for (const [id, callback] of frame_callbacks) {
                callbacks.delete(id)
                callback(i * 16)
            }
        }
        expect(callbacks.size).toBe(0)
        gallery.active = false
        gallery.request_render()
        expect(callbacks.size).toBe(0)
        gallery.active = true
        gallery.reduced_motion = true
        gallery.focusTargetPosition = new THREE.Vector3(1, 1, 1)
        gallery.focusTargetQuaternion = new THREE.Quaternion()
        gallery.request_render()
        const frame_callbacks = [...callbacks]
        for (const [id, callback] of frame_callbacks) {
            callbacks.delete(id)
            callback(0)
        }
        expect(
            gallery.camera.position.equals(gallery.focusTargetPosition)
        ).toBe(true)
        cleanupGalleryScene(gallery)
        expect(callbacks.size).toBe(0)
    })
})
