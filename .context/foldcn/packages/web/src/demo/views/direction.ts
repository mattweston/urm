import type { Html, HtmlBuilder } from 'foldkit/html'

import { direction } from '../../generated/registry/ui/direction'

import { defineSlice } from '../slice'
import type { Model, Message } from '../assemble'

export const directionView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col gap-4')],
    [
      direction<Message>({ dir: 'ltr' }, [h.p([h.Class('text-sm')], ['Left-to-right text.'])], h),
      direction<Message>({ dir: 'rtl' }, [h.p([h.Class('text-sm')], ['Right-to-left text.'])], h),
    ],
  )

export const slice = defineSlice({
  fields: {},
  init: {},
  messages: [],
  handlers: () => ({}),
})
