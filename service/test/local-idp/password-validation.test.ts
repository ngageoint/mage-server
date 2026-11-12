import { expect } from 'chai'
import { validatePasswordRequirements } from '../../lib/local-idp/password-requirements'
import { defaultHashUtil } from '../../lib/local-idp/password-hashing'
import { PasswordRequirements } from '../../lib/local-idp/password-requirements'
import { serializeHashedPassword } from '../../lib/local-idp/password-hashing'


describe.only('password requirements validation', function () {

  it('fails null password', async function () {
    const validation = await validatePasswordRequirements(null as any, {}, [])
    expect(validation.valid).to.be.false
  })

  it('passes minimum password length', async function () {
    const policy: PasswordRequirements = { passwordMinLength: 3, passwordMinLengthEnabled: true }
    const validationStatus = await validatePasswordRequirements('123', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('fails minimum password length', async function () {
    const policy: PasswordRequirements = { passwordMinLength: 3, passwordMinLengthEnabled: true }
    const validationStatus = await validatePasswordRequirements('12', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('ignores minimum password length', async function () {
    const policy: PasswordRequirements = { passwordMinLength: 10, passwordMinLengthEnabled: false }
    const validationStatus = await validatePasswordRequirements('123', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('passes minimum characters', async function () {
    const policy: PasswordRequirements = {
      minChars: 3,
      minCharsEnabled: true
    }
    const validationStatus = await validatePasswordRequirements('abc', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('fails minimum characters', async function () {
    const policy: PasswordRequirements = {
      minChars: 3,
      minCharsEnabled: true
    }
    const validationStatus = await validatePasswordRequirements('ab', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('ignores minimum characters', async function () {
    const policy: PasswordRequirements = {
      minChars: 3,
      minCharsEnabled: false
    }
    const validationStatus = await validatePasswordRequirements('a', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('passes maximum consecutive character count', async function () {
    const policy: PasswordRequirements = {
      maxConChars: 2,
      maxConCharsEnabled: true
    }
    const validationStatus = await validatePasswordRequirements('ab123', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('fails maximum consecutive character count', async function () {
    const policy: PasswordRequirements = {
      maxConChars: 2,
      maxConCharsEnabled: true
    }
    const validationStatus = await validatePasswordRequirements('ab123abc', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('ignores maximum consecutive character count', async function () {
    const policy: PasswordRequirements = {
      maxConChars: 1,
      maxConCharsEnabled: false
    }
    const validationStatus = await validatePasswordRequirements('abc', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('passes minimum number of lowercase characters', async function () {
    const policy: PasswordRequirements = {
      lowLetters: 2,
      lowLettersEnabled: true
    }
    const validationStatus = await validatePasswordRequirements('aBcD', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('fails minimum number of lowercase characters', async function () {
    const policy: PasswordRequirements = {
      lowLetters: 2,
      lowLettersEnabled: true
    }
    const validationStatus = await validatePasswordRequirements('ABCDE1234f', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('ignores minimum number of lowercase characters disabled', async function () {
    const policy: PasswordRequirements = {
      lowLetters: 10,
      lowLettersEnabled: false
    }

    const validationStatus = await validatePasswordRequirements('abc', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('passes minimum number of uppercase characters', async function () {
    const policy: PasswordRequirements = {
      highLetters: 2,
      highLettersEnabled: true
    }

    const validationStatus = await validatePasswordRequirements('aBcD', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('fails minimum number of uppercase characters', async function () {
    const policy: PasswordRequirements = {
      highLetters: 2,
      highLettersEnabled: true
    }

    const validationStatus = await validatePasswordRequirements('abcde1234F', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('ignores minimum number of uppercase characters', async function () {
    const policy: PasswordRequirements = {
      highLetters: 10,
      highLettersEnabled: false
    }

    const validationStatus = await validatePasswordRequirements('ABC', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('passes minimum number of numbers', async function () {
    const policy: PasswordRequirements = {
      numbers: 2,
      numbersEnabled: true
    }

    const validationStatus = await validatePasswordRequirements('aBcD12', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('fails minimum number of numbers', async function () {
    const policy: PasswordRequirements = {
      numbers: 2,
      numbersEnabled: true
    }

    const validationStatus = await validatePasswordRequirements('abcde1F', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('ignores minimum number of numbers', async function () {
    const policy: PasswordRequirements = {
      numbers: 10,
      numbersEnabled: false
    }

    const validationStatus = await validatePasswordRequirements('ABC1', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('passes minimum number of special characters', async function () {
    const policy: PasswordRequirements = {
      specialChars: 2,
      specialCharsEnabled: true
    }

    const validationStatus = await validatePasswordRequirements('abc$@', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('fails minimum number of special characters', async function () {
    const policy: PasswordRequirements = {
      specialChars: 2,
      specialCharsEnabled: true
    }

    const validationStatus = await validatePasswordRequirements('abc&', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('ignores minimum number of special characters disabled', async function () {
    const policy: PasswordRequirements = {
      specialChars: 10,
      specialCharsEnabled: false
    }

    const validationStatus = await validatePasswordRequirements('abc$@', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('fails with restricted special characters', async function () {
    const policy: PasswordRequirements = {
      specialChars: 1,
      specialCharsEnabled: true,
      restrictSpecialChars: '$',
      restrictSpecialCharsEnabled: true
    }

    const validationStatus = await validatePasswordRequirements('abc$@', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('passes with unrestricted special characters', async function () {
    const policy: PasswordRequirements = {
      specialChars: 1,
      specialCharsEnabled: true,
      restrictSpecialChars: '$',
      restrictSpecialCharsEnabled: true
    }

    const validationStatus = await validatePasswordRequirements('abc$$$$$', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('ignores special characters', async function () {
    const policy: PasswordRequirements = {
      specialChars: 10,
      specialCharsEnabled: false
    }

    const validationStatus = await validatePasswordRequirements('abc', policy)
    expect(validationStatus.valid).to.be.true
  })

  it('enforces a complex password policy', async function () {
    const policy: PasswordRequirements = {
      minCharsEnabled: true,
      minChars: 1,
      maxConCharsEnabled: true,
      maxConChars: 3,
      lowLettersEnabled: true,
      lowLetters: 1,
      highLettersEnabled: true,
      highLetters: 2,
      numbersEnabled: true,
      numbers: 2,
      specialCharsEnabled: false,
      specialChars: 0,
      restrictSpecialCharsEnabled: false,
      restrictSpecialChars: "",
      passwordMinLength: 10,
      passwordMinLengthEnabled: true
    }

    let validationStatus = await validatePasswordRequirements('ab1cD3F~~~', policy)
    expect(validationStatus.valid).to.be.true

    // Fail min letters
    validationStatus = await validatePasswordRequirements('1234567890', policy)
    expect(validationStatus.valid).to.be.false

    // Fail consecutive characters
    validationStatus = await validatePasswordRequirements('abcd1cD3F~~', policy)
    expect(validationStatus.valid).to.be.false

    // Fail lowercase letters
    validationStatus = await validatePasswordRequirements('AB1CD3F~~~', policy)
    expect(validationStatus.valid).to.be.false

    // Fail uppercase letters
    validationStatus = await validatePasswordRequirements('ab1cd3f~~~', policy)
    expect(validationStatus.valid).to.be.false

    // Fail numbers
    validationStatus = await validatePasswordRequirements('ab#cd#f~~~', policy)
    expect(validationStatus.valid).to.be.false

    // Fail password length
    validationStatus = await validatePasswordRequirements('ab1cD3F~~', policy)
    expect(validationStatus.valid).to.be.false

    // Fail multiple
    validationStatus = await validatePasswordRequirements('~', policy)
    expect(validationStatus.valid).to.be.false
  })

  it('passes password history', async function () {
    const policy: PasswordRequirements = {
      passwordHistoryCount: 2,
      passwordHistoryCountEnabled: true
    }
    const hash1 = await defaultHashUtil.hashPassword('hash1').then(serializeHashedPassword)
    const hash2 = await defaultHashUtil.hashPassword('hash2').then(serializeHashedPassword)
    const hash3 = await defaultHashUtil.hashPassword('hash3').then(serializeHashedPassword)
    const validationStatus = await validatePasswordRequirements('hash1', policy, [hash3, hash2, hash1])

    expect(validationStatus.valid).to.be.true
  })

  it('fails password history', async function () {
    const policy: PasswordRequirements = {
      passwordHistoryCount: 2,
      passwordHistoryCountEnabled: true
    }
    const hash1 = await defaultHashUtil.hashPassword('hash1').then(serializeHashedPassword)
    const hash2 = await defaultHashUtil.hashPassword('hash2').then(serializeHashedPassword)
    const validationStatus = await validatePasswordRequirements('hash1', policy, [hash2, hash1])

    expect(validationStatus.valid).to.be.false
  })

  it('TODO: truncates password history - this test belongs elsewhere')

  it('TODO: removes auth tokens when password is reset - this test belongs elsewhere')
})
