import type { Html, HtmlBuilder } from 'foldkit/html'

import { Alert } from '../../generated/registry/ui/alert'
import { button } from '../../generated/registry/ui/button'
import { badge } from '../../generated/registry/ui/badge'
import { icon } from '../../generated/registry/lib/icons'
import { CircleAlert } from 'lucide'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

export const alertView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Basic']),
          h.div(
            [h.Class('mx-auto flex w-full max-w-lg flex-col gap-4')],
            [
              Alert<Message>(
                {},
                [Alert.title<Message>({}, ['Success! Your changes have been saved.'], h)],
                h,
              ),
              Alert<Message>(
                {},
                [
                  Alert.title<Message>({}, ['Success! Your changes have been saved.'], h),
                  Alert.description<Message>(
                    {},
                    ['This is an alert with title and description.'],
                    h,
                  ),
                ],
                h,
              ),
              Alert<Message>(
                {},
                [
                  Alert.description<Message>(
                    {},
                    ['This one has a description only. No title. No icon.'],
                    h,
                  ),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Icons']),
          h.div(
            [h.Class('mx-auto flex w-full max-w-lg flex-col gap-4')],
            [
              Alert<Message>(
                {},
                [
                  icon(h, CircleAlert),
                  Alert.title<Message>(
                    {},
                    [
                      h.span(
                        [],
                        [
                          "Let's try one with icon, title and a ",
                          h.a([h.Href('#')], ['link']),
                          '.',
                        ],
                      ),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Alert<Message>(
                {},
                [
                  icon(h, CircleAlert),
                  Alert.description<Message>(
                    {},
                    [
                      h.span(
                        [],
                        [
                          'This one has an icon and a description only. No title. ',
                          h.a([h.Href('#')], ['But it has a link']),
                          ' and a ',
                          h.a([h.Href('#')], ['second link']),
                          '.',
                        ],
                      ),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Alert<Message>(
                {},
                [
                  icon(h, CircleAlert),
                  Alert.title<Message>({}, ['Success! Your changes have been saved'], h),
                  Alert.description<Message>(
                    {},
                    ['This is an alert with icon, title and description.'],
                    h,
                  ),
                ],
                h,
              ),
              Alert<Message>(
                {},
                [
                  icon(h, CircleAlert),
                  Alert.title<Message>(
                    {},
                    [
                      'This is a very long alert title that demonstrates how the component handles extended text content and potentially wraps across multiple lines',
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Alert<Message>(
                {},
                [
                  icon(h, CircleAlert),
                  Alert.description<Message>(
                    {},
                    [
                      'This is a very long alert description that demonstrates how the component handles extended text content and potentially wraps across multiple lines',
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Alert<Message>(
                {},
                [
                  icon(h, CircleAlert),
                  Alert.title<Message>(
                    {},
                    [
                      'This is an extremely long alert title that spans multiple lines to demonstrate how the component handles very lengthy headings while maintaining readability and proper text wrapping behavior',
                    ],
                    h,
                  ),
                  Alert.description<Message>(
                    {},
                    [
                      'This is an equally long description that contains detailed information about the alert. It shows how the component can accommodate extensive content while preserving proper spacing, alignment, and readability.',
                    ],
                    h,
                  ),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Destructive']),
          h.div(
            [h.Class('mx-auto flex w-full max-w-lg flex-col gap-4')],
            [
              Alert<Message>(
                { variant: 'destructive' },
                [
                  icon(h, CircleAlert),
                  Alert.title<Message>({}, ['Something went wrong!'], h),
                  Alert.description<Message>(
                    {},
                    ['Your session has expired. Please log in again.'],
                    h,
                  ),
                ],
                h,
              ),
              Alert<Message>(
                { variant: 'destructive' },
                [
                  icon(h, CircleAlert),
                  Alert.title<Message>({}, ['Unable to process your payment.'], h),
                  Alert.description<Message>(
                    {},
                    [
                      h.p(
                        [],
                        [
                          h.span(
                            [],
                            [
                              'Please verify your ',
                              h.a([h.Href('#')], ['billing information']),
                              ' and try again.',
                            ],
                          ),
                        ],
                      ),
                      h.ul(
                        [h.Class('list-inside list-disc')],
                        [
                          h.li([], ['Check your card details']),
                          h.li([], ['Ensure sufficient funds']),
                          h.li([], ['Verify billing address']),
                        ],
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
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Actions']),
          h.div(
            [h.Class('mx-auto flex w-full max-w-lg flex-col gap-4')],
            [
              Alert<Message>(
                {},
                [
                  icon(h, CircleAlert),
                  Alert.title<Message>({}, ['The selected emails have been marked as spam.'], h),
                  Alert.action<Message>({}, [button<Message>({ size: 'xs' }, 'Undo', h)], h),
                ],
                h,
              ),
              Alert<Message>(
                {},
                [
                  icon(h, CircleAlert),
                  Alert.title<Message>({}, ['The selected emails have been marked as spam.'], h),
                  Alert.description<Message>(
                    {},
                    [
                      'This is a very long alert title that demonstrates how the component handles extended text content.',
                    ],
                    h,
                  ),
                  Alert.action<Message>(
                    {},
                    [badge<Message>({ variant: 'secondary' }, ['Badge'], h)],
                    h,
                  ),
                ],
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
