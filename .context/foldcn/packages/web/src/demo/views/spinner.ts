import type { Html, HtmlBuilder } from 'foldkit/html'

import { badge } from '../../generated/registry/ui/badge'
import { button } from '../../generated/registry/ui/button'
import { spinner } from '../../generated/registry/ui/spinner'
import { icon } from '../../generated/registry/lib/icons'
import { ArrowRight } from 'lucide'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

export const spinnerView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Basic']),
          h.div(
            [h.Class('flex items-center gap-6')],
            [spinner<Message>({}, h), spinner<Message>({ className: 'size-6' }, h)],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['In Buttons']),
          h.div(
            [h.Class('flex flex-wrap items-center gap-4')],
            [
              button<Message>({}, h.span([], [spinner<Message>({}, h), ' Submit']), h),
              button<Message>(
                { isDisabled: true },
                h.span([], [spinner<Message>({}, h), ' Disabled']),
                h,
              ),
              button<Message>(
                { variant: 'outline', isDisabled: true },
                h.span([], [spinner<Message>({}, h), ' Outline']),
                h,
              ),
              button<Message>(
                {
                  variant: 'outline',
                  size: 'icon',
                  isDisabled: true,
                  attributes: [h.AriaLabel('Loading')],
                },
                spinner<Message>({}, h),
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['In Badges']),
          h.div(
            [h.Class('flex flex-wrap items-center justify-center gap-4')],
            [
              badge<Message>({}, [spinner<Message>({}, h), ' Badge'], h),
              badge<Message>({ variant: 'secondary' }, [spinner<Message>({}, h), ' Badge'], h),
              badge<Message>({ variant: 'destructive' }, [spinner<Message>({}, h), ' Badge'], h),
              badge<Message>({ variant: 'outline' }, [spinner<Message>({}, h), ' Badge'], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['In Input Group']),
          h.div(
            [h.Class('flex w-full max-w-sm flex-col gap-1.5')],
            [
              h.label(
                [h.Class('text-sm font-medium'), h.For('input-group-spinner')],
                ['Input Group'],
              ),
              h.div(
                [h.Class('flex items-center gap-2 rounded-lg border px-2.5 py-1')],
                [
                  h.input([
                    h.Id('input-group-spinner'),
                    h.Class('flex-1 bg-transparent outline-none text-sm'),
                    h.Placeholder('Search...'),
                  ]),
                  spinner<Message>({}, h),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['In Empty State']),
          h.div(
            [
              h.Class(
                'flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-lg border py-8',
              ),
            ],
            [
              spinner<Message>({}, h),
              h.div([h.Class('text-sm font-medium')], ['No projects yet']),
              h.div(
                [h.Class('text-sm text-muted-foreground text-center max-w-xs')],
                [
                  "You haven't created any projects yet. Get started by creating your first project.",
                ],
              ),
              h.div(
                [h.Class('flex gap-2')],
                [
                  button<Message>({}, 'Create project', h),
                  button<Message>({ variant: 'outline' }, 'Import project', h),
                ],
              ),
              h.a(
                [
                  h.Href('#'),
                  h.Class(
                    'text-sm text-muted-foreground underline-offset-4 hover:underline inline-flex items-center gap-1',
                  ),
                ],
                ['Learn more ', icon(h, ArrowRight, 'size-3')],
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
