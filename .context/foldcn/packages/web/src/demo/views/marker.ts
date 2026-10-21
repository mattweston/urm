import type { Html, HtmlBuilder } from 'foldkit/html'

import { Marker } from '../../generated/registry/ui/marker'
import { spinner } from '../../generated/registry/ui/spinner'
import { icon } from '../../generated/registry/lib/icons'
import { GitBranch, Search } from 'lucide'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

export const markerView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full max-w-sm flex-col gap-8 py-12')],
    [
      Marker<Message>(
        {},
        [
          Marker.icon<Message>({}, [icon(h, GitBranch)], h),
          Marker.content<Message>({}, ['Switched to a new branch'], h),
        ],
        h,
      ),
      h.div(
        [h.Attribute('role', 'status')],
        [
          Marker<Message>(
            {},
            [
              Marker.icon<Message>({}, [spinner<Message>({}, h)], h),
              Marker.content<Message>({ className: 'shimmer' }, ['Thinking...'], h),
            ],
            h,
          ),
        ],
      ),
      Marker<Message>(
        { variant: 'separator' },
        [Marker.content<Message>({}, ['Conversation compacted'], h)],
        h,
      ),
      Marker<Message>(
        {},
        [
          Marker.icon<Message>({}, [icon(h, Search)], h),
          Marker.content<Message>({}, ['Explored 4 files'], h),
        ],
        h,
      ),
    ],
  )

export const slice = defineSlice({
  fields: {},
  init: {},
  messages: [],
  handlers: () => ({}),
})
