const PATH = "/design/dom-depth-visualizer"

export const domDepthVisualizerHref = () => `${PATH}/`

export const isDomDepthVisualizerPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`
