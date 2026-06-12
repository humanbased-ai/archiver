import { initBackButton } from '@telegram-apps/sdk'
import { createHooks } from './create-hooks'

export const [useBackButton] = createHooks(initBackButton)
