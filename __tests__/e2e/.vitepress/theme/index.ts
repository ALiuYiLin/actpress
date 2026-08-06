import type { Theme } from '@actview/press'
import DefaultTheme from '@actview/press/theme'
import CustomLayout from './components/CustomLayout.vue'
import ApiPreference from './components/ApiPreference.vue'
import NavVersion from './components/NavVersion.vue'

export default {
  extends: DefaultTheme,
  Layout: CustomLayout,
  enhanceApp({ app }) {
    app.component('ApiPreference', ApiPreference)
    app.component('NavVersion', NavVersion)
  }
} satisfies Theme
