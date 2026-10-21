import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  inputGroup,
  inputGroupAddon,
  inputGroupButton,
  inputGroupInput,
  inputGroupText,
  inputGroupTextarea,
} from '../../generated/registry/ui/input-group'
import { Kbd } from '../../generated/registry/ui/kbd'
import { field, fieldGroup, fieldLabel } from '../../generated/registry/ui/fieldset'
import { button } from '../../generated/registry/ui/button'
import { icon } from '../../generated/registry/lib/icons'
import { Search, Info, Star, Mail, ExternalLink, Mic, Radio } from 'lucide'

import { defineSlice } from '../slice'
import type { Model, Message } from '../assemble'

export const inputGroupView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Basic']),
          h.div(
            [h.Class('flex w-full max-w-sm flex-col gap-4')],
            [
              inputGroup(
                { className: 'max-w-sm' },
                [
                  inputGroupInput({ id: 'input-group-basic', placeholder: 'Search…' }, h),
                  inputGroupAddon({}, [icon(h, Search, 'size-4')], h),
                  inputGroupAddon({ align: 'inline-end' }, ['12 results'], h),
                ],
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Addons']),
          fieldGroup<Message>(
            {},
            [
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'input-icon-left' }, ['Addon (inline-start)'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupInput({ id: 'input-icon-left', placeholder: '' }, h),
                      inputGroupAddon({}, [icon(h, Search, 'size-4 text-muted-foreground')], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'input-icon-right' }, ['Addon (inline-end)'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupInput({ id: 'input-icon-right', placeholder: '' }, h),
                      inputGroupAddon({ align: 'inline-end' }, [icon(h, Info, 'size-4')], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'input-icon-both' }, ['Addon (both)'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupInput({ id: 'input-icon-both', placeholder: '' }, h),
                      inputGroupAddon({}, [icon(h, Mic, 'size-4 text-muted-foreground')], h),
                      inputGroupAddon(
                        { align: 'inline-end' },
                        [icon(h, Radio, 'size-4 animate-pulse text-red-500')],
                        h,
                      ),
                    ],
                    h,
                  ),
                ],
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Buttons']),
          fieldGroup<Message>(
            {},
            [
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'input-button-default' }, ['Button (default)'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupInput({ id: 'input-button-default', placeholder: '' }, h),
                      inputGroupAddon({}, [inputGroupButton<Message>({}, 'Default', h)], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'input-button-outline' }, ['Button (outline)'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupInput({ id: 'input-button-outline', placeholder: '' }, h),
                      inputGroupAddon(
                        {},
                        [inputGroupButton<Message>({ variant: 'outline' }, 'Outline', h)],
                        h,
                      ),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'input-button-icon' }, ['Button (icon)'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupInput({ id: 'input-button-icon', placeholder: '' }, h),
                      inputGroupAddon(
                        { align: 'inline-end' },
                        [
                          inputGroupButton<Message>(
                            { size: 'icon-xs' },
                            icon(h, Star, 'size-4'),
                            h,
                          ),
                        ],
                        h,
                      ),
                    ],
                    h,
                  ),
                ],
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Kbd']),
          fieldGroup<Message>(
            {},
            [
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'input-kbd' }, ['Input Group with Kbd'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupInput({ id: 'input-kbd', placeholder: '' }, h),
                      inputGroupAddon({}, [Kbd<Message>({}, ['⌘K'], h)], h),
                    ],
                    h,
                  ),
                  inputGroup(
                    {},
                    [
                      inputGroupInput({ id: 'input-kbd-2', placeholder: '' }, h),
                      inputGroupAddon({ align: 'inline-end' }, [Kbd<Message>({}, ['⌘K'], h)], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              inputGroup(
                {},
                [
                  inputGroupInput(
                    { id: 'input-search-apps', placeholder: 'Search for Apps...' },
                    h,
                  ),
                  inputGroupAddon({ align: 'inline-end' }, ['Ask AI'], h),
                  inputGroupAddon({ align: 'inline-end' }, [Kbd<Message>({}, ['Tab'], h)], h),
                ],
                h,
              ),
              inputGroup(
                {},
                [
                  inputGroupInput(
                    { id: 'input-search-docs', placeholder: 'Search documentation...' },
                    h,
                  ),
                  inputGroupAddon({}, [icon(h, Search, 'size-4')], h),
                  inputGroupAddon({ align: 'inline-end' }, ['12 results'], h),
                ],
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['In Card']),
          h.div(
            [h.Class('w-full max-w-md rounded-xl border bg-card p-6')],
            [
              h.div([h.Class('mb-4 font-semibold')], ['Card with Input Group']),
              h.div(
                [h.Class('mb-4 text-sm text-muted-foreground')],
                ['This is a card with an input group.'],
              ),
              fieldGroup<Message>(
                {},
                [
                  field<Message>(
                    {},
                    [
                      fieldLabel<Message>({ for: 'email-input' }, ['Email Address'], h),
                      inputGroup(
                        {},
                        [
                          inputGroupInput(
                            { id: 'email-input', placeholder: 'you@example.com', type: 'email' },
                            h,
                          ),
                          inputGroupAddon({ align: 'inline-end' }, [icon(h, Mail, 'size-4')], h),
                        ],
                        h,
                      ),
                    ],
                    h,
                  ),
                  field<Message>(
                    {},
                    [
                      fieldLabel<Message>({ for: 'website-input' }, ['Website URL'], h),
                      inputGroup(
                        {},
                        [
                          inputGroupAddon({}, [inputGroupText({}, ['https://'], h)], h),
                          inputGroupInput({ id: 'website-input', placeholder: 'example.com' }, h),
                          inputGroupAddon(
                            { align: 'inline-end' },
                            [icon(h, ExternalLink, 'size-4')],
                            h,
                          ),
                        ],
                        h,
                      ),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              h.div(
                [h.Class('mt-4 flex justify-end gap-2')],
                [
                  button<Message>({ variant: 'outline' }, 'Cancel', h),
                  button<Message>({}, 'Submit', h),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Textarea']),
          fieldGroup<Message>(
            {},
            [
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'prompt-31' }, ['Addon (block-start)'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupTextarea(
                        { id: 'prompt-31', placeholder: 'Ask, Search or Chat...' },
                        h,
                      ),
                      inputGroupAddon(
                        { align: 'block-start' },
                        [
                          inputGroupText({}, ['Ask, Search or Chat...'], h),
                          icon(h, Info, 'size-4 ml-auto text-muted-foreground'),
                        ],
                        h,
                      ),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              field<Message>(
                {},
                [
                  fieldLabel<Message>({ for: 'textarea-block-end' }, ['Addon (block-end)'], h),
                  inputGroup(
                    {},
                    [
                      inputGroupTextarea(
                        { id: 'textarea-block-end', placeholder: 'Enter your text here...' },
                        h,
                      ),
                      inputGroupAddon(
                        { align: 'block-end' },
                        [
                          inputGroupText({}, ['0/280 characters'], h),
                          inputGroupButton<Message>(
                            {
                              size: 'icon-xs',
                              className: 'ml-auto rounded-full',
                              variant: 'default',
                            },
                            icon(h, Star, 'size-4'),
                            h,
                          ),
                        ],
                        h,
                      ),
                    ],
                    h,
                  ),
                ],
                h,
              ),
            ],
            h,
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
