import { User } from "@ngageoint/mage.web-core-lib/user";

export interface PasswordHelpTextTemplate {
    passwordMinLength?: string;
    lowLetters?: string;
    highLetters?: string;
    numbers?: string;
    specialChars?: string;
    maxConChars?: string;
    restrictSpecialChars?: string;
    minChars?: string;
  }

export interface PasswordPolicy {
    passwordMinLengthEnabled: boolean;
    passwordMinLength: number;

    minCharsEnabled: boolean;
    minChars: number;
  
    lowLettersEnabled: boolean;
    lowLetters: number;
  
    highLettersEnabled: boolean;
    highLetters: number;
  
    numbersEnabled: boolean;
    numbers: number;
  
    specialCharsEnabled: boolean;
    specialChars: number;
  
    maxConCharsEnabled: boolean;
    maxConChars: number;
  
    restrictSpecialCharsEnabled: boolean;
    restrictSpecialChars: string;

    helpTextTemplate?: PasswordHelpTextTemplate;
  }

export interface SignupEvent {
    reason: 'signup' | 'cancel';
    user?: User;
  }