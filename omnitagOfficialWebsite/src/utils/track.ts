import ReactGA from "react-ga4";

import { GA_TRACKING_ID } from "@/config";

/**
 * 初始化Google Analytics。
 */
export function initGA() {
  ReactGA.initialize([
    {
      trackingId: GA_TRACKING_ID,
    },
  ]);
}

/**
 * 跟踪当前页面浏览。
 */
export function trackPageView(pageName: string) {
  ReactGA.send({ hitType: "pageview", page: pageName });
}

/**
 * 用于跟踪通用事件的选项。
 */
type TTrackEventOptions = {
  method?: string;
  contentType?: string;
  extra?: Record<string, unknown>;
};

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
    const { method, contentType, extra } = params;
    ReactGA.event(eventCategory, {
      method,
      content_type: contentType,
      customParams: JSON.stringify(extra),
    });
  } else {
    ReactGA.event(eventCategory);
  }
}

/**
 * Google Analytics事件类别的常量。
 */
export const TRACK_CATEGORY = {
  NAV_CLICK: "nav-click",
  LINK_CLICK: "link-click",
};
