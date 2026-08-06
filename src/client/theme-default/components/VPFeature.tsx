import type { DefaultTheme } from '@actview/press/theme'
import { VPImage } from './VPImage'
import { VPLink } from './VPLink'

export interface VPFeatureProps {
  icon?: DefaultTheme.FeatureIcon
  title?: string
  details?: string | string[]
  link?: string
  linkText?: string
  rel?: string
  target?: string
}

export function VPFeature(props: VPFeatureProps) {
  const { icon, title, details, link, linkText, rel, target } = props

  return (
    <VPLink
      class="VPFeature"
      href={link}
      rel={rel}
      target={target}
      noIcon
      tag={link ? 'a' : 'div'}
    >
      <article class="box">
        {typeof icon === 'object' && icon.wrap ? (
          <div class="icon">
            <VPImage
              image={icon}
              alt={icon.alt}
              height={icon.height || 48}
              width={icon.width || 48}
            />
          </div>
        ) : typeof icon === 'object' ? (
          <VPImage
            image={icon}
            alt={icon.alt}
            height={icon.height || 48}
            width={icon.width || 48}
          />
        ) : icon ? (
          // 原 v-html：ActView 无 innerHTML，用 ref 回调注入 DOM（icon 支持内联 SVG/HTML 字符串）
          // 纯文本场景可直接 <div class="icon">{icon}</div>
          <div
            class="icon"
            ref={(el: HTMLDivElement | null) => {
              if (el) el.innerHTML = icon
            }}
          />
        ) : null}
        {/* 原 v-html：文本渲染 */}
        <h2 class="title">{title}</h2>
        {Array.isArray(details) ? (
          <ul class="details">
            {details.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : details ? (
          <p class="details">{details}</p>
        ) : null}
        {linkText ? (
          <div class="link-text">
            <p class="link-text-value">
              {linkText} <span class="vpi-arrow-right link-text-icon" />
            </p>
          </div>
        ) : null}
      </article>
    </VPLink>
  )
}
