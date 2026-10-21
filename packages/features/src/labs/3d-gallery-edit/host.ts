import type * as THREE from "three"
import type { ImageSettings } from "./gallery.presentation.ts"

export interface OrbitalState {
    theta: number
    phi: number
    radius: number
    targetTheta: number
    targetPhi: number
    targetRadius: number
}

export interface GalleryInstance {
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    frameMeshes: ReadonlyArray<Readonly<{ key: string; group: THREE.Group }>>
    labelMeshes: ReadonlyArray<THREE.Mesh>
    frameKeys: ReadonlyArray<string>
    orbital: OrbitalState
    isDragging: boolean
    previousMouse: Readonly<{ x: number; y: number }>
    pointer: THREE.Vector2
    raycaster: THREE.Raycaster
    disposed: boolean
    active: boolean
    visible: boolean
    reduced_motion: boolean
    request_render: () => void
    cleanup_render: () => void
    texture_versions: Map<string, number>
    image_settings: Readonly<Record<string, ImageSettings>>
    object_urls: Set<string>
    on_texture_state:
        | null
        | ((key: string, status: "loading" | "loaded" | "failed") => void)
    on_close: null | (() => void)
    onClickFrame: null | ((key: string) => void)
    onClickLabel: null | ((key: string) => void)
    onHoverFrame: null | ((key: string | null) => void)
    onResizeCleanup: null | (() => void)
    onThemeCleanup: null | (() => void)
    _cleanupInteraction: undefined | (() => void)
    _cleanupKeys: undefined | (() => void)
    focusTargetPosition: null | THREE.Vector3
    focusTargetQuaternion: null | THREE.Quaternion
    focusFrameGroup: null | THREE.Group
    focusDistance: number
    focusApproachDirection: null | THREE.Vector3
    focusHandoffPending: boolean
}

export const GALLERY_HOST_ID = "gallery-3d-edit-host"

const instances = new Map<string, GalleryInstance>()

export const setInstance = (
    hostId: string,
    instance: GalleryInstance
): void => {
    instances.set(hostId, instance)
}

export const getInstance = (hostId: string): GalleryInstance | undefined =>
    instances.get(hostId)

export const removeInstance = (hostId: string): void => {
    const instance = instances.get(hostId)
    if (instance !== undefined) {
        instance.disposed = true
    }
    instances.delete(hostId)
}
