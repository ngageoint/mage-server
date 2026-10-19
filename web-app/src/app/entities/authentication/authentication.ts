import { User } from "@ngageoint/mage.web-core-lib/user";

export type IdpSigninResult =
  | { status: 'authenticated'; user: User; token: string }
  | { status: 'unauthorized'; user: User }
  | { status: 'failed' }
  | { status: 'popupBlocked' };
