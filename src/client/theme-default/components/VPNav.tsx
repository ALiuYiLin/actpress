import { computed, watchEffect } from 'actview'
import { inBrowser } from '@actview/press'
import { useData } from '../composables/data'
import { useNav } from '../composables/nav'
import { VPNavBar } from './VPNavBar'
import { VPNavScreen } from './VPNavScreen'

export interface VPNavProps {
  navBarTitleBefore?: any
  navBarTitleAfter?: any
  navBarContentBefore?: any
  navBarContentAfter?: any
  navScreenContentBefore?: any
  navScreenContentAfter?: any
}

export function VPNav(props: VPNavProps = {}) {
  const { isScreenOpen, toggleScreen } = useNav()
  const { frontmatter } = useData()

  const hasNavbar = computed(() => frontmatter.value.navbar !== false)

  watchEffect(() => {
    if (inBrowser) {
      document.documentElement.classList.toggle('hide-nav', !hasNavbar.value)
    }
  })

  return function () {
    if (!hasNavbar.value) return null
    return (
      <header class="VPNav">
        <VPNavBar
          isScreenOpen={isScreenOpen.value}
          onToggleScreen={toggleScreen}
          navBarTitleBefore={props.navBarTitleBefore}
          navBarTitleAfter={props.navBarTitleAfter}
          navBarContentBefore={props.navBarContentBefore}
          navBarContentAfter={props.navBarContentAfter}
        />
        <VPNavScreen
          open={isScreenOpen.value}
          navScreenContentBefore={props.navScreenContentBefore}
          navScreenContentAfter={props.navScreenContentAfter}
        />
      </header>
    )
  }
}
