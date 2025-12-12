import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PasswordPolicy } from 'src/app/ingress/authentication/@types/signup';
import { zxcvbn } from '@zxcvbn-ts/core';
import {
  PasswordStrength,
  passwordStrengthScores
} from 'src/app/entities/entities.password';

/**
 * Creates a password policy validator based on the provided policy.
 * Validates password according to the rules defined in the policy and updates error messages.
 * 
 * @param {PasswordPolicy} policy - The password policy that defines the validation rules.
 * @param {Function} updateErrors - A callback function to update the list of error messages.
 * @param {string} [username] - An optional username to check against (used by zxcvbn for password strength evaluation).
 * @returns {ValidatorFn} A validator function for validating the password control.
 */
export function createPasswordPolicyValidator(
  policy: PasswordPolicy,
  updateErrors: (errors: string[]) => void,
  username?: string
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;
    if (!password) return null;

    const templates = policy.helpTextTemplate;
    const currentErrors: string[] = [];
    const errors: ValidationErrors = {};

    const rules = [
      {
        enabled: policy.passwordMinLengthEnabled,
        valid: password.length >= policy.passwordMinLength,
        key: 'passwordMinLength',
        template: templates.passwordMinLength,
        value: policy.passwordMinLength
      },
      {
        enabled: policy.lowLettersEnabled,
        valid: (password.match(/[a-z]/g) || []).length >= policy.lowLetters,
        key: 'lowLetters',
        template: templates.lowLetters,
        value: policy.lowLetters
      },
      {
        enabled: policy.minCharsEnabled,
        valid: (password.match(/[a-z]/gi) || []).length >= policy.minChars,
        key: 'minChars',
        template: templates.minChars,
        value: policy.minChars
      },
      {
        enabled: policy.highLettersEnabled,
        valid: (password.match(/[A-Z]/g) || []).length >= policy.highLetters,
        key: 'highLetters',
        template: templates.highLetters,
        value: policy.highLetters
      },
      {
        enabled: policy.numbersEnabled,
        valid: (password.match(/[0-9]/g) || []).length >= policy.numbers,
        key: 'numbers',
        template: templates.numbers,
        value: policy.numbers
      },
      {
        enabled: policy.specialCharsEnabled,
        valid: (password.match(/[^a-zA-Z0-9]/g) || []).length >= policy.specialChars,
        key: 'specialChars',
        template: templates.specialChars,
        value: policy.specialChars
      }
    ];

    for (const rule of rules) {
      if (rule.enabled && !rule.valid) {
        errors[rule.key] = true;
        currentErrors.push(`Must ${rule.template?.replace('#', rule.value.toString())}`);
      }
    }

    if (policy.maxConCharsEnabled) {
      const regex = new RegExp(`[a-zA-Z]{${policy.maxConChars + 1},}`);
      if (regex.test(password)) {
        errors.maxConChars = true;
        currentErrors.push(`Must ${templates.maxConChars?.replace('#', policy.maxConChars.toString())}`);
      }
    }

    if (policy.restrictSpecialCharsEnabled) {
      const allowed = policy.restrictSpecialChars.split('');
      const specials = password.match(/[^a-zA-Z0-9]/g) || [];
      if (specials.some((char) => !allowed.includes(char))) {
        errors.restrictSpecialChars = true;
        currentErrors.push(`Must ${templates.restrictSpecialChars?.replace('#', policy.restrictSpecialChars)}`);
      }
    }

    updateErrors(currentErrors);
    return Object.keys(errors).length ? errors : null;
  };
}

/**
 * Validates if the confirmed password matches the original password.
 * 
 * @param {Function} getPassword - A function to retrieve the original password value.
 * @returns {ValidatorFn} A validator function to confirm the password match.
 */
export function confirmPasswordValidator(getPassword: () => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return control.value !== getPassword() ? { match: true } : null;
  };
}

/**
 * Evaluates the strength of the provided password using the zxcvbn library.
 * 
 * @param {string} password - The password to evaluate.
 * @param {string} [username] - An optional username to be considered during evaluation.
 * @returns {PasswordStrength} The evaluated password strength.
 */
export function evaluatePasswordStrength(password: string, username?: string): PasswordStrength {
  const score = password ? zxcvbn(password, username ? [username] : []).score : 0;
  return passwordStrengthScores[score];
}

/**
 * Generates a tooltip string based on the password policy, outlining the required password strength rules.
 * 
 * @param {PasswordPolicy} policy - The password policy to base the tooltip on.
 * @returns {string} The generated tooltip text.
 */
export function getPasswordTooltip(policy: PasswordPolicy): string {
  const rules: string[] = [];

  if (policy.passwordMinLengthEnabled) {
    rules.push(`• At least ${policy.passwordMinLength} characters`);
  }
  if (policy.minCharsEnabled) {
    rules.push(`• At least ${policy.minChars} letters`);
  }
  if (policy.lowLettersEnabled) {
    rules.push(`• Minimum ${policy.lowLetters} lowercase letter(s)`);
  }
  if (policy.highLettersEnabled) {
    rules.push(`• Minimum ${policy.highLetters} uppercase letter(s)`);
  }
  if (policy.numbersEnabled) {
    rules.push(`• Minimum ${policy.numbers} number(s)`);
  }
  if (policy.specialCharsEnabled) {
    rules.push(`• Minimum ${policy.specialChars} special character(s)`);
  }
  if (policy.maxConCharsEnabled) {
    rules.push(`• Max ${policy.maxConChars} repeated characters`);
  }
  if (policy.restrictSpecialCharsEnabled) {
    rules.push(`• Allowed: ${policy.restrictSpecialChars}`);
  }

  return rules.join('\n');
}
