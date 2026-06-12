import { initViewport } from '@telegram-apps/sdk'
import { createHooks } from './create-hooks'

export const [useViewport] = createHooks(initViewport)
