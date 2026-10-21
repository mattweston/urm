import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from './assemble'
import type { Model } from './assemble'

type DemoView = (model: Model, h: HtmlBuilder<Message>) => Html

type ViewModule = Readonly<Record<string, DemoView | undefined>>

const isDemoView = (value: DemoView | undefined): value is DemoView => typeof value === 'function'

// Derived registration: each `./views/<item>.ts` module demos the registry item
// named after its filename and must export exactly one view function named
// `<something>View` (e.g. `buttonView`, `sideBarView`). Adding a demo requires
// no registration here — drop in a file with a single `*View` export. A module
// that exports zero or several such functions fails fast at startup.
const VIEW_NAME_PATTERN = /^[a-zA-Z]+View$/

const extractView = (moduleExports: ViewModule, file: string): DemoView => {
  const names = Object.keys(moduleExports).filter((name) => VIEW_NAME_PATTERN.test(name))
  if (names.length === 0)
    throw new Error(
      `Demo view module "${file}" must export exactly one *View function; found none.`,
    )
  if (names.length > 1)
    throw new Error(
      `Demo view module "${file}" must export exactly one *View function; found ${names.length}: ${names.join(', ')}.`,
    )
  const view = moduleExports[names[0]!]
  if (!isDemoView(view))
    throw new Error(`Demo view module "${file}" exports "${names[0]}" but it is not a function.`)
  return view
}

const modules: Record<string, ViewModule> = import.meta.glob('./views/*.ts', { eager: true })

export const views: Readonly<Record<string, DemoView>> = Object.fromEntries(
  Object.entries(modules).map(([file, moduleExports]) => {
    const itemName = file.replace(/^.*\//, '').replace(/\.ts$/, '')
    return [itemName, extractView(moduleExports, file)]
  }),
)

/** The demo submodel: renders whichever component the current route names.
 *  Embedded by the root under one slot, so one demo model/reducer backs all
 *  of them. */
export type DemoItemName = keyof typeof views

export const isDemoItemName = (name: string): name is DemoItemName => name in views

export type DemoViewInputs = Readonly<{ itemName: DemoItemName }>

export const hasDemo = (name: string): name is DemoItemName => name in views

/** The demo submodel: renders whichever component the current route names.
 *  Embedded by the root under one slot, so one demo model/reducer backs all
 *  of them. */
export const view = Submodel.defineView<Model, Message, DemoViewInputs>(
  (model, viewInputs, h): Html => views[viewInputs.itemName]!(model, h),
)
