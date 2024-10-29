import { entityNotFound, infrastructureError } from '../app.api/app.api.errors'
import { AppResponse } from '../app.api/app.api.global'
import { MageEventId } from '../entities/events/entities.events'
import { Team, TeamId } from '../entities/teams/entities.teams'
import { User, UserId, UserRepository, UserRepositoryError } from '../entities/users/entities.users'
import { AdmitFromIdentityProviderOperation, AdmitFromIdentityProviderRequest, authenticationFailedError, EnrollMyselfOperation, EnrollMyselfRequest } from './ingress.app.api'
import { createEnrollmentCandidateUser, IdentityProvider, IdentityProviderRepository, IdentityProviderUser, UserIngressBindingRepository, UserIngressBindings } from './ingress.entities'
import { LocalIdpCreateAccountOperation } from './local-idp.app.api'
import { JWTService, TokenAssertion } from './verification'


export function CreateEnrollMyselfOperation(createLocalIdpAccount: LocalIdpCreateAccountOperation, idpRepo: IdentityProviderRepository, userRepo: UserRepository): EnrollMyselfOperation {
  return async function enrollMyself(req: EnrollMyselfRequest): ReturnType<EnrollMyselfOperation> {
    const localAccountCreate = await createLocalIdpAccount(req)
    if (localAccountCreate.error) {
      return AppResponse.error(localAccountCreate.error)
    }
    const localAccount = localAccountCreate.success!
    const candidateMageAccount: Partial<User> = {
      username: localAccount.username,
      displayName: req.displayName,
    }
    if (req.email) {
      candidateMageAccount.email = req.email
    }
    if (req.phone) {
      candidateMageAccount.phones = [ { number: req.phone, type: 'Main' } ]
    }
    const localIdp = await idpRepo.findIdpByName('local')
    // TODO: auto-activate account after enrollment policy
    throw new Error('unimplemented')
  }
}

export interface AssignTeamMember {
  (member: UserId, team: TeamId): Promise<boolean>
}

export interface FindEventTeam {
  (mageEventId: MageEventId): Promise<Team | null>
}

async function enrollNewUser(idpAccount: IdentityProviderUser, idp: IdentityProvider, userRepo: UserRepository, ingressBindingRepo: UserIngressBindingRepository, findEventTeam: FindEventTeam, assignTeamMember: AssignTeamMember): Promise<{ mageAccount: User, ingressBindings: UserIngressBindings }> {
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

export function CreateAdmitFromIdentityProviderOperation(idpRepo: IdentityProviderRepository, ingressBindingRepo: UserIngressBindingRepository, userRepo: UserRepository, findEventTeam: FindEventTeam, assignTeamMember: AssignTeamMember, tokenService: JWTService): AdmitFromIdentityProviderOperation {
  return async function admitFromIdentityProvider(req: AdmitFromIdentityProviderRequest): ReturnType<AdmitFromIdentityProviderOperation> {
    const idp = await idpRepo.findIdpByName(req.identityProviderName)
    if (!idp) {
      return AppResponse.error(entityNotFound(req.identityProviderName, 'IdentityProvider', `identity provider not found: ${req.identityProviderName}`))
    }
    const idpAccount = req.identityProviderUser
    console.info(`admitting user ${idpAccount.username} from identity provider ${idp.name}`)
    const mageAccount = await userRepo.findByUsername(idpAccount.username)
      .then(existingAccount => {
        if (existingAccount) {
          return ingressBindingRepo.readBindingsForUser(existingAccount.id).then(ingressBindings => {
            return { mageAccount: existingAccount, ingressBindings }
          })
        }
        return enrollNewUser(idpAccount, idp, userRepo, ingressBindingRepo, findEventTeam, assignTeamMember)
      })
      .then(enrolled => {
        const { mageAccount, ingressBindings } = enrolled
        if (ingressBindings.has(idp.id)) {
          return mageAccount
        }
        console.error(`user ${mageAccount.username} has no ingress binding to identity provider ${idp.name}`)
        return null
      })
      .catch(err => {
        console.error(`error creating user account ${idpAccount.username} from identity provider ${idp.name}`, err)
        return null
      })
    if (!mageAccount) {
      return AppResponse.error(authenticationFailedError(idpAccount.username, idp.name))
    }
    if (!mageAccount.active) {
      return AppResponse.error(authenticationFailedError(mageAccount.username, idp.name, 'Your account requires approval from a Mage administrator.'))
    }
    if (!mageAccount.enabled) {
      return AppResponse.error(authenticationFailedError(mageAccount.username, idp.name, 'Your account is disabled.'))
    }
    try {
      const admissionToken = await tokenService.generateToken(mageAccount.id, TokenAssertion.Authenticated, 5 * 60)
      return AppResponse.success({ mageAccount, admissionToken })
    }
    catch (err) {
      console.error(`error generating admission token while authenticating user ${mageAccount.username}`, err)
      return AppResponse.error(infrastructureError('An unexpected error occurred while generating an authentication token.'))
    }
  }
}
