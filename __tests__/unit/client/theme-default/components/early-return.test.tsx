// @vitest-environment happy-dom
// 回归测试：早退 return 组件（if (cond) return null / return <JSX/>）经
// @actview/plugin Babel 转换后，无论 setup 返回渲染函数还是嵌套组件对象，
// 经 renderToString（SSR 序列化，与 normalizeSetupResult 等价处理）都必须
// 正确渲染——早退路径渲染空、正常路径渲染内容。

import { describe, expect, it } from 'vitest'
import { renderToString } from 'actview'
import { jsx } from '@actview/jsx'
import { VPBackdrop } from '../../../../../src/client/theme-default/components/VPBackdrop'
import { VPFeatures } from '../../../../../src/client/theme-default/components/VPFeatures'

describe('早退 return 组件（Babel 转换后经 SSR 序列化渲染）', () => {
  it('VPBackdrop show=false 早退路径渲染为空', () => {
    expect(renderToString(jsx(VPBackdrop, { show: false }))).toBe('')
  })

  it('VPBackdrop show=true 正常路径渲染', () => {
    expect(renderToString(jsx(VPBackdrop, { show: true }))).toContain(
      'VPBackdrop'
    )
  })

  it('VPFeatures 无 features 早退渲染为空', () => {
    expect(renderToString(jsx(VPFeatures, {}))).toBe('')
  })
})
