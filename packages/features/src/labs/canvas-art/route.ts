const CANVAS_ART_PATH = "/labs/media/canvas-art"

export const canvasArtHref = () => `${CANVAS_ART_PATH}/`

export const isCanvasArtPath = (pathname: string): boolean =>
    pathname === CANVAS_ART_PATH || pathname === `${CANVAS_ART_PATH}/`
