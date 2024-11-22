import { UserExpanded } from '../entities/users/entities.users'
import { IdentityProvider, IdentityProviderUser, UserIngressBindings } from './ingress.entities'

export type AdmissionResult =
  | {
    /**
     * `'admitted'` if the user account is valid for admission and access to Mage, `'denied'` otherwise
     */
    action: 'admitted',
    /**
     * The existing or newly enrolled Mage account
     */
    mageAccount: UserExpanded,
    /**
     * Whether the admission resulted in a new Mage account enrollment
     */
    enrolled: boolean,
  }
  | {
    action: 'denied',
    reason: AdmissionDeniedReason,
    mageAccount: UserExpanded | null,
    enrolled: boolean,
  }

export enum AdmissionDeniedReason {
  PendingApproval = 'PendingApproval',
  Disabled = 'Disabled',
  NameConflict = 'NameConflict',
  InternalError = 'InternalError',
}

export interface AdmitUserFromIdentityProviderAccount {
  (idpAccount: IdentityProviderUser, idp: IdentityProvider): Promise<AdmissionResult>
}

export interface EnrollNewUser {
  (idpAccount: IdentityProviderUser, idp: IdentityProvider): Promise<{ mageAccount: UserExpanded, ingressBindings: UserIngressBindings }>
}