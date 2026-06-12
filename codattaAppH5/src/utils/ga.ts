import ReactGA from 'react-ga4'

import { VITE_GA_TRACKING_ID } from '@/config'
import { authStoreActions } from '@/store/auth.store'

/**
 * 初始化Google Analytics。
 */
export function initGA() {
  const authStore = authStoreActions.getAuthStore()

  ReactGA.initialize([
    {
      trackingId: VITE_GA_TRACKING_ID,
      gaOptions: {
        userId: authStore.uid,
      },
    },
  ])
}

/**
 * 跟踪当前页面浏览。
 */
export function trackPageView() {
  ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search })
}

/**
 * 用于跟踪通用事件的选项。
 */
type TTrackEventOptions = {
  method?: string
  contentType?: string
  extra?: Record<string, any>
}

/**
 * 跟踪通用事件。
 * @param eventCategory - 事件类别。
 * @param options - 事件的选项。
 * @param options.method - 与事件关联的方法。
 * @param options.contentType - 与事件关联的内容类型。
 * @param options.customParams - 与事件关联的自定义参数。
 */

export function trackEvent(eventCategory: string, params?: Partial<TTrackEventOptions>) {
  if (params) {
    const { method, contentType, extra } = params
    ReactGA.event(eventCategory, {
      method,
      content_type: contentType,
      customParams: JSON.stringify(extra),
    })
  } else {
    ReactGA.event(eventCategory)
  }
}

export function setReactGAUserId(userId: string) {
  ReactGA.set({ userId })
}

/**
 * Google Analytics事件类别的常量。
 */
export const TRACK_CATEGORY = {
  // 与web重叠埋点
  LANDING_CHANNEL: 'landing',

  // 用户行为
  SIGN_UP: 'sign_up', // 登录成功后，新用户
  LOGIN: 'login', // 登录成功后，老用户
  LOGOUT: 'logout', // 退出登录

  QUEST_VERIFY_CLICK: 'verify_quest',
  QUEST_COMPLET_CLICK: 'complete_quest',
  QUEST_REWARD_CLICK: 'receive_quest_reward',
  QUEST_VIEW_LIST: 'view_quest_list',
  QUEST_GO: 'goto_quest',

  VALIDATION_VIEW_DETAIL_CLICK: 'validation_detail',
  VALIDATION_SUBMIT_CLICK: 'submit_validation',

  SHARE: 'share',

  // tg 独有埋点
  PAGE_MENU_CLICK: 'page_menu_click',
  ACCOUNT_AVATAR_CLICK: 'account_avatar_click',

  ACCOUNT_USERNAME_EDITE_CLICK: 'account_username_edit_click',
  ACCOUNT_USERNAME_SAVE_CLICK: 'account_username_save_click',

  VALIDATION_VIEW_MORE_CLICK: 'validation_viewmore_click',

  VALIDATION_TAB_CLICK: 'validation_tab_click',
  VALIDATION_ACCEPT_CLICK: 'validation_accept_task_click',
  VALIDATION_VALIDATE_CLICK: 'validation_validate_click',

  REFERRAL_INVITE_CLICK: 'referral_invite_click',
  REFERRAL_COPY_CLICK: 'referral_copy_click',
  REFERRAL_HISTORY_CLICK: 'referral_history_click',

  // ADS
  ADS_HOME_GO_CLICK: 'ads_home_go_click',
  ADS_AGREEMENT_NEXT_CLICK: 'ads_agreement_next_click',
  ADS_INFO_STEP_NEXT_CLICK: 'ads_info_step_next_click',
  ADS_INFO_NEXT_CLICK: 'ads_info_next_click',
  ADS_STAKE_STEP_NEXT_CLICK: 'ads_stake_step_next_click',
  ADS_STAKE_SKIP_STAKE_CLICK: 'ads_stake_skip_stake_click',
  ADS_STAKE_STAKE_BTN_CLICK: 'ads_stake_stake_btn_click',
  ADS_STAKE_INIT_ORDER_ERROR: 'ads_stake_init_order_error',
  ADS_STAKE_STAKE_ERROR: 'ads_stake_stake_error',
  ADS_STAKE_SUMMARY_NEXT_CLICK: 'ads_stake_summary_next_click',
  ADS_INTRO_NEXT_CLICK: 'ads_intro_next_click',
  ADS_WATCH_FEEDBACK_CLICK: 'ads_watch_feedback_click',
  ADS_WATCH_ADS_ITEM: 'ads_watch_ads_item',

  ADS_STAKE_HASHHEX: 'ads_stake_hashHex', // 广告质押时解析boc后的hashHex的值

  // 游戏埋点
  GAME_PLAY_CLICK: 'game_play_click',
  GAME_SETTLE: 'game_settle',
  GAME_SHARE_CLICK: 'game_share_click',
  GAME_BROWSE_CASE_DATA_CLICK: 'game_browse_case_data_click',
  GAME_BACK_CLICK: 'game_back_click',
}
