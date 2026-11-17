// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers'

export default defineConfig(() => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['app.css'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: ['roboto-font', 'material-icons'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      vueRouterMode: 'hash',

      // GitHub Pages project sites are served from /<repo>/, so the CI
      // workflow sets PUBLIC_PATH when building. Locally it stays "/".
      publicPath: process.env.PUBLIC_PATH || '/',

      // Capacitor/Cordova friendly (hash routing already covers it)
      target: {},

      // vitePlugins: []
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      port: 9000,
      open: false
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {
        dark: true,
        notify: {
          position: 'top',
          timeout: 1800,
          color: 'dark',
          textColor: 'white'
        }
      },

      // iconSet: 'material-icons',
      // lang: 'en-US',

      // Quasar plugins
      plugins: ['Notify', 'Dialog']
    },

    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    }
  }
})
