import type { Html, HtmlBuilder } from 'foldkit/html'

import { separator } from '../../generated/registry/ui/separator'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

export const separatorView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Horizontal']),
          h.div(
            [h.Class('flex flex-col gap-4 text-sm')],
            [
              h.div(
                [h.Class('flex flex-col gap-1')],
                [
                  h.div([h.Class('leading-none font-medium')], ['shadcn/ui']),
                  h.div(
                    [h.Class('text-muted-foreground')],
                    ['The Foundation for your Design System'],
                  ),
                ],
              ),
              separator<Message>({}, h),
              h.div(
                [],
                [
                  'A set of beautifully designed components that you can customize, extend, and build on.',
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Vertical']),
          h.div(
            [h.Class('flex h-5 items-center gap-4 text-sm')],
            [
              h.div([], ['Blog']),
              separator<Message>({ orientation: 'vertical' }, h),
              h.div([], ['Docs']),
              separator<Message>({ orientation: 'vertical' }, h),
              h.div([], ['Source']),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Vertical Menu']),
          h.div(
            [h.Class('flex items-center gap-2 text-sm md:gap-4')],
            [
              h.div(
                [h.Class('flex flex-col gap-1')],
                [
                  h.span([h.Class('font-medium')], ['Settings']),
                  h.span([h.Class('text-xs text-muted-foreground')], ['Manage preferences']),
                ],
              ),
              separator<Message>({ orientation: 'vertical' }, h),
              h.div(
                [h.Class('flex flex-col gap-1')],
                [
                  h.span([h.Class('font-medium')], ['Account']),
                  h.span([h.Class('text-xs text-muted-foreground')], ['Profile & security']),
                ],
              ),
              separator<Message>({ orientation: 'vertical' }, h),
              h.div(
                [h.Class('flex flex-col gap-1')],
                [
                  h.span([h.Class('font-medium')], ['Help']),
                  h.span([h.Class('text-xs text-muted-foreground')], ['Support & docs']),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['In List']),
          h.div(
            [h.Class('flex flex-col gap-2 text-sm')],
            [
              h.dl(
                [h.Class('flex items-center justify-between')],
                [h.dt([], ['Item 1']), h.dd([h.Class('text-muted-foreground')], ['Value 1'])],
              ),
              separator<Message>({}, h),
              h.dl(
                [h.Class('flex items-center justify-between')],
                [h.dt([], ['Item 2']), h.dd([h.Class('text-muted-foreground')], ['Value 2'])],
              ),
              separator<Message>({}, h),
              h.dl(
                [h.Class('flex items-center justify-between')],
                [h.dt([], ['Item 3']), h.dd([h.Class('text-muted-foreground')], ['Value 3'])],
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
