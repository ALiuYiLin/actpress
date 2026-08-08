import type { DefaultTheme } from '@actview/press/theme'
import { withBase } from '@actview/press'

export interface VPImageProps {
  image: DefaultTheme.ThemeableImage
  alt?: string
  [key: string]: any
}

// defineComponent + JSX：render 内允许条件 return（VPImage 有递归与早退）
export function VPImage(props: VPImageProps) {
  return function () {
    const { image, alt, ...rest } = props
    if (!image) return null

    if (typeof image === 'string' || 'src' in image) {
      const src = typeof image === 'string' ? image : image.src
      const altText = alt ?? (typeof image === 'string' ? '' : image.alt || '')
      return <img class="VPImage" src={withBase(src)} alt={altText} {...rest} />
    }

    // 双主题图（light/dark）
    return (
      <div style={{ display: 'contents' }}>
        <VPImage class="dark" image={image.dark} alt={image.alt} {...rest} />
        <VPImage class="light" image={image.light} alt={image.alt} {...rest} />
      </div>
    )
  }
}
