import { MageEventId } from '../entities/events/entities.events'
import { Team, TeamId } from '../entities/teams/entities.teams'
import { UserAccountSeed, UserId, UserRepository } from '../entities/users/entities.users'
import {
  AuthenticationBindingRepository,
  createEnrollmentCandidateUser,
  IdentityProvider,
  IdentityProviderAccount
} from './ingress.entities'
import { EnrollmentResult, EnrollmentService } from './ingress.services.api'

export interface AssignTeamMember {
  (member: UserId, team: TeamId): Promise<boolean>
}

export interface FindEventTeam {
  (mageEventId: MageEventId): Promise<Team | null>
}

export function createEnrollmentService(userRepo: UserRepository, authBindingRepo: AuthenticationBindingRepository, findEventTeam: FindEventTeam, assignTeamMember: AssignTeamMember): EnrollmentService {
  return async function processNewUserEnrollment(idpAccount: IdentityProviderAccount, idp: IdentityProvider): Promise<EnrollmentResult> {
    console.info(`enrolling new user account ${idpAccount.username} from identity provider ${idp.name}`)
    const candidate = createEnrollmentCandidateUser(idpAccount, idp)
    const seed = UserAccountSeed.prepare(candidate)
    const created = await userRepo.createUser(seed)
    if (created.error) {
      // TODO: handle with return error
      return { error: created.error, enrolled: false }
    }
    const mageAccount = created.user
    const now = new Date()
    const authBinding = await authBindingRepo.saveBindingIdentity(
      mageAccount.id,
      {
        idpId: idp.id,
        idpAccountId: idpAccount.idpAccountId || idpAccount.username,
        created: now,
        updated: now,
      }
    )
    if (authBinding instanceof Error) {
      return { error: authBinding, enrolled: false }
    }
    const { assignToTeams, assignToEvents } = idp.userEnrollmentPolicy
    const assignEnrolledToTeam = (teamId: TeamId): Promise<{ teamId: TeamId, assigned: boolean }> => {
      return assignTeamMember(mageAccount.id, teamId)
        .then(assigned => ({ teamId, assigned }))
        .catch(err => {
          console.error(`error assigning enrolled user ${mageAccount.username} to team ${teamId}`, err)
          return { teamId, assigned: false, err }
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
          return { eventId, teamId: null, assigned: false, err }
        })
    }
    await Promise.all([ ...assignToTeams.map(assignEnrolledToTeam), ...assignToEvents.map(assignEnrolledToEventTeam) ])
    return {
      enrolled: { mageAccount, authBinding },
      error: false
    }
  }
}
