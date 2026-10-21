/** # logoView view */
import {
    default_logo_scene,
    type LogoElement,
    type LogoScene,
} from "@urm/domain/schemas/logos"
import { type Html, inertHtml } from "foldkit/html"

type LogoProps = Readonly<{
    class?: string
}>

type SceneLogoProps = LogoProps &
    Readonly<{
        scene: LogoScene
    }>

const h = inertHtml

const paint_value = (paint: LogoElement["paint"]): string => `var(--${paint})`

const element_view = (element: LogoElement): Html => {
    const common = [h.Attribute("opacity", String(element.opacity))]
    switch (element._tag) {
        case "Rect":
            return h.rect(
                [
                    ...common,
                    h.Attribute("x", String(element.x)),
                    h.Attribute("y", String(element.y)),
                    h.Attribute("width", String(element.width)),
                    h.Attribute("height", String(element.height)),
                    h.Attribute("rx", String(element.radius)),
                    h.Fill(paint_value(element.paint)),
                ],
                []
            )
        case "Circle":
            return h.circle(
                [
                    ...common,
                    h.Attribute("cx", String(element.cx)),
                    h.Attribute("cy", String(element.cy)),
                    h.Attribute("r", String(element.radius)),
                    ...(element.style === "Fill"
                        ? [h.Fill(paint_value(element.paint))]
                        : [
                              h.Fill("none"),
                              h.Stroke(paint_value(element.paint)),
                              h.StrokeWidth(String(element.stroke_width)),
                          ]),
                ],
                []
            )
        case "Line":
            return h.line(
                [
                    ...common,
                    h.Attribute("x1", String(element.x1)),
                    h.Attribute("y1", String(element.y1)),
                    h.Attribute("x2", String(element.x2)),
                    h.Attribute("y2", String(element.y2)),
                    h.Stroke(paint_value(element.paint)),
                    h.StrokeWidth(String(element.stroke_width)),
                ],
                []
            )
    }
}

export const sceneLogoView = (props: SceneLogoProps): Html =>
    h.svg(
        [
            h.AriaHidden(true),
            h.Class(props.class ?? "size-8"),
            h.Xmlns("http://www.w3.org/2000/svg"),
            h.ViewBox(
                `${props.scene.view_box.x} ${props.scene.view_box.y} ${props.scene.view_box.width} ${props.scene.view_box.height}`
            ),
        ],
        props.scene.elements.map(element_view)
    )

/**
 * Renders the shared URM SVG mark using semantic paints from the active theme.
 * The optional class places the same mark in different host layouts.
 */
export const logoView = (props: LogoProps = {}): Html =>
    sceneLogoView({ ...props, scene: default_logo_scene })
