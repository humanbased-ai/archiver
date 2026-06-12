import { initUtils } from '@telegram-apps/sdk'
import { createHooks } from './create-hooks'

export const [useUtils] = createHooks(initUtils)
