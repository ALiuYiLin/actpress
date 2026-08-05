import { computed, shallowReactive } from 'actview'
import type { Ref } from 'vitepress'

/**
 * ActView 无 shallowRef：用 shallowReactive 包一层 { value } 模拟。
 * 只代理容器层，内部值（如侧边栏/标题数组）不做深度代理。
 */
export function shallowRef<T>(value: T): Ref<T> {
  const state = shallowReactive({ value, __v_isRef: true })
  return state as unknown as Ref<T>
}

/**
 * smartComputed — 与 Vue 版语义对齐：当 getter 结果与上一次“相等”时
 * 返回旧引用（避免触发下游更新）。ActView computed 无 oldValue 参数，
 * 用闭包手动缓存。
 */
export function smartComputed<T>(
  getter: () => T,
  comparator = (oldValue: T, newValue: T) =>
    JSON.stringify(oldValue) === JSON.stringify(newValue)
): Ref<T> {
  let cached: T | undefined
  const c = computed(() => {
    const newValue = getter()
    if (cached === undefined || !comparator(cached, newValue)) {
      cached = newValue
    }
    return cached as T
  })
  return c as unknown as Ref<T>
}
