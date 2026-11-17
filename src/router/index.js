import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHashHistory } from 'vue-router'

import routes from './routes.js'

/*
 * Hash history works on every static host (GitHub Pages, Netlify, Vercel…)
 * and also inside a Capacitor WebView, with zero server rewrite rules.
 */
export default defineRouter(() => {
  return createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHashHistory()
  })
})
