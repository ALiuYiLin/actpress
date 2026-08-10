// jsx-runtime 统一入口
//
// md 编译 / 用户组件（esbuild automatic JSX runtime，jsxImportSource:
// '@actview/press'）生成的 `import { jsx, jsxs, Fragment } from
// '@actview/press/jsx-runtime'` 指向此处。这样用户只需直接依赖
// @actview/press，jsx 实现来自 press 锁定的 @actview/jsx 版本——
// 避免 pnpm 严格模式下用户代码直接 import '@actview/jsx'（press 的
// 传递依赖未提升到宿主根）导致解析失败、以及版本不一致问题。
export { Fragment, jsx, jsxs } from '@actview/jsx/jsx-runtime'
