/// <reference types="vite/client" />

/* eslint-disable */
interface Window {
  Telegram: any
  chrome: any
}

interface ImportMeta {
  env: {
    VITE_GA_TRACKING_ID: string
  }
}
