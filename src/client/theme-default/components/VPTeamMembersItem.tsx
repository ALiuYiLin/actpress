import type { DefaultTheme } from 'actpress/theme'
import { VPLink } from './VPLink'
import { VPSocialLinks } from './VPSocialLinks'

export interface VPTeamMembersItemProps {
  size?: 'small' | 'medium'
  member: DefaultTheme.TeamMember
}

export function VPTeamMembersItem(props: VPTeamMembersItemProps) {
  const size = props.size ?? 'medium'
  const member = props.member

  return (
    <article class={['VPTeamMembersItem', size].join(' ')}>
      <div class="profile">
        <figure class="avatar">
          <img class="avatar-img" src={member.avatar} alt={member.name} />
        </figure>
        <div class="data">
          <h1 class="name">{member.name}</h1>
          {member.title || member.org ? (
            <p class="affiliation">
              {member.title ? <span class="title">{member.title}</span> : null}
              {member.title && member.org ? <span class="at"> @ </span> : null}
              {member.org ? (
                <VPLink
                  class={['org', member.orgLink ? 'link' : ''].join(' ')}
                  href={member.orgLink}
                  noIcon
                >
                  {member.org}
                </VPLink>
              ) : null}
            </p>
          ) : null}
          {/* 原 v-html：ActView 无 innerHTML，文本渲染 */}
          {member.desc ? <p class="desc">{member.desc}</p> : null}
          {member.links ? (
            <div class="links">
              <VPSocialLinks links={member.links} me={false} />
            </div>
          ) : null}
        </div>
      </div>
      {member.sponsor ? (
        <div class="sp">
          <VPLink class="sp-link" href={member.sponsor} noIcon>
            <span class="vpi-heart sp-icon" /> {member.actionText || 'Sponsor'}
          </VPLink>
        </div>
      ) : null}
    </article>
  )
}
