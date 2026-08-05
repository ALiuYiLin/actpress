import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { withBase } from 'vitepress'

export interface VPImageProps {
  image: DefaultTheme.ThemeableImage
  alt?: string
  [key: string]: any
}

export const VPImage = defineComponent(function (props: VPImageProps) {
  return function () {
    const { image, alt, ...rest } = props
    if (!image) return null

    if (typeof image === 'string' || 'src' in image) {
      const src = typeof image === 'string' ? image : image.src
      const altText = alt ?? (typeof image === 'string' ? '' : image.alt || '')
      return createElement('img', {
        class: 'VPImage',
        src: withBase(src),
        alt: altText,
        ...rest
      })
    }

    // 双主题图（light/dark）
    return createElement(
      'div',
      { style: { display: 'contents' } },
      createElement(VPImage, {
        class: 'dark',
        image: image.dark,
        alt: image.alt,
        ...rest
      }),
      createElement(VPImage, {
        class: 'light',
        image: image.light,
        alt: image.alt,
        ...rest
      })
    )
  }
})
