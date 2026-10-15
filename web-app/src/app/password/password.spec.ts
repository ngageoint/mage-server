import { FormControl } from '@angular/forms';
import * as zxcvbnModule from '@zxcvbn-ts/core';
import {
  confirmPasswordValidator,
  evaluatePasswordStrength
} from './password';
import { passwordStrengthScores } from 'mage-web-app/entities/password/password';

describe('Password Utilities', () => {
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
});
