import { defineConfig } from 'wxt'

export default defineConfig({
  modules: [
    '@wxt-dev/module-react',
  ],

  manifest: {
    name: 'FocusBell',

    description:
      'A simple and powerful alarm extension for staying on schedule.',

    permissions: [
      'storage',
      'alarms',
      'notifications',
    ],

    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    },

    action: {
      default_title:
        'FocusBell',
    },
  },
})