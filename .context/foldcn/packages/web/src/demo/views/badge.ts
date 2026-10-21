import type { Html, HtmlBuilder } from 'foldkit/html'

import { badge } from '../../generated/registry/ui/badge'
import { icon } from '../../generated/registry/lib/icons'
import { spinner } from '../../generated/registry/ui/spinner'
import { BadgeCheck, ArrowRight, ArrowUpRight } from 'lucide'

import { defineSlice } from '../slice'
import type { Model, Message } from '../assemble'

export const badgeView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Variants']),
          h.div(
            [h.Class('flex flex-wrap gap-2')],
            [
              badge<Message>({}, ['Default'], h),
              badge<Message>({ variant: 'secondary' }, ['Secondary'], h),
              badge<Message>({ variant: 'destructive' }, ['Destructive'], h),
              badge<Message>({ variant: 'outline' }, ['Outline'], h),
              badge<Message>({ variant: 'ghost' }, ['Ghost'], h),
              badge<Message>({ variant: 'link' }, ['Link'], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Icon Left']),
          h.div(
            [h.Class('flex flex-wrap gap-2')],
            [
              badge<Message>({}, [icon(h, BadgeCheck, 'size-3'), ' Default'], h),
              badge<Message>(
                { variant: 'secondary' },
                [icon(h, BadgeCheck, 'size-3'), ' Secondary'],
                h,
              ),
              badge<Message>(
                { variant: 'destructive' },
                [icon(h, BadgeCheck, 'size-3'), ' Destructive'],
                h,
              ),
              badge<Message>(
                { variant: 'outline' },
                [icon(h, BadgeCheck, 'size-3'), ' Outline'],
                h,
              ),
              badge<Message>({ variant: 'ghost' }, [icon(h, BadgeCheck, 'size-3'), ' Ghost'], h),
              badge<Message>({ variant: 'link' }, [icon(h, BadgeCheck, 'size-3'), ' Link'], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Icon Right']),
          h.div(
            [h.Class('flex flex-wrap gap-2')],
            [
              badge<Message>({}, ['Default ', icon(h, ArrowRight, 'size-3')], h),
              badge<Message>(
                { variant: 'secondary' },
                ['Secondary ', icon(h, ArrowRight, 'size-3')],
                h,
              ),
              badge<Message>(
                { variant: 'destructive' },
                ['Destructive ', icon(h, ArrowRight, 'size-3')],
                h,
              ),
              badge<Message>(
                { variant: 'outline' },
                ['Outline ', icon(h, ArrowRight, 'size-3')],
                h,
              ),
              badge<Message>({ variant: 'ghost' }, ['Ghost ', icon(h, ArrowRight, 'size-3')], h),
              badge<Message>({ variant: 'link' }, ['Link ', icon(h, ArrowRight, 'size-3')], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Spinner']),
          h.div(
            [h.Class('flex flex-wrap gap-2')],
            [
              badge<Message>({}, [spinner<Message>({}, h), ' Default'], h),
              badge<Message>({ variant: 'secondary' }, [spinner<Message>({}, h), ' Secondary'], h),
              badge<Message>(
                { variant: 'destructive' },
                [spinner<Message>({}, h), ' Destructive'],
                h,
              ),
              badge<Message>({ variant: 'outline' }, [spinner<Message>({}, h), ' Outline'], h),
              badge<Message>({ variant: 'ghost' }, [spinner<Message>({}, h), ' Ghost'], h),
              badge<Message>({ variant: 'link' }, [spinner<Message>({}, h), ' Link'], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['asChild']),
          h.div(
            [h.Class('flex flex-wrap gap-2')],
            [
              h.a(
                [h.Href('#'), h.Class('inline-flex')],
                [badge<Message>({}, ['Link ', icon(h, ArrowUpRight, 'size-3')], h)],
              ),
              h.a(
                [h.Href('#'), h.Class('inline-flex')],
                [
                  badge<Message>(
                    { variant: 'secondary' },
                    ['Link ', icon(h, ArrowUpRight, 'size-3')],
                    h,
                  ),
                ],
              ),
              h.a(
                [h.Href('#'), h.Class('inline-flex')],
                [
                  badge<Message>(
                    { variant: 'destructive' },
                    ['Link ', icon(h, ArrowUpRight, 'size-3')],
                    h,
                  ),
                ],
              ),
              h.a(
                [h.Href('#'), h.Class('inline-flex')],
                [
                  badge<Message>(
                    { variant: 'ghost' },
                    ['Link ', icon(h, ArrowUpRight, 'size-3')],
                    h,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Long Text']),
          h.div(
            [h.Class('flex flex-wrap gap-2')],
            [
              badge<Message>(
                { variant: 'secondary' },
                ['A badge with a lot of text to see how it wraps'],
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Custom Colors']),
          h.div(
            [h.Class('flex flex-wrap gap-2')],
            [
              badge<Message>(
                { className: 'bg-blue-600 text-blue-50 dark:bg-blue-600 dark:text-blue-50' },
                ['Blue'],
                h,
              ),
              badge<Message>(
                { className: 'bg-green-600 text-green-50 dark:bg-green-600 dark:text-green-50' },
                ['Green'],
                h,
              ),
              badge<Message>(
                { className: 'bg-sky-600 text-sky-50 dark:bg-sky-600 dark:text-sky-50' },
                ['Sky'],
                h,
              ),
              badge<Message>(
                {
                  className: 'bg-purple-600 text-purple-50 dark:bg-purple-600 dark:text-purple-50',
                },
                ['Purple'],
                h,
              ),
              badge<Message>(
                { className: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
                ['Blue'],
                h,
              ),
              badge<Message>(
                { className: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
                ['Green'],
                h,
              ),
              badge<Message>(
                { className: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
                ['Sky'],
                h,
              ),
              badge<Message>(
                {
                  className: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
                },
                ['Purple'],
                h,
              ),
              badge<Message>(
                { className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
                ['Red'],
                h,
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
