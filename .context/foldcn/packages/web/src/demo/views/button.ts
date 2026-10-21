import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '../../generated/registry/ui/button'
import { icon } from '../../generated/registry/lib/icons'
import { ArrowRight, ArrowLeftCircle } from 'lucide'

import { Schema as S } from 'effect'

import { defineSlice } from '../slice'
import type { Model, Message } from '../assemble'

export const buttonView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Variants & Sizes']),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>({ size: 'xs' }, 'Default', h),
              button<Message>({ size: 'xs', variant: 'secondary' }, 'Secondary', h),
              button<Message>({ size: 'xs', variant: 'outline' }, 'Outline', h),
              button<Message>({ size: 'xs', variant: 'ghost' }, 'Ghost', h),
              button<Message>({ size: 'xs', variant: 'destructive' }, 'Destructive', h),
              button<Message>({ size: 'xs', variant: 'link' }, 'Link', h),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>({ size: 'sm' }, 'Default', h),
              button<Message>({ size: 'sm', variant: 'secondary' }, 'Secondary', h),
              button<Message>({ size: 'sm', variant: 'outline' }, 'Outline', h),
              button<Message>({ size: 'sm', variant: 'ghost' }, 'Ghost', h),
              button<Message>({ size: 'sm', variant: 'destructive' }, 'Destructive', h),
              button<Message>({ size: 'sm', variant: 'link' }, 'Link', h),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>({}, 'Default', h),
              button<Message>({ variant: 'secondary' }, 'Secondary', h),
              button<Message>({ variant: 'outline' }, 'Outline', h),
              button<Message>({ variant: 'ghost' }, 'Ghost', h),
              button<Message>({ variant: 'destructive' }, 'Destructive', h),
              button<Message>({ variant: 'link' }, 'Link', h),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>({ size: 'lg' }, 'Default', h),
              button<Message>({ size: 'lg', variant: 'secondary' }, 'Secondary', h),
              button<Message>({ size: 'lg', variant: 'outline' }, 'Outline', h),
              button<Message>({ size: 'lg', variant: 'ghost' }, 'Ghost', h),
              button<Message>({ size: 'lg', variant: 'destructive' }, 'Destructive', h),
              button<Message>({ size: 'lg', variant: 'link' }, 'Link', h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Icon Right']),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'xs' },
                ['Default ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'secondary' },
                ['Secondary ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'outline' },
                ['Outline ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'ghost' },
                ['Ghost ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'destructive' },
                ['Destructive ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'link' },
                ['Link ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'sm' },
                ['Default ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'secondary' },
                ['Secondary ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'outline' },
                ['Outline ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'ghost' },
                ['Ghost ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'destructive' },
                ['Destructive ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'link' },
                ['Link ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>({}, ['Default ', icon(h, ArrowRight, 'size-3', 'inline-end')], h),
              button<Message>(
                { variant: 'secondary' },
                ['Secondary ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { variant: 'outline' },
                ['Outline ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { variant: 'ghost' },
                ['Ghost ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { variant: 'destructive' },
                ['Destructive ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { variant: 'link' },
                ['Link ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'lg' },
                ['Default ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'secondary' },
                ['Secondary ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'outline' },
                ['Outline ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'ghost' },
                ['Ghost ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'destructive' },
                ['Destructive ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'link' },
                ['Link ', icon(h, ArrowRight, 'size-3', 'inline-end')],
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Icon Left']),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'xs' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Default'],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'secondary' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Secondary'],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'outline' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Outline'],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'ghost' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Ghost'],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'destructive' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Destructive'],
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'link' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Link'],
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'sm' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Default'],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'secondary' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Secondary'],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'outline' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Outline'],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'ghost' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Ghost'],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'destructive' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Destructive'],
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'link' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Link'],
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                {},
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Default'],
                h,
              ),
              button<Message>(
                { variant: 'secondary' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Secondary'],
                h,
              ),
              button<Message>(
                { variant: 'outline' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Outline'],
                h,
              ),
              button<Message>(
                { variant: 'ghost' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Ghost'],
                h,
              ),
              button<Message>(
                { variant: 'destructive' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Destructive'],
                h,
              ),
              button<Message>(
                { variant: 'link' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Link'],
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'lg' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Default'],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'secondary' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Secondary'],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'outline' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Outline'],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'ghost' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Ghost'],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'destructive' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Destructive'],
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'link' },
                [icon(h, ArrowLeftCircle, 'size-3', 'inline-start'), ' Link'],
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Icon Only']),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'icon-xs', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3'),
                h,
              ),
              button<Message>(
                { size: 'icon-xs', variant: 'secondary', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3'),
                h,
              ),
              button<Message>(
                { size: 'icon-xs', variant: 'outline', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3'),
                h,
              ),
              button<Message>(
                { size: 'icon-xs', variant: 'ghost', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3'),
                h,
              ),
              button<Message>(
                { size: 'icon-xs', variant: 'destructive', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3'),
                h,
              ),
              button<Message>(
                { size: 'icon-xs', variant: 'link', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3'),
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'icon-sm', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3.5'),
                h,
              ),
              button<Message>(
                { size: 'icon-sm', variant: 'secondary', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3.5'),
                h,
              ),
              button<Message>(
                { size: 'icon-sm', variant: 'outline', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3.5'),
                h,
              ),
              button<Message>(
                { size: 'icon-sm', variant: 'ghost', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3.5'),
                h,
              ),
              button<Message>(
                { size: 'icon-sm', variant: 'destructive', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3.5'),
                h,
              ),
              button<Message>(
                { size: 'icon-sm', variant: 'link', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-3.5'),
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'icon', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon', variant: 'secondary', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon', variant: 'outline', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon', variant: 'ghost', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon', variant: 'destructive', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon', variant: 'link', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'icon-lg', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon-lg', variant: 'secondary', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon-lg', variant: 'outline', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon-lg', variant: 'ghost', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon-lg', variant: 'destructive', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
              button<Message>(
                { size: 'icon-lg', variant: 'link', attributes: [h.AriaLabel('Arrow')] },
                icon(h, ArrowRight, 'size-4'),
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Examples']),
          h.div(
            [h.Class('flex flex-wrap items-center gap-4')],
            [
              h.div(
                [h.Class('flex items-center gap-2')],
                [
                  button<Message>({ variant: 'outline' }, 'Cancel', h),
                  button<Message>({}, ['Submit ', icon(h, ArrowRight, 'size-3', 'inline-end')], h),
                ],
              ),
              h.div(
                [h.Class('flex items-center gap-2')],
                [
                  button<Message>({ variant: 'destructive' }, 'Delete', h),
                  button<Message>(
                    { size: 'icon', attributes: [h.AriaLabel('Action')] },
                    icon(h, ArrowRight, 'size-4'),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Invalid States']),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'xs', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Default',
                h,
              ),
              button<Message>(
                {
                  size: 'xs',
                  variant: 'secondary',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Secondary',
                h,
              ),
              button<Message>(
                {
                  size: 'xs',
                  variant: 'outline',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Outline',
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'ghost', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Ghost',
                h,
              ),
              button<Message>(
                {
                  size: 'xs',
                  variant: 'destructive',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Destructive',
                h,
              ),
              button<Message>(
                { size: 'xs', variant: 'link', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Link',
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'sm', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Default',
                h,
              ),
              button<Message>(
                {
                  size: 'sm',
                  variant: 'secondary',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Secondary',
                h,
              ),
              button<Message>(
                {
                  size: 'sm',
                  variant: 'outline',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Outline',
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'ghost', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Ghost',
                h,
              ),
              button<Message>(
                {
                  size: 'sm',
                  variant: 'destructive',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Destructive',
                h,
              ),
              button<Message>(
                { size: 'sm', variant: 'link', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Link',
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>({ attributes: [h.Attribute('aria-invalid', 'true')] }, 'Default', h),
              button<Message>(
                { variant: 'secondary', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Secondary',
                h,
              ),
              button<Message>(
                { variant: 'outline', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Outline',
                h,
              ),
              button<Message>(
                { variant: 'ghost', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Ghost',
                h,
              ),
              button<Message>(
                { variant: 'destructive', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Destructive',
                h,
              ),
              button<Message>(
                { variant: 'link', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Link',
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              button<Message>(
                { size: 'lg', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Default',
                h,
              ),
              button<Message>(
                {
                  size: 'lg',
                  variant: 'secondary',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Secondary',
                h,
              ),
              button<Message>(
                {
                  size: 'lg',
                  variant: 'outline',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Outline',
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'ghost', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Ghost',
                h,
              ),
              button<Message>(
                {
                  size: 'lg',
                  variant: 'destructive',
                  attributes: [h.Attribute('aria-invalid', 'true')],
                },
                'Destructive',
                h,
              ),
              button<Message>(
                { size: 'lg', variant: 'link', attributes: [h.Attribute('aria-invalid', 'true')] },
                'Link',
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  )

const fields = {}
const stateSchema = S.Struct(fields)
type State = typeof stateSchema.Type

export const slice = defineSlice({
  fields,
  init: {},
  messages: [],
  handlers: (_model: State) => ({}),
})
