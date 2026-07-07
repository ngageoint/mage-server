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
    color: '#FF9800',
      text: 'Fair',
        value: '25'
  },
  2: {
    color: '#FFEB3B',
      text: 'Good',
        value: '50'
  },
  3: {
    color: '#8BC34A',
      text: 'Strong',
        value: '75'
  },
  4: {
    color: '#4CAF50',
      text: 'Excellent',
        value: '100'
  }
}