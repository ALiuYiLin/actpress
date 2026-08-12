// jsx-dev-runtime 统一入口
//
// Vite dev 模式下 esbuild automatic JSX（jsxImportSource:
// '@actview/press'）生成 `import { jsxDEV, Fragment } from
// '@actview/press/jsx-dev-runtime'` 指向此处，与 jsx-runtime 对称。
export { Fragment, jsxDEV } from '@actview/jsx/jsx-dev-runtime'
