import '../styles/components/VPTeamPageTitle.css?scoped'
export interface VPTeamPageTitleProps {
  title?: any
  lead?: any
}

export function VPTeamPageTitle(props: VPTeamPageTitleProps) {
  return (
    <div class="VPTeamPageTitle">
      {props.title ? <h1 class="title">{props.title}</h1> : null}
      {props.lead ? <p class="lead">{props.lead}</p> : null}
    </div>
  )
}
