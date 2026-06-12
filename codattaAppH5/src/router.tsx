import { Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom'

import AppLayout from '@/components/layout/app-layout'
import AccountLayout from '@/components/layout/account-layout'
import DemoLayout from '@/components/layout/demo-layout'
import AdsLayout from '@/components/layout/ads-layout'

const config = createRoutesFromElements(
  <>
    <Route path="/demo" element={<DemoLayout />}>
      {/* <Route path="tg" lazy={() => import('@/pages/demo/tg-mini-app')}></Route>
      <Route path="tg/sdk" lazy={() => import('@/pages/demo/tg-sdk-test')}></Route>
      <Route path="tg/keyboard" lazy={() => import('@/pages/demo/tg-keyboard-test')}></Route> */}
    </Route>

    <Route path="/landing" lazy={() => import('@/pages/landing')}></Route>

    <Route path="/" element={<AppLayout />}>
      <Route path="" lazy={() => import('@/pages/app/home')}></Route>
      <Route path="ads" lazy={() => import('@/pages/app/ads/ads-home-vault-2')}></Route>
      <Route path="account/home" lazy={() => import('@/pages/app/account/home')}></Route>
      <Route path="validation" lazy={() => import('@/pages/app/validation/list')}></Route>
      <Route path="validation/:submission_id/detail" lazy={() => import('@/pages/app/validation/detail')}></Route>
      <Route path="validation/:submission_id/detail-v2" lazy={() => import('@/pages/app/validation/detail-v2')}></Route>
      <Route path="validation/:submission_id/validate" lazy={() => import('@/pages/app/validation/validate')}></Route>
      <Route path="quest" lazy={() => import('@/pages/app/quest')}></Route>
      <Route path="referral" lazy={() => import('@/pages/app/referral/home')}></Route>
      <Route path="referral/history" lazy={() => import('@/pages/app/referral/history')}></Route>
    </Route>
    <Route path="/game" element={<AppLayout navMenuVisibile={false} />}>
      <Route path="" lazy={() => import('@/pages/app/game/game')}></Route>
      <Route path="result" lazy={() => import('@/pages/app/game/result')}></Route>
      <Route path="case/:submission_id" lazy={() => import('@/pages/app/game/case-data')}></Route>
    </Route>

    <Route path="/checkin" element={<AppLayout navMenuVisibile={false} />}>
      <Route path="" lazy={() => import('@/pages/app/checkin')}></Route>
    </Route>

    <Route path="/ads" element={<AdsLayout />}>
      {/* vault 2nd */}
      <Route path="okx-checkin" lazy={() => import('@/pages/app/ads/ads-okx-checkin')}></Route>
      <Route path="reward/stage" lazy={() => import('@/pages/app/ads/ads-reward-stage')}></Route>
      <Route path="info/report" lazy={() => import('@/pages/app/ads/ads-annotation')}></Route>
      <Route path="staking" lazy={() => import('@/pages/app/ads/ads-stake-vault-2')}></Route>
      <Route path="verification" lazy={() => import('@/pages/app/ads/ads-verification')}></Route>
      <Route path="withdraw" lazy={() => import('@/pages/app/ads/ads-withdraw-vault-2')}></Route>
      <Route path="watch/end" lazy={() => import('@/pages/app/ads/ads-watch-end')}></Route>
      <Route path="watch" lazy={() => import('@/pages/app/ads/ads-watch-vault-2')}></Route>
      <Route path="watch/end" lazy={() => import('@/pages/app/ads/ads-watch-vault-2')}></Route>
      <Route path="stake/history" lazy={() => import('@/pages/app/ads/ads-stake-history')}></Route>
    </Route>

    <Route path="/account" element={<AccountLayout />}>
      <Route path="signin" lazy={() => import('@/pages/account/tg-app-signin')} />
      <Route path="signin/email" lazy={() => import('@/pages/account/email-signin')} />
      <Route path="referral/:code" lazy={() => import('@/pages/app/referral-landing')}></Route>
    </Route>

    <Route path="*" lazy={() => import('@/pages/errors/not-found')} />
  </>,
)

export const router = createBrowserRouter(config, { basename: '/m' })
