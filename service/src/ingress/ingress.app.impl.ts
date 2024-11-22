import { entityNotFound, infrastructureError } from '../app.api/app.api.errors'
import { AppResponse } from '../app.api/app.api.global'
import { AdmitFromIdentityProviderOperation, AdmitFromIdentityProviderRequest, authenticationFailedError, EnrollMyselfOperation, EnrollMyselfRequest } from './ingress.app.api'
import { IdentityProviderRepository, IdentityProviderUser } from './ingress.entities'
import { AdmissionDeniedReason, AdmitUserFromIdentityProviderAccount, EnrollNewUser } from './ingress.services.api'
import { LocalIdpCreateAccountOperation } from './local-idp.app.api'
import { JWTService, TokenAssertion } from './verification'


export function CreateEnrollMyselfOperation(createLocalIdpAccount: LocalIdpCreateAccountOperation, idpRepo: IdentityProviderRepository, enrollNewUser: EnrollNewUser): EnrollMyselfOperation {
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

export function CreateAdmitFromIdentityProviderOperation(idpRepo: IdentityProviderRepository, admitFromIdpAccount: AdmitUserFromIdentityProviderAccount, tokenService: JWTService): AdmitFromIdentityProviderOperation {
  return async function admitFromIdentityProvider(req: AdmitFromIdentityProviderRequest): ReturnType<AdmitFromIdentityProviderOperation> {
    const idp = await idpRepo.findIdpByName(req.identityProviderName)
    if (!idp) {
      return AppResponse.error(entityNotFound(req.identityProviderName, 'IdentityProvider', `identity provider not found: ${req.identityProviderName}`))
    }
    const idpAccount = req.identityProviderUser
    console.info(`admitting user ${idpAccount.username} from identity provider ${idp.name}`)
    const admission = await admitFromIdpAccount(idpAccount, idp)
    if (admission.action === 'denied') {
      if (admission.mageAccount) {
        if (admission.reason === AdmissionDeniedReason.PendingApproval) {
          return AppResponse.error(authenticationFailedError(admission.mageAccount.username, idp.name, 'Your account requires approval from a Mage administrator.'))
        }
        if (admission.reason === AdmissionDeniedReason.Disabled) {
          return AppResponse.error(authenticationFailedError(admission.mageAccount.username, idp.name, 'Your account is disabled.'))
        }
      }
      return AppResponse.error(authenticationFailedError(idpAccount.username, idp.name))
    }
    try {
      const admissionToken = await tokenService.generateToken(admission.mageAccount.id, TokenAssertion.Authenticated, 5 * 60)
      return AppResponse.success({ mageAccount: admission.mageAccount, admissionToken })
    }
    catch (err) {
      console.error(`error generating admission token while authenticating user ${admission.mageAccount.username}`, err)
      return AppResponse.error(infrastructureError('An unexpected error occurred while generating an authentication token.'))
    }
  }
}
