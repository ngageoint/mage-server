import { MageEventId } from '../entities/events/entities.events'
import { Team, TeamId } from '../entities/teams/entities.teams'
import { User, UserId, UserRepository, UserRepositoryError } from '../entities/users/entities.users'
import { createEnrollmentCandidateUser, IdentityProvider, IdentityProviderUser, UserIngressBindingRepository, UserIngressBindings } from './ingress.entities'
import { ProcessNewUserEnrollment } from './ingress.services.api'

export interface AssignTeamMember {
  (member: UserId, team: TeamId): Promise<boolean>
}

export interface FindEventTeam {
  (mageEventId: MageEventId): Promise<Team | null>
}

export function CreateProcessNewUserEnrollmentService(userRepo: UserRepository, ingressBindingRepo: UserIngressBindingRepository, findEventTeam: FindEventTeam, assignTeamMember: AssignTeamMember): ProcessNewUserEnrollment {
  return async function processNewUserEnrollment(idpAccount: IdentityProviderUser, idp: IdentityProvider): Promise<{ mageAccount: User, ingressBindings: UserIngressBindings }> {
    console.info(`enrolling new user account ${idpAccount.username} from identity provider ${idp.name}`)
    const candidate = createEnrollmentCandidateUser(idpAccount, idp)
    const mageAccount = await userRepo.create(candidate)
    if (mageAccount instanceof UserRepositoryError) {
      throw mageAccount
    }
    const ingressBindings = await ingressBindingRepo.saveUserIngressBinding(
      mageAccount.id,
      {
        userId: mageAccount.id,
        idpId: idp.id,
        idpAccountId: idpAccount.username,
        idpAccountAttrs: {},
        // TODO: these do not have functionality yet
        verified: true,
        enabled: true,
      }
    )
    if (ingressBindings instanceof Error) {
      throw ingressBindings
    }
    const { assignToTeams, assignToEvents } = idp.userEnrollmentPolicy
    const assignEnrolledToTeam = (teamId: TeamId): Promise<{ teamId: TeamId, assigned: boolean }> => {
      return assignTeamMember(mageAccount.id, teamId)
        .then(assigned => ({ teamId, assigned }))
        .catch(err => {
          console.error(`error assigning enrolled user ${mageAccount.username} to team ${teamId}`, err)
          return { teamId, assigned: false }
        })
    }
    const assignEnrolledToEventTeam = (eventId: MageEventId): Promise<{ eventId: MageEventId, teamId: TeamId | null, assigned: boolean }> => {
      return findEventTeam(eventId)
        .then<{ eventId: MageEventId, teamId: TeamId | null, assigned: boolean }>(eventTeam => {
          if (eventTeam) {
            return assignEnrolledToTeam(eventTeam.id).then(teamAssignment => ({ eventId, ...teamAssignment }))
          }
          console.error(`failed to find implicit team for event ${eventId} while enrolling user ${mageAccount.username}`)
          return { eventId, teamId: null, assigned: false }
        })
        .catch(err => {
          console.error(`error looking up implicit team for event ${eventId} while enrolling user ${mageAccount.username}`, err)
          return { eventId, teamId: null, assigned: false }
        })
    }
    await Promise.all([ ...assignToTeams.map(assignEnrolledToTeam), ...assignToEvents.map(assignEnrolledToEventTeam) ])
    return { mageAccount, ingressBindings }
  }
}