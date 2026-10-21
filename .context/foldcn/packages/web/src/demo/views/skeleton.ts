import type { Html, HtmlBuilder } from 'foldkit/html'

import { Card } from '../../generated/registry/ui/card'
import { skeleton } from '../../generated/registry/ui/skeleton'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

export const skeletonView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Avatar']),
          h.div(
            [h.Class('flex w-full items-center gap-4')],
            [
              skeleton<Message>({ className: 'size-10 shrink-0 rounded-full' }, [], h),
              h.div(
                [h.Class('grid gap-2')],
                [
                  skeleton<Message>({ className: 'h-4 w-[150px]' }, [], h),
                  skeleton<Message>({ className: 'h-4 w-[100px]' }, [], h),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Card']),
          Card<Message>(
            { className: 'w-full max-w-sm' },
            [
              Card.header<Message>(
                {},
                [
                  skeleton<Message>({ className: 'h-4 w-2/3' }, [], h),
                  skeleton<Message>({ className: 'h-4 w-1/2' }, [], h),
                ],
                h,
              ),
              Card.content<Message>(
                {},
                [skeleton<Message>({ className: 'aspect-square w-full' }, [], h)],
                h,
              ),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Text']),
          h.div(
            [h.Class('flex w-full max-w-sm flex-col gap-2')],
            [
              skeleton<Message>({ className: 'h-4 w-full' }, [], h),
              skeleton<Message>({ className: 'h-4 w-full' }, [], h),
              skeleton<Message>({ className: 'h-4 w-3/4' }, [], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Form']),
          h.div(
            [h.Class('flex w-full max-w-sm flex-col gap-7')],
            [
              h.div(
                [h.Class('flex flex-col gap-3')],
                [
                  skeleton<Message>({ className: 'h-4 w-20' }, [], h),
                  skeleton<Message>({ className: 'h-10 w-full' }, [], h),
                ],
              ),
              h.div(
                [h.Class('flex flex-col gap-3')],
                [
                  skeleton<Message>({ className: 'h-4 w-24' }, [], h),
                  skeleton<Message>({ className: 'h-10 w-full' }, [], h),
                ],
              ),
              skeleton<Message>({ className: 'h-9 w-24' }, [], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Table']),
          h.div(
            [h.Class('flex w-full max-w-sm flex-col gap-2')],
            [
              h.div(
                [h.Class('flex gap-4')],
                [
                  skeleton<Message>({ className: 'h-4 flex-1' }, [], h),
                  skeleton<Message>({ className: 'h-4 w-24' }, [], h),
                  skeleton<Message>({ className: 'h-4 w-20' }, [], h),
                ],
              ),
              h.div(
                [h.Class('flex gap-4')],
                [
                  skeleton<Message>({ className: 'h-4 flex-1' }, [], h),
                  skeleton<Message>({ className: 'h-4 w-24' }, [], h),
                  skeleton<Message>({ className: 'h-4 w-20' }, [], h),
                ],
              ),
              h.div(
                [h.Class('flex gap-4')],
                [
                  skeleton<Message>({ className: 'h-4 flex-1' }, [], h),
                  skeleton<Message>({ className: 'h-4 w-24' }, [], h),
                  skeleton<Message>({ className: 'h-4 w-20' }, [], h),
                ],
              ),
            ],
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
