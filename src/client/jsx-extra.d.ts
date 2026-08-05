// ============================================================
// JSX 类型增强（@actview/jsx 未声明的通用属性）
// ============================================================

declare global {
  namespace JSX {
    /** 所有组件的通用属性（React 语义：key 不校验具体 props 接口） */
    interface IntrinsicAttributes {
      key?: string | number | null
    }
  }
}

export {}
