import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '../../generated/registry/ui/button'
import { buttonGroup } from '../../generated/registry/ui/button-group'
import { icon } from '../../generated/registry/lib/icons'
import { ArrowLeft, MoreHorizontal } from 'lucide'

import { defineSlice } from '../slice'
import type { Model, Message } from '../assemble'

export const buttonGroupView = (model: Model, h: HtmlBuilder<Message>): Html =>
  buttonGroup<Message>(
    {},
    [
      buttonGroup<Message>(
        { className: 'hidden sm:flex' },
        [
          button<Message>(
            { variant: 'outline', size: 'icon', attributes: [h.AriaLabel('Go Back')] },
            icon(h, ArrowLeft),
            h,
          ),
        ],
        h,
      ),
      buttonGroup<Message>(
        {},
        [
          button<Message>({ variant: 'outline' }, 'Archive', h),
          button<Message>({ variant: 'outline' }, 'Report', h),
        ],
        h,
      ),
      buttonGroup<Message>(
        {},
        [
          button<Message>({ variant: 'outline' }, 'Snooze', h),
          button<Message>(
            { variant: 'outline', size: 'icon', attributes: [h.AriaLabel('More Options')] },
            icon(h, MoreHorizontal),
            h,
          ),
        ],
        h,
      ),
    ],
    h,
  )

export const slice = defineSlice({
  fields: {},
  init: {},
  messages: [],
  handlers: () => ({}),
})
