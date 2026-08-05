// vitest mock：@localSearchIndex（localSearchPlugin 的虚拟模块，测试环境无索引数据）
const localSearchIndex: Record<string, () => Promise<{ default: string }>> = {}
export default localSearchIndex
