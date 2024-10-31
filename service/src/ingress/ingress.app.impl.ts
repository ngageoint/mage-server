import { entityNotFound, infrastructureError } from '../app.api/app.api.errors'
import { AppResponse } from '../app.api/app.api.global'
import { UserRepository } from '../entities/users/entities.users'
import { AdmitFromIdentityProviderOperation, AdmitFromIdentityProviderRequest, authenticationFailedError, EnrollMyselfOperation, EnrollMyselfRequest } from './ingress.app.api'
import { IdentityProviderRepository, IdentityProviderUser, UserIngressBindingRepository } from './ingress.entities'
import { ProcessNewUserEnrollment } from './ingress.services.api'
import { LocalIdpCreateAccountOperation } from './local-idp.app.api'
import { JWTService, TokenAssertion } from './verification'


export function CreateEnrollMyselfOperation(createLocalIdpAccount: LocalIdpCreateAccountOperation, idpRepo: IdentityProviderRepository, enrollNewUser: ProcessNewUserEnrollment): EnrollMyselfOperation {
  return async function enrollMyself(req: EnrollMyselfRequest): ReturnType<EnrollMyselfOperation> {
    const localAccountCreate = await createLocalIdpAccount(req)
    if (localAccountCreate.error) {
      return AppResponse.error(localAccountCreate.error)
    }
    const localAccount = localAccountCreate.success!
    const candidateMageAccount: IdentityProviderUser = {
      username: localAccount.username,
      displayName: req.displayName,
      phones: [],
    }
    if (req.email) {
      candidateMageAccount.email = req.email
    }
    if (req.phone) {
      candidateMageAccount.phones = [ { number: req.phone, type: 'Main' } ]
    }
    const localIdp = await idpRepo.findIdpByName('local')
    if (!localIdp) {
      throw new Error('local idp not found')
    }
    const enrollmentResult = await enrollNewUser(candidateMageAccount, localIdp)

    // TODO: auto-activate account after enrollment policy
    throw new Error('unimplemented')
  }
}

export function CreateAdmitFromIdentityProviderOperation(idpRepo: IdentityProviderRepository, ingressBindingRepo: UserIngressBindingRepository, userRepo: UserRepository, enrollNewUser: ProcessNewUserEnrollment, tokenService: JWTService): AdmitFromIdentityProviderOperation {
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
        return enrollNewUser(idpAccount, idp)
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
