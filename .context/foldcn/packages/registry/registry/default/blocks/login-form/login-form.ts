import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { input } from '@/components/ui/input'

export type LoginFormConfig<M> = Readonly<{
  email: string
  password: string
  onEmailInput: (value: string) => M
  onPasswordInput: (value: string) => M
  onSubmit: M
  isSubmitting?: boolean
  error?: string
  className?: string
}>

/** Login page block: email + password with a submit button, composed from
 *  foldcn primitives. */
export const loginForm = <M>(config: LoginFormConfig<M>, h: HtmlBuilder<M>): Html =>
  h.div(
    [h.Class('flex min-h-svh w-full items-center justify-center p-4')],
    [
      Card<M>(
        { className: 'w-full max-w-md' },
        [
          Card.header<M>(
            {},
            [
              Card.title<M>({}, ['Welcome back'], h),
              Card.description<M>({}, ['Enter your email below to login to your account'], h),
            ],
            h,
          ),
          Card.content<M>(
            {},
            [
              h.div(
                [h.Class('grid gap-4')],
                [
                  input<M>(
                    {
                      id: 'login-email',
                      label: 'Email',
                      type: 'email',
                      value: config.email,
                      onInput: config.onEmailInput,
                      placeholder: 'you@example.com',
                      isDisabled: config.isSubmitting,
                    },
                    h,
                  ),
                  input<M>(
                    {
                      id: 'login-password',
                      label: 'Password',
                      type: 'password',
                      value: config.password,
                      onInput: config.onPasswordInput,
                      placeholder: '••••••••',
                      isDisabled: config.isSubmitting,
                    },
                    h,
                  ),
                  ...(config.error === undefined
                    ? []
                    : [h.p([h.Class('text-sm text-destructive')], [config.error])]),
                  button<M>(
                    {
                      onClick: config.onSubmit,
                      isDisabled: config.isSubmitting,
                      className: 'w-full',
                    },
                    config.isSubmitting === true ? 'Signing in...' : 'Login',
                    h,
                  ),
                ],
              ),
            ],
            h,
          ),
          Card.footer<M>(
            {},
            [
              h.p(
                [h.Class('text-sm text-muted-foreground')],
                [
                  'Forgot your password? ',
                  h.a(
                    [h.Href('#'), h.Class('underline underline-offset-4 hover:text-primary')],
                    ['Reset it'],
                  ),
                ],
              ),
            ],
            h,
          ),
        ],
        h,
      ),
    ],
  )
