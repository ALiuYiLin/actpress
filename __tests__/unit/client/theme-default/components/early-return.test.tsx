// @vitest-environment happy-dom
// 回归测试：早退 return 组件（if (cond) return null / return <JSX/>）经
// @actview/plugin Babel 转换后，__setup() 的任何路径都必须返回 render 函数，
// 否则 ActView 报 `instance.render is not a function`（JSX-Demo 611a7b7）。

import { describe, expect, it } from 'vitest'
import { renderToString } from 'actview'
import { VPBackdrop } from '../../../../../src/client/theme-default/components/VPBackdrop'
import { VPFeatures } from '../../../../../src/client/theme-default/components/VPFeatures'

describe('早退 return 组件（Babel 转换后 setup 返回 render 函数）', () => {
  it('VPBackdrop show=false 早退路径返回 render 函数，渲染为空', () => {
    expect(renderToString(VPBackdrop.__setup({ show: false })())).toBe('')
  })

  it('VPBackdrop show=true 正常路径渲染', () => {
    expect(renderToString(VPBackdrop.__setup({ show: true })())).toContain(
      'VPBackdrop'
    )
  })

  it('VPFeatures 无 features 早退返回 render 函数', () => {
    expect(renderToString(VPFeatures.__setup({})())).toBe('')
  })
})
