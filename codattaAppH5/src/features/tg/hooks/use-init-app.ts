import { initMiniApp } from '@telegram-apps/sdk'
import { createHooks } from './create-hooks'

export const [useInitMiniApp] = createHooks(initMiniApp)
