import { initMainButton } from '@telegram-apps/sdk'
import { createHooks } from './create-hooks'

export const [useMainButton] = createHooks(initMainButton)
