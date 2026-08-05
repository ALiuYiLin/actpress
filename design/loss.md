# 样式迁移缺失清单（scoped 子元素规则丢失组件前缀）

> 对比基线：迁移前的 Vue 版主题（`vue-baseline` 分支 / git worktree `C:/code/vitepress-vue`，commit `4e29bec1`）

> 对比方式：脚本提取原版每个 `.vue` 的 `<style scoped>` 选择器，与当前 `src/client/theme-default/styles/`（含 `components/*.css`）逐一比对。

## 结论

| 分类 | 数量 | 说明 |
|---|---|---|
| 正确迁移（带组件前缀） | 359 条 | 如 `.VPDoc .content` |
| **① 仅裸类（scoped 隔离丢失）** | **186 条 / 35 个组件** | 规则存在但无本组件前缀，如 `.title`，多个组件同名类互相覆盖（含 10 条 `:deep` 穿透规则） |
| ② 完全缺失 | 0 条 | 没有任何 scoped 规则彻底消失 |

**影响**：功能上裸类大多能命中（类名匹配），但组件共用同名类（`.title`/`.container`/`.icon`/`.text`/`.link`/`.button`/`.menu` 等）时，后加载规则覆盖先加载——这正是布局/文字显示不对的来源。

## 缺失清单（186 条，按组件）

### VPDoc（5 条）

`.aside-container`，`.aside-container::-webkit-scrollbar`，`.aside-content`，`.aside-curtain`，`.left-aside`

### VPDocAsideOutline（3 条）

`.content`，`.outline-marker`，`.outline-title`

### VPDocFooter（10 条）

`.desc`，`.edit-info`，`.edit-link-button`，`.edit-link-button:hover`，`.edit-link-icon`，`.pager-link`，`.pager-link.next`，`.pager-link:hover`，`.prev-next`，`.title`

### VPDocFooterLastUpdated（1 条）

`.VPLastUpdated`

### VPFeature（9 条）

`.box`，`.details`，`.icon`，`.link-text`，`.link-text-icon`，`.link-text-value`，`.title`，`:deep(.VPImage)`，`ul.details`

### VPFeatures（7 条）

`.container`，`.item`，`.item.grid-2`，`.item.grid-3`，`.item.grid-4`，`.item.grid-6`，`.items`

### VPFlyout（5 条）

`.button`，`.button[aria-expanded="false"] + .menu`，`.button[aria-expanded="true"] + .menu`，`.option-icon`，`.text-icon`

### VPFooter（3 条）

`.container`，`.copyright`，`.message`

### VPHero（7 条）

`.action`，`.clip`，`.heading`，`.image`，`.image-bg`，`.image-container`，`:deep(.image-src)`

### VPHomeContent（6 条）

`.container`，`:deep(.VPHomeSponsors a)`，`:deep(.VPHomeSponsors h2)`，`:deep(.VPHomeSponsors)`，`:deep(.VPTeamPage a)`，`:deep(.VPTeamPage)`

### VPHomeSponsors（6 条）

`.action`，`.container`，`.icon`，`.love`，`.message`，`.sponsors`

### VPLocalNav（5 条）

`.container`，`.menu`，`.menu-icon`，`.menu:hover`，`:deep(.VPLocalNavOutlineDropdown > button)`

### VPLocalNavOutlineDropdown（10 条）

`.flyout-enter-active`，`.flyout-enter-from`，`.flyout-leave-active`，`.flyout-leave-to`，`.header`，`.icon`，`.items`，`.open > .icon`，`.outline`，`.top-link`

### VPLocalSearchBox（36 条）

`.backdrop`，`.excerpt`，`.excerpt-gradient-bottom`，`.excerpt-gradient-top`，`.excerpt-wrapper`，`.local-search-icon`，`.navigate-icon`，`.no-results`，`.result`，`.result > div`，`.result.selected`，`.result.selected .excerpt`，`.result.selected .title-icon`，`.result.selected .titles`，`.results`，`.search-actions`，`.search-actions button`，`.search-actions button.clear-button:disabled`，`.search-actions button:not([disabled]):hover`，`.search-actions.before`，`.search-bar`，`.search-bar:focus-within`，`.search-icon`，`.search-input`，`.search-input::-webkit-search-cancel-button`，`.search-keyboard-shortcuts`，`.search-keyboard-shortcuts kbd`，`.search-keyboard-shortcuts span`，`.shell`，`.title`，`.title svg`，`.title-icon`，`.title.main`，`.titles`，`.toggle-layout-button.detailed-list`，`:deep(.vp-code-group)`

### VPMenuGroup（1 条）

`.title`

### VPMenuLink（3 条）

`.link`，`.link.active`，`.link:hover`

### VPNavBar（8 条）

`.appearance + .social-links::before`，`.container > .content`，`.container > .title`，`.menu + .appearance::before`，`.menu + .social-links::before`，`.menu + .translations::before`，`.social-links`，`.translations + .appearance::before`

### VPNavBarExtra（5 条）

`.appearance-action`，`.item.appearance`，`.item.social-links`，`.social-links-list`，`.trans-title`

### VPNavBarHamburger（1 条）

`.container`

### VPNavBarSearchButton（4 条）

`.keys`，`.text`，`:root.mac .key-ctrl`，`:root:not(.mac) .key-cmd`

### VPNavBarTranslations（1 条）

`.title`

### VPNavScreen（5 条）

`.appearance + .social-links`，`.menu + .appearance`，`.menu + .social-links`，`.menu + .translations`，`.translations + .appearance`

### VPNavScreenAppearance（1 条）

`.text`

### VPNavScreenMenuGroup（3 条）

`.group + .group`，`.group + .item`，`.group:first-child`

### VPNavScreenMenuGroupSection（1 条）

`.title`

### VPNavScreenTranslations（6 条）

`.icon`，`.icon.chevron`，`.icon.lang`，`.link`，`.list`，`.title`

### VPSidebar（2 条）

`.curtain`，`.nav`

### VPSidebarGroup（3 条）

`.group`，`.group + .group`，`:deep(.caret-icon)`

### VPSidebarItem（3 条）

`.caret`，`.item:hover .caret`，`.item:hover .caret:hover`

### VPSwitch（2 条）

`.check`，`.icon`

### VPSwitchAppearance（4 条）

`.dark .moon`，`.dark .sun`，`.moon`，`.sun`

### VPTeamMembersItem（7 条）

`.avatar-img`，`.org.link`，`.org.link:hover`，`.sp .sp-link.link:focus`，`.sp .sp-link.link:hover`，`.sp-icon`，`.sp-link`

### VPTeamPage（6 条）

`.VPHome :slotted(.VPTeamPageTitle)`，`:slotted(.VPTeamMembers + .VPTeamMembers)`，`:slotted(.VPTeamMembers + .VPTeamPageSection)`，`:slotted(.VPTeamMembers)`，`:slotted(.VPTeamPageSection + .VPTeamPageSection)`，`:slotted(.VPTeamPageTitle + .VPTeamPageSection)`

### VPTeamPageSection（5 条）

`.lead`，`.members`，`.title`，`.title-line`，`.title-text`

### VPTeamPageTitle（2 条）

`.lead`，`.title`


合计：186 条裸类规则（其中 176 条普通 scoped 子选择器 + 10 条 `:deep` 穿透规则）。

## 特殊选择器

- `:slotted(...)`（VPTeamPage 6 条）：Vue 特有，迁移时已按 VP 前缀类名处理（如 `.VPTeamPage .VPTeamMembers`），不在上表；如需完整 scoped 语义需插件支持。

- `:root.mac` / `:root:not(.mac)`（VPNavBarSearchButton）：`:root` 不加 scoped 属性，属全局规则，不影响。

- `:deep()`：共 10 条处于裸类状态（目标类在现有 css 以裸类存在，但缺少 `.组件` 前缀），需补充为 `.组件 :deep(目标)` 形式：
  - VPFeature：`:deep(.VPImage)`
  - VPHero：`:deep(.image-src)`
  - VPHomeContent：`:deep(.VPHomeSponsors)`、`:deep(.VPHomeSponsors h2)`、`:deep(.VPHomeSponsors a)`、`:deep(.VPTeamPage)`、`:deep(.VPTeamPage a)`（5 条）
  - VPLocalNav：`:deep(.VPLocalNavOutlineDropdown > button)`
  - VPLocalSearchBox：`:deep(.vp-code-group)`
  - VPSidebarGroup：`:deep(.caret-icon)`
