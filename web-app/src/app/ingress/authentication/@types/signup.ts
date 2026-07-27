import { User } from "@ngageoint/mage.web-core-lib/user";

export interface SignupEvent {
    reason: 'signup' | 'cancel';
    user?: User;
  }
