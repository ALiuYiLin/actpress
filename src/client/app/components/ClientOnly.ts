import { defineComponent, onMounted, ref } from 'actview'

/**
 * ClientOnly — 仅在客户端挂载后渲染 children。
 * ActView 版：默认插槽通过 props.children 传入。
 */
export const ClientOnly = defineComponent(function (props: any) {
  const show = ref(false)

  onMounted(() => {
    show.value = true
  })

  return function () {
    return show.value ? (props.children ?? null) : null
  }
})
