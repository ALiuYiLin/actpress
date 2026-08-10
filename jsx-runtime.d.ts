// @actview/press/jsx-runtime 类型入口
//
// 直接 re-export @actview/jsx/jsx-runtime 的类型（本文件位于 press 包内，
// TS 从包内解析 @actview/jsx 的 pnpm symlink，用户侧无需直接依赖 jsx）。
export * from '@actview/jsx/jsx-runtime'
