import './styles/vars.css'
import './styles/base.css'
import './styles/icons.css'
import './styles/utils.css'
import './styles/components/custom-block.css'
import './styles/components/vp-code.css'
import './styles/components/vp-code-group.css'
import './styles/components/vp-doc.css'
import './styles/components/vp-sponsor.css'

import type { Theme } from '@actview/press'
import { Layout } from './Layout'

export { VPBadge } from './components/VPBadge'
export { VPButton } from './components/VPButton'
export { VPDocAsideSponsors } from './components/VPDocAsideSponsors'
export { VPFeatures } from './components/VPFeatures'
export { VPHomeContent } from './components/VPHomeContent'
export { VPHomeFeatures } from './components/VPHomeFeatures'
export { VPHomeHero } from './components/VPHomeHero'
export { VPHomeSponsors } from './components/VPHomeSponsors'
export { VPImage } from './components/VPImage'
export { VPLink } from './components/VPLink'
export { VPNavBarSearch } from './components/VPNavBarSearch'
export { VPSocialLink } from './components/VPSocialLink'
export { VPSocialLinks } from './components/VPSocialLinks'
export { VPSponsors } from './components/VPSponsors'
export { VPTeamMembers } from './components/VPTeamMembers'
export { VPTeamPage } from './components/VPTeamPage'
export { VPTeamPageSection } from './components/VPTeamPageSection'
export { VPTeamPageTitle } from './components/VPTeamPageTitle'

export { useLayout } from './composables/layout'

const theme: Theme = {
  Layout
  // enhanceApp 的全局组件注册（app.component）随 Vue 移除；
  // md 内 <Badge> 等组件标签的解析通道在 C 阶段实现
}

export default theme
