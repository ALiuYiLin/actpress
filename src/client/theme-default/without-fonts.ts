import './styles/vars.css'
import './styles/base.css'
import './styles/icons.css'
import './styles/utils.css'
import './styles/components/custom-block.css'
import './styles/components/vp-code.css'
import './styles/components/vp-code-group.css'
import './styles/components/vp-doc.css'
import './styles/components/vp-sponsor.css'
import './styles/components/vp-badge.css'
import './styles/components/vp-button.css'
import './styles/components/vp-image.css'
import './styles/components/vp-skip-link.css'

import type { Theme } from 'vitepress'
import { Layout } from './Layout'

export { VPBadge } from './components/VPBadge'
export { VPButton } from './components/VPButton'
export { default as VPDocAsideSponsors } from './components/VPDocAsideSponsors.vue'
export { default as VPFeatures } from './components/VPFeatures.vue'
export { default as VPHomeContent } from './components/VPHomeContent.vue'
export { default as VPHomeFeatures } from './components/VPHomeFeatures.vue'
export { default as VPHomeHero } from './components/VPHomeHero.vue'
export { default as VPHomeSponsors } from './components/VPHomeSponsors.vue'
export { VPImage } from './components/VPImage'
export { default as VPLink } from './components/VPLink.vue'
export { default as VPNavBarSearch } from './components/VPNavBarSearch.vue'
export { default as VPSocialLink } from './components/VPSocialLink.vue'
export { default as VPSocialLinks } from './components/VPSocialLinks.vue'
export { default as VPSponsors } from './components/VPSponsors.vue'
export { default as VPTeamMembers } from './components/VPTeamMembers.vue'
export { default as VPTeamPage } from './components/VPTeamPage.vue'
export { default as VPTeamPageSection } from './components/VPTeamPageSection.vue'
export { default as VPTeamPageTitle } from './components/VPTeamPageTitle.vue'

export { useLayout } from './composables/layout'

const theme: Theme = {
  Layout
  // enhanceApp 的全局组件注册（app.component）随 Vue 移除；
  // md 内 <Badge> 等组件标签的解析通道在 C 阶段实现
}

export default theme
