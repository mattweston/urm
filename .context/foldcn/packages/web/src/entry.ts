import { Runtime } from 'foldkit'

import { activeRegistryStyle } from './active-style'
import { Message } from './message'
import { Model } from './model'
import { init } from './init'
import { subscriptions } from './subscriptions'
import { update } from './update'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: (request) => Message.ClickedLink({ request }),
    onUrlChange: (url) => Message.ChangedUrl({ url }),
  },
  devTools: {
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
    Message,
  },
})

// Non-default styles are client-rendered: the prerendered HTML is always
// default-styled (styles resolve at module-evaluation time, which on the server
// has no stored preference), so hydrating it against a different style's vnodes
// would mismatch. `run` renders fresh from the active style's modules.
if (activeRegistryStyle() === 'default') {
  Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })
} else {
  Runtime.run(application)
}
