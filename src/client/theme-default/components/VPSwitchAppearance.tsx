import '../styles/components/VPSwitchAppearance.css?scoped'
import { ref, watchEffect } from 'actview'
import { useData } from '../composables/data'
import { VPSwitch } from './VPSwitch'

export function VPSwitchAppearance() {
  const { isDark, setAppearance, theme } = useData()

  // Vue 版的 inject('toggle-appearance') 全仓库无 provide 者，恒为默认逻辑
  // isDark 是只读 computed（ActView 无 setter），直接赋值会抛
  // "Cannot set property value ... only a getter"（Bug #3），须写 preference。
  const toggleAppearance = () => {
    setAppearance(isDark.value ? 'light' : 'dark')
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
