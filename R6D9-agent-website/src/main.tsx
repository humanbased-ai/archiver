import { createRoot } from 'react-dom/client'
import Router from '@/router'

import '@/styles/tailwind.css'
import '@/styles/global.css'


import ReactGA from 'react-ga4'

const container = document.getElementById('root')
if (!container) {
  throw new Error('root container not found')
}

initReactGA()

const root = createRoot(container)
root.render(
  <Router></Router>
)

function initReactGA() {
  ReactGA.initialize([
    {
      trackingId: import.meta.env.VITE_GA_TRACKING_ID,
      gaOptions: {
        userId: localStorage.getItem('uid') || undefined
      }
    }
  ])
}
