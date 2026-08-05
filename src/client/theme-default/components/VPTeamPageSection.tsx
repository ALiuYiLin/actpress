export interface VPTeamPageSectionProps {
  title?: any
  lead?: any
  members?: any
}

export function VPTeamPageSection(props: VPTeamPageSectionProps) {
  return (
    <section class="VPTeamPageSection">
      <div class="title">
        <div class="title-line" />
        {props.title ? <h2 class="title-text">{props.title}</h2> : null}
      </div>
      {props.lead ? <p class="lead">{props.lead}</p> : null}
      {props.members ? <div class="members">{props.members}</div> : null}
    </section>
  )
}
