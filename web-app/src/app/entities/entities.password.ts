export interface PasswordStrength {
  color: string,
  text: string,
  value: string
}

export const passwordStrengthScores: { [key: number]: PasswordStrength } = {
  0: {
    color: '#F44336',
      text: 'Weak',
        value: '0'
  },
  1: {
    color: '#F44336',
      text: 'Fair',
        value: '25'
  },
  2: {
    color: '#F44336',
      text: 'Good',
        value: '50'
  },
  3: {
    color: '#F44336',
      text: 'Strong',
        value: '75'
  },
  4: {
    color: '#F44336',
      text: 'Excellent',
        value: '100'
  }
}