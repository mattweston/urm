import * as Array from "effect/Array"
import { Effect, Option } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"

import { GotDragAndDropMessage, type Message } from "./object.message.ts"
import {
    Model,
    type ObjectComponent,
    type ObjectComponentKind,
    type ObjectComponentOption,
    type ObjectDefinition,
    makeModel,
} from "./object.model.ts"

export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
]

export const init = (definition: ObjectDefinition): UpdateReturn => [
    makeModel(definition),
    [],
]

const default_component = (
    kind: ObjectComponentKind,
    component_number: number
): ObjectComponent => {
    const id = `draft-component-${component_number}`
    const shared = {
        id,
        name: id,
        description: "",
        options: [],
    }

    switch (kind) {
        case "link":
            return {
                ...shared,
                kind,
                label: "Privacy policy",
                href: "",
                placeholder: "",
                required: false,
            }
        case "heading":
            return {
                ...shared,
                kind,
                label: "Section heading",
                placeholder: "",
                required: false,
            }
        case "paragraph":
            return {
                ...shared,
                kind,
                label: "Supporting text",
                placeholder: "",
                required: false,
            }
        case "email":
            return {
                ...shared,
                kind,
                name: `email-${component_number}`,
                label: "Email",
                placeholder: "you@example.com",
                required: true,
            }
        case "number":
            return {
                ...shared,
                kind,
                name: `number-${component_number}`,
                label: "Number",
                placeholder: "0",
                required: false,
            }
        case "tel":
            return {
                ...shared,
                kind,
                name: `phone-${component_number}`,
                label: "Phone number",
                placeholder: "+1 555 123 4567",
                required: false,
            }
        case "url":
            return {
                ...shared,
                kind,
                name: `url-${component_number}`,
                label: "Website",
                placeholder: "https://example.com",
                required: false,
            }
        case "date":
            return {
                ...shared,
                kind,
                name: `date-${component_number}`,
                label: "Date",
                placeholder: "",
                required: false,
            }
        case "textarea":
            return {
                ...shared,
                kind,
                name: `message-${component_number}`,
                label: "Long answer",
                placeholder: "Enter your answer",
                required: false,
            }
        case "checkbox":
            return {
                ...shared,
                kind,
                name: `choice-${component_number}`,
                label: "I agree",
                placeholder: "",
                required: false,
            }
        case "select":
        case "radio":
            return {
                ...shared,
                kind,
                name: `${kind}-${component_number}`,
                label: kind === "select" ? "Select an option" : "Choose one",
                placeholder: "Choose an option",
                required: false,
                options: [
                    {
                        id: `${id}-option-1`,
                        label: "Option 1",
                        value: "option-1",
                    },
                    {
                        id: `${id}-option-2`,
                        label: "Option 2",
                        value: "option-2",
                    },
                ],
            }
        case "text":
            return {
                ...shared,
                kind,
                name: `field-${component_number}`,
                label: "Short answer",
                placeholder: "Enter your answer",
                required: false,
            }
    }
}

const next_option_number = (component: ObjectComponent): number => {
    let option_number = 1

    while (
        Array.some(
            component.options,
            (option) => option.id === `${component.id}-option-${option_number}`
        )
    ) {
        option_number += 1
    }

    return option_number
}

const next_component_number = (
    components: ReadonlyArray<ObjectComponent>
): number => {
    let component_number = 1

    while (
        Array.some(
            components,
            (component) =>
                component.id === `draft-component-${component_number}`
        )
    ) {
        component_number += 1
    }

    return component_number
}

const update_selected = (
    model: Model,
    change: (component: ObjectComponent) => ObjectComponent
): Model =>
    Option.match(model.selected_component_id, {
        onNone: () => model,
        onSome: (component_id) => ({
            ...model,
            definition: {
                ...model.definition,
                components: Array.map(
                    model.definition.components,
                    (component) =>
                        component.id === component_id
                            ? change(component)
                            : component
                ),
            },
        }),
    })

const update_selected_option = (
    model: Model,
    option_id: string,
    change: (option: ObjectComponentOption) => ObjectComponentOption
): Model =>
    update_selected(model, (component) => ({
        ...component,
        options: Array.map(component.options, (option) =>
            option.id === option_id ? change(option) : option
        ),
    }))

const move_component = (
    model: Model,
    component_id: string,
    direction: "up" | "down"
): Model => {
    const components = [...model.definition.components]
    const index = components.findIndex(
        (component) => component.id === component_id
    )
    const target_index = direction === "up" ? index - 1 : index + 1

    if (index < 0 || target_index < 0 || target_index >= components.length) {
        return model
    }

    const component = components[index]
    const target = components[target_index]
    if (component === undefined || target === undefined) return model

    components[index] = target
    components[target_index] = component

    return {
        ...model,
        definition: { ...model.definition, components },
    }
}

const reorder_component = (
    components: ReadonlyArray<ObjectComponent>,
    component_id: string,
    target_index: number
): ReadonlyArray<ObjectComponent> => {
    const component = components.find(
        (candidate) => candidate.id === component_id
    )
    if (component === undefined) return components

    const remaining = components.filter(
        (candidate) => candidate.id !== component_id
    )
    const bounded_index = Math.max(0, Math.min(target_index, remaining.length))
    return [
        ...remaining.slice(0, bounded_index),
        component,
        ...remaining.slice(bounded_index),
    ]
}

export const update = (model: Model, message: Message): UpdateReturn => {
    switch (message._tag) {
        case "AddedComponent": {
            const component = default_component(
                message.kind,
                next_component_number(model.definition.components)
            )
            return [
                {
                    ...model,
                    definition: {
                        ...model.definition,
                        components: [...model.definition.components, component],
                    },
                    selected_component_id: Option.some(component.id),
                },
                [],
            ]
        }
        case "SelectedComponent":
            return Array.some(
                model.definition.components,
                (component) => component.id === message.component_id
            )
                ? [
                      {
                          ...model,
                          selected_component_id: Option.some(
                              message.component_id
                          ),
                      },
                      [],
                  ]
                : [model, []]
        case "RemovedComponent": {
            const removed_index = Array.findFirstIndex(
                model.definition.components,
                (component) => component.id === message.component_id
            )
            const components = Array.filter(
                model.definition.components,
                (component) => component.id !== message.component_id
            )
            const selected_component_id = Option.match(
                model.selected_component_id,
                {
                    onNone: () => Option.none<string>(),
                    onSome: (selected_id) => {
                        if (selected_id !== message.component_id) {
                            return Option.some(selected_id)
                        }

                        return Option.flatMap(removed_index, (index) =>
                            Array.get(
                                components,
                                Math.min(index, components.length - 1)
                            )
                        ).pipe(Option.map((component) => component.id))
                    },
                }
            )
            return [
                {
                    ...model,
                    definition: {
                        ...model.definition,
                        components,
                    },
                    selected_component_id,
                },
                [],
            ]
        }
        case "DuplicatedComponent": {
            const source_index = model.definition.components.findIndex(
                (component) => component.id === message.component_id
            )
            const source = model.definition.components[source_index]
            if (source === undefined) return [model, []]

            const component_number = next_component_number(
                model.definition.components
            )
            const id = `draft-component-${component_number}`
            const duplicate = {
                ...source,
                id,
                name: `${source.name}-copy-${component_number}`,
                options: source.options.map((option, index) => ({
                    ...option,
                    id: `${id}-option-${index + 1}`,
                })),
            }
            const components = [...model.definition.components]
            components.splice(source_index + 1, 0, duplicate)

            return [
                {
                    ...model,
                    definition: { ...model.definition, components },
                    selected_component_id: Option.some(id),
                },
                [],
            ]
        }
        case "MovedComponent":
            return [
                move_component(model, message.component_id, message.direction),
                [],
            ]
        case "ChangedComponentLabel":
            return [
                update_selected(model, (component) => ({
                    ...component,
                    label: message.value,
                })),
                [],
            ]
        case "ChangedComponentHref":
            return [
                update_selected(model, (component) =>
                    component.kind === "link"
                        ? { ...component, href: message.value }
                        : component
                ),
                [],
            ]
        case "ChangedComponentName":
            return [
                update_selected(model, (component) => ({
                    ...component,
                    name: message.value,
                })),
                [],
            ]
        case "ChangedComponentDescription":
            return [
                update_selected(model, (component) => ({
                    ...component,
                    description: message.value,
                })),
                [],
            ]
        case "ChangedComponentPlaceholder":
            return [
                update_selected(model, (component) => ({
                    ...component,
                    placeholder: message.value,
                })),
                [],
            ]
        case "ToggledComponentRequired":
            return [
                update_selected(model, (component) => ({
                    ...component,
                    required: message.required,
                })),
                [],
            ]
        case "AddedComponentOption":
            return [
                update_selected(model, (component) => {
                    const option_number = next_option_number(component)
                    return {
                        ...component,
                        options: [
                            ...component.options,
                            {
                                id: `${component.id}-option-${option_number}`,
                                label: `Option ${option_number}`,
                                value: `option-${option_number}`,
                            },
                        ],
                    }
                }),
                [],
            ]
        case "ChangedComponentOptionLabel":
            return [
                update_selected_option(model, message.option_id, (option) => ({
                    ...option,
                    label: message.value,
                })),
                [],
            ]
        case "ChangedComponentOptionValue":
            return [
                update_selected_option(model, message.option_id, (option) => ({
                    ...option,
                    value: message.value,
                })),
                [],
            ]
        case "RemovedComponentOption":
            return [
                update_selected(model, (component) => ({
                    ...component,
                    options: Array.filter(
                        component.options,
                        (option) => option.id !== message.option_id
                    ),
                })),
                [],
            ]
        case "GotDragAndDropMessage": {
            const {
                model: drag_and_drop,
                commands = [],
                outMessage: out_message_value,
            } = Ui.DragAndDrop.update(model.drag_and_drop, message.message)
            const out_message = Option.fromUndefinedOr(out_message_value)

            const components = Option.match(out_message, {
                onNone: () => model.definition.components,
                onSome: (result) =>
                    result._tag === "Reordered"
                        ? reorder_component(
                              model.definition.components,
                              result.itemId,
                              result.toIndex
                          )
                        : model.definition.components,
            })

            return [
                {
                    ...model,
                    definition: { ...model.definition, components },
                    drag_and_drop,
                },
                commands.map(
                    Command.mapEffect(
                        Effect.map((message) =>
                            GotDragAndDropMessage({ message })
                        )
                    )
                ),
            ]
        }
    }
}
