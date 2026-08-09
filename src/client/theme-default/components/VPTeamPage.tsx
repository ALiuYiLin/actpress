import '../styles/components/VPTeamPage.css?scoped'
export interface VPTeamPageProps {
  children?: any
}

export function VPTeamPage(props: VPTeamPageProps) {
  return <div class="VPTeamPage">{props.children}</div>
}
