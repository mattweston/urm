import type { Html, HtmlBuilder } from 'foldkit/html'

import { Progress } from '../../generated/registry/ui/progress'
import { Item } from '../../generated/registry/ui/item'
import { icon } from '../../generated/registry/lib/icons'
import { File } from 'lucide'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

const files = [
  { id: '1', name: 'document.pdf', progress: 45, time: '2m 30s' },
  { id: '2', name: 'presentation.pptx', progress: 78, time: '45s' },
  { id: '3', name: 'spreadsheet.xlsx', progress: 12, time: '5m 12s' },
  { id: '4', name: 'image.jpg', progress: 100, time: 'Complete' },
]

export const progressView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Progress Bar']),
          h.div(
            [h.Class('flex w-full flex-col gap-4')],
            [
              Progress<Message>({ value: 0 }, h),
              Progress<Message>({ value: 25, className: 'w-full' }, h),
              Progress<Message>({ value: 50 }, h),
              Progress<Message>({ value: 75 }, h),
              Progress<Message>({ value: 100 }, h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Label']),
          h.div(
            [h.Class('flex w-full flex-col gap-1')],
            [
              h.div(
                [h.Class('flex items-center justify-between')],
                [
                  Progress.label<Message>({}, ['Upload progress'], h),
                  Progress.value<Message>({}, ['56%'], h),
                ],
              ),
              Progress<Message>({ value: 56 }, h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Controlled']),
          h.div(
            [h.Class('flex w-full flex-col gap-4')],
            [
              Progress<Message>({ value: 50, className: 'w-full' }, h),
              h.div(
                [h.Class('text-xs text-muted-foreground')],
                ['Use slider to control value (static demo at 50%)'],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['File Upload List']),
          h.div(
            [h.Class('flex w-full flex-col divide-y rounded-lg border')],
            files.map((file) =>
              Item<Message>(
                { className: 'px-3 py-2' },
                [
                  Item.media<Message>({}, [icon(h, File, 'size-5')], h),
                  Item.content<Message>({}, [Item.title<Message>({}, [file.name], h)], h),
                  Item.content<Message>(
                    {},
                    [Progress<Message>({ value: file.progress, className: 'w-32' }, h)],
                    h,
                  ),
                  h.span([h.Class('text-sm text-muted-foreground w-16 text-right')], [file.time]),
                ],
                h,
              ),
            ),
          ),
        ],
      ),
    ],
  )

export const slice = defineSlice({
  fields: {},
  init: {},
  messages: [],
  handlers: () => ({}),
})
