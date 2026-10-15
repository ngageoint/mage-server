export interface PasswordStrength {
  color: string,
  text: string,
  value: string
}

export const passwordStrengthScores: { [key: number]: PasswordStrength } = {
  0: {
    color: '#F44336',
      text: 'Weak',
        value: '20'
  },
  1: {
    color: '#FF9800',
      text: 'Fair',
        value: '40'
  },
  2: {
    color: '#2196F3',
      text: 'Good',
        value: '60'
  },
  3: {
    color: '#009688',
      text: 'Strong',
        value: '80'
  },
  4: {
    color: '#4CAF50',
      text: 'Excellent',
        value: '100'
  }
}