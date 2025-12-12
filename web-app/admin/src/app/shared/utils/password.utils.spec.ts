import { FormControl } from '@angular/forms';
import * as zxcvbnModule from '@zxcvbn-ts/core';
import {
  createPasswordPolicyValidator,
  confirmPasswordValidator,
  evaluatePasswordStrength,
  getPasswordTooltip
} from './password.utils';
import { passwordStrengthScores } from 'src/app/entities/entities.password';

describe('Password Utilities', () => {
  const basePolicy = {
    passwordMinLengthEnabled: true,
    passwordMinLength: 8,
    minCharsEnabled: false,
    minChars: 0,
    lowLettersEnabled: true,
    lowLetters: 1,
    highLettersEnabled: true,
    highLetters: 1,
    numbersEnabled: true,
    numbers: 1,
    specialCharsEnabled: true,
    specialChars: 1,
    maxConCharsEnabled: true,
    maxConChars: 3,
    restrictSpecialCharsEnabled: true,
    restrictSpecialChars: '!@#',
    helpTextTemplate: {
      passwordMinLength: 'be at least # characters long',
      minChars: 'contain at least # letters',
      lowLetters: 'have at least # lowercase letter(s)',
      highLetters: 'have at least # uppercase letter(s)',
      numbers: 'contain at least # number(s)',
      specialChars: 'contain at least # special character(s)',
      maxConChars: 'have no more than # consecutive characters',
      restrictSpecialChars: 'use only these special characters: #'
    }
  };

  const makePolicy = (override: Partial<typeof basePolicy> = {}) => ({
    ...basePolicy,
    ...override
  });

  describe('createPasswordPolicyValidator', () => {
    it('returns null when password is empty', () => {
      const control = new FormControl('');
      const validator = createPasswordPolicyValidator(makePolicy(), () => {});
      expect(validator(control as any)).toBeNull();
    });

    it('flags password shorter than minimum length', () => {
      const control = new FormControl('Short1!');
      const validator = createPasswordPolicyValidator(makePolicy({ maxConCharsEnabled: false }), () => {});
      expect(validator(control as any)).toEqual({ passwordMinLength: true });
    });

    it('flags password missing lowercase characters', () => {
      const control = new FormControl('PASSWORD123!');
      const validator = createPasswordPolicyValidator(
        makePolicy({ maxConCharsEnabled: false }),
        () => {}
      );
      expect(validator(control as any)).toEqual({ lowLetters: true });
    });

    it('flags password missing uppercase characters', () => {
      const control = new FormControl('password123!');
      const validator = createPasswordPolicyValidator(
        makePolicy({ maxConCharsEnabled: false }),
        () => {}
      );
      expect(validator(control as any)).toEqual({ highLetters: true });
    });

    it('flags password missing numeric characters', () => {
      const control = new FormControl('Password!x');
      const validator = createPasswordPolicyValidator(
        makePolicy({ maxConCharsEnabled: false }),
        () => {}
      );
      expect(validator(control as any)).toEqual({ numbers: true });
    });

    it('flags password missing special characters', () => {
      const control = new FormControl('Password12x');
      const validator = createPasswordPolicyValidator(
        makePolicy({ maxConCharsEnabled: false }),
        () => {}
      );
      expect(validator(control as any)).toEqual({ specialChars: true });
    });

    it('flags password exceeding maximum consecutive letter limit', () => {
      const control = new FormControl('AAAAA1x!');
      const validator = createPasswordPolicyValidator(makePolicy(), () => {});
      expect(validator(control as any)).toEqual({ maxConChars: true });
    });

    it('flags password containing disallowed special characters', () => {
      const control = new FormControl('Abcde1$fg!');
      const validator = createPasswordPolicyValidator(
        makePolicy({ maxConCharsEnabled: false }),
        () => {}
      );
      expect(validator(control as any)).toEqual({ restrictSpecialChars: true });
    });

    it('returns null when all enabled requirements are satisfied', () => {
      const control = new FormControl('Abc1!xyz');
      const validator = createPasswordPolicyValidator(
        makePolicy({ maxConCharsEnabled: false }),
        () => {}
      );
      expect(validator(control as any)).toBeNull();
    });

    it('flags password below minimum letter count when enabled', () => {
      const policy = makePolicy({
        minCharsEnabled: true,
        minChars: 6,
        maxConCharsEnabled: false
      });
      const control = new FormControl('A1!abcx12');
      const validator = createPasswordPolicyValidator(policy, () => {});
      expect(validator(control as any)).toEqual({ minChars: true });
    });

    it('aggregates multiple errors when multiple checks fail', () => {
      const control = new FormControl('shortxx');
      const validator = createPasswordPolicyValidator(
        makePolicy({ maxConCharsEnabled: false }),
        () => {}
      );
      expect(validator(control as any)).toEqual({
        passwordMinLength: true,
        highLetters: true,
        numbers: true,
        specialChars: true
      });
    });

    it('provides human-readable error messages', () => {
      const messages: string[] = [];
      const control = new FormControl('pass');
      const validator = createPasswordPolicyValidator(
        makePolicy({ maxConCharsEnabled: false }),
        (errs) => {
          messages.splice(0, messages.length, ...errs);
        }
      );
      validator(control as any);
      expect(
        messages.some((m) => m.toLowerCase().includes('characters long'))
      ).toBeTrue();
      expect(
        messages.some((m) => m.toLowerCase().includes('uppercase'))
      ).toBeTrue();
      expect(
        messages.some((m) => m.toLowerCase().includes('number'))
      ).toBeTrue();
      expect(
        messages.some((m) => m.toLowerCase().includes('special character'))
      ).toBeTrue();
    });

    it('returns null when optional fields are absent and remaining rules pass', () => {
      const { minCharsEnabled, minChars, helpTextTemplate, ...rest } =
        basePolicy as any;
      const slimPolicy: any = {
        ...rest,
        helpTextTemplate: { ...basePolicy.helpTextTemplate },
        maxConCharsEnabled: false
      };
      const control = new FormControl('Abc1!xyz');
      const validator = createPasswordPolicyValidator(slimPolicy, () => {});
      expect(validator(control as any)).toBeNull();
    });
  });

  describe('confirmPasswordValidator', () => {
    it('returns an error when values do not match', () => {
      const getPassword = () => 'ValidPassword123!';
      const control = new FormControl('DifferentPassword123!');
      const validator = confirmPasswordValidator(getPassword);
      expect(validator(control as any)).toEqual({ match: true });
    });

    it('returns null when values match', () => {
      const getPassword = () => 'ValidPassword123!';
      const control = new FormControl('ValidPassword123!');
      const validator = confirmPasswordValidator(getPassword);
      expect(validator(control as any)).toBeNull();
    });
  });

  describe('evaluatePasswordStrength', () => {
    it('returns the lowest score for an empty password', () => {
      const result = evaluatePasswordStrength('');
      expect(result).toEqual(passwordStrengthScores[0]);
    });

    it('maps zxcvbn score to the corresponding strength', () => {
      const pwd = 'Str0ng!P@ssw0rd';
      const expected =
        passwordStrengthScores[zxcvbnModule.zxcvbn(pwd, []).score];
      const result = evaluatePasswordStrength(pwd);
      expect(result).toEqual(expected);
    });

    it('includes username in the zxcvbn evaluation', () => {
      const pwd = 'something';
      const user = 'user1';
      const expected =
        passwordStrengthScores[zxcvbnModule.zxcvbn(pwd, [user]).score];
      const result = evaluatePasswordStrength(pwd, user);
      expect(result).toEqual(expected);
    });
  });

  describe('getPasswordTooltip', () => {
    it('includes all enabled policy lines', () => {
      const tooltip = getPasswordTooltip(makePolicy());
      expect(tooltip).toContain('• At least 8 characters');
      expect(tooltip).toContain('• Minimum 1 lowercase letter(s)');
      expect(tooltip).toContain('• Minimum 1 uppercase letter(s)');
      expect(tooltip).toContain('• Minimum 1 number(s)');
      expect(tooltip).toContain('• Minimum 1 special character(s)');
      expect(tooltip).toContain('• Max 3 repeated characters');
      expect(tooltip).toContain('• Allowed: !@#');
    });

    it('excludes disabled rules', () => {
      const tooltip = getPasswordTooltip(
        makePolicy({ minCharsEnabled: false })
      );
      expect(tooltip).not.toContain('letters');
    });

    it('includes minimum letters requirement when enabled', () => {
      const tooltip = getPasswordTooltip(
        makePolicy({ minCharsEnabled: true, minChars: 5 })
      );
      expect(tooltip).toContain('• At least 5 letters');
    });
  });
});
