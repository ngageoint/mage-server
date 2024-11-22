import { MageEventId } from '../entities/events/entities.events'
import { Team, TeamId } from '../entities/teams/entities.teams'
import { UserExpanded, UserId, UserRepository, UserRepositoryError } from '../entities/users/entities.users'
import { createEnrollmentCandidateUser, IdentityProvider, IdentityProviderUser, UserIngressBindingsRepository, UserIngressBindings, determinUserIngressBindingAdmission } from './ingress.entities'
import { AdmissionDeniedReason, AdmissionResult, AdmitUserFromIdentityProviderAccount, EnrollNewUser } from './ingress.services.api'

export interface AssignTeamMember {
  (member: UserId, team: TeamId): Promise<boolean>
}

export interface FindEventTeam {
  (mageEventId: MageEventId): Promise<Team | null>
}

export function CreateUserAdmissionService(userRepo: UserRepository, ingressBindingRepo: UserIngressBindingsRepository, enrollNewUser: EnrollNewUser): AdmitUserFromIdentityProviderAccount {
  return async function(idpAccount: IdentityProviderUser, idp: IdentityProvider): Promise<AdmissionResult> {
    return userRepo.findByUsername(idpAccount.username)
      .then(existingAccount => {
        if (existingAccount) {
          return ingressBindingRepo.readBindingsForUser(existingAccount.id).then(ingressBindings => {
            return { enrolled: false, mageAccount: existingAccount, ingressBindings }
          })
        }
        console.info(`enrolling new user account ${idpAccount.username} from identity provider ${idp.name}`)
        return enrollNewUser(idpAccount, idp).then(enrollment => ({ enrolled: true, ...enrollment }))
      })
      .then<AdmissionResult>(userIngress => {
        const { enrolled, mageAccount, ingressBindings } = userIngress
        const idpAdmission = determinUserIngressBindingAdmission(idpAccount, idp, ingressBindings)
        if (idpAdmission.deny) {
          console.error(`user ${mageAccount.username} has no ingress binding to identity provider ${idp.name}`)
          return { action: 'denied', reason: AdmissionDeniedReason.NameConflict, enrolled, mageAccount }
        }
        if (idpAdmission.admitNew) {
          return ingressBindingRepo.saveUserIngressBinding(mageAccount.id, idpAdmission.admitNew)
            .then<AdmissionResult>(() => ({ action: 'admitted', mageAccount, enrolled }))
            .catch(err => {
              console.error(`error saving ingress binding for user ${mageAccount.username} to idp ${idp.name}`, err)
              return { action: 'denied', reason: AdmissionDeniedReason.InternalError, mageAccount, enrolled }
            })
        }
        return { action: 'admitted', mageAccount, enrolled }
      })
      .then<AdmissionResult>(userIngress => {
        const { action, mageAccount, enrolled } = userIngress
        if (!mageAccount) {
          return { action: 'denied', reason: AdmissionDeniedReason.InternalError, mageAccount, enrolled }
        }
        if (action === 'denied') {
          return userIngress
        }
        if (!mageAccount.active) {
          return { action: 'denied', reason: AdmissionDeniedReason.PendingApproval, mageAccount, enrolled }
        }
        if (!mageAccount.enabled) {
          return { action: 'denied', reason: AdmissionDeniedReason.Disabled, mageAccount, enrolled }
        }
        return userIngress
      })
      .catch<AdmissionResult>(err => {
        console.error(`error admitting user account ${idpAccount.username} from identity provider ${idp.name}`, err)
        return { action: 'denied', reason: AdmissionDeniedReason.InternalError, enrolled: false, mageAccount: null }
      })
  }
}

export function CreateNewUserEnrollmentService(userRepo: UserRepository, ingressBindingRepo: UserIngressBindingsRepository, findEventTeam: FindEventTeam, assignTeamMember: AssignTeamMember): EnrollNewUser {
  return async function processNewUserEnrollment(idpAccount: IdentityProviderUser, idp: IdentityProvider): Promise<{ mageAccount: UserExpanded, ingressBindings: UserIngressBindings }> {
    console.info(`enrolling new user account ${idpAccount.username} from identity provider ${idp.name}`)
    const candidate = createEnrollmentCandidateUser(idpAccount, idp)
    const mageAccount = await userRepo.create(candidate)
    if (mageAccount instanceof UserRepositoryError) {
      throw mageAccount
    }
    const now = new Date()
    const ingressBindings = await ingressBindingRepo.saveUserIngressBinding(
      mageAccount.id,
      {
        idpId: idp.id,
        idpAccountId: idpAccount.username,
        created: now,
        updated: now,
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