import type { DefaultTheme } from 'vitepress/theme'
import { VPTeamMembersItem } from './VPTeamMembersItem'

export interface VPTeamMembersProps {
  size?: 'small' | 'medium'
  members: DefaultTheme.TeamMember[]
  [key: string]: any
}

export function VPTeamMembers(props: VPTeamMembersProps) {
  const size = props.size ?? 'medium'
  const classes = [size, `count-${props.members.length}`].join(' ')

  return (
    <div class={['VPTeamMembers', classes].join(' ')}>
      <div class="container">
        {props.members.map((member) => (
          <div key={member.name} class="item">
            <VPTeamMembersItem size={size} member={member} />
          </div>
        ))}
      </div>
    </div>
  )
}
