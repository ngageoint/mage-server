import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { zxcvbn } from '@zxcvbn-ts/core';
import {
  PasswordStrength,
  passwordStrengthScores
} from 'src/app/entities/password/password';

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
