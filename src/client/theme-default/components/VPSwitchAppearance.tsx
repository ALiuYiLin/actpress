import { ref, watchEffect } from 'actview'
import { useData } from '../composables/data'
import { VPSwitch } from './VPSwitch'

export function VPSwitchAppearance() {
  const { isDark, theme } = useData()

  // Vue 版的 inject('toggle-appearance') 全仓库无 provide 者，恒为默认逻辑
  const toggleAppearance = () => {
    isDark.value = !isDark.value
  }

  const switchTitle = ref('')
  watchEffect(() => {
    switchTitle.value = isDark.value
      ? theme.value.lightModeSwitchTitle || 'Switch to light theme'
      : theme.value.darkModeSwitchTitle || 'Switch to dark theme'
  })

  return (
    <VPSwitch
      class="VPSwitchAppearance"
      title={switchTitle.value}
      aria-checked={isDark.value}
      onclick={toggleAppearance}
    >
      <span class="vpi-sun sun" />
      <span class="vpi-moon moon" />
    </VPSwitch>
  )
}
