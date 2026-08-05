import { Content } from '../../app/components/Content'

export interface VPPageProps {
  pageTop?: any
  pageBottom?: any
}

export function VPPage(props: VPPageProps = {}) {
  return (
    <div class="VPPage">
      {props.pageTop}
      <Content />
      {props.pageBottom}
    </div>
  )
}
