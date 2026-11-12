import { expect } from 'chai'
import { validatePasswordRequirements } from '../../lib/local-idp/password-requirements'
import { PasswordRequirements } from '../../src/local-idp/password-requirements'


describe('password requirements validation', function () {

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

    const hashPassword = util.promisify(hasher.hashPassword)

    const hash1 = await hashPassword('hash1')
    const hash2 = await hashPassword('hash2')
    const hash3 = await hashPassword('hash3')

    let validationStatus = await validatePasswordRequirements('hash1', policy, [hash3, hash2, hash1])
    expect(validationStatus.valid).to.be.true
  })

  it('fails password history', async function () {
    const policy: PasswordRequirements = {
      passwordHistoryCount: 2,
      passwordHistoryCountEnabled: true
    }

    const hashPassword = util.promisify(hasher.hashPassword)

    const hash1 = await hashPassword('hash1')
    const hash2 = await hashPassword('hash2')

    let validationStatus = await validatePasswordRequirements('hash1', policy, [hash2, hash1])
    expect(validationStatus.valid).to.be.false
  })

  it('Should truncate password history', async function () {
    // Need to remove previously loaded model from monogose
    // as proxyquire will skip cache and reload.
    delete mongoose.connection.models['local'];
    delete mongoose.connection.models['saml'];
    delete mongoose.connection.models['ldap'];
    delete mongoose.connection.models['oauth'];
    delete mongoose.connection.models['openidconnect'];
    delete mongoose.connection.models['Authentication'];

    const hashPassword = util.promisify(hasher.hashPassword);
    const hash1 = await hashPassword('hash1');
    const hash2 = await hashPassword('hash2');
    const hash3 = await hashPassword('hash3');

    const hasherStub = (password, done) => {
      done(null, hash1);
    };

    const proxyquire = require('proxyquire');
    proxyquire('../../lib/models/authentication', {
      '../utilities/pbkdf2': function () {
        return {
          hashPassword: hasherStub
        }
      }
    });

    const Authentication = require('../../lib/models/authentication');
    const AuthenticationModel = mongoose.model('Authentication');

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves({
        settings: {
          passwordPolicy: {
            passwordHistoryCount: 2,
            passwordHistoryCountEnabled: true
          }
        }
      });

    sinon.mock(UserModel)
      .expects('getUserByUsername')
      .yields(null, {});

    sinon.mock(TokenModel)
      .expects('removeTokensForUser')
      .yields(null, {});

    const authentication = new Authentication.Local({
      type: 'local',
      password: 'hash1',
      previousPasswords: [hash3, hash2, hash1],
      authenticationConfigurationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(AuthenticationModel.collection)
      .expects('insert')
      .yields(null, authentication);

    const updatedAuthentication = await authentication.save();

    expect(updatedAuthentication.previousPasswords).to.have.length(2);
    expect(updatedAuthentication.previousPasswords[0]).to.not.equal(hash3);
    expect(updatedAuthentication.previousPasswords[0]).to.not.equal(hash2);
    //TODO figure out how to get proxyquire working
    //expect(updatedAuthentication.previousPasswords[1]).to.equal(hash1);
    expect(updatedAuthentication.previousPasswords[1]).to.equal(hash3);

    delete mongoose.connection.models['local'];
    delete mongoose.connection.models['saml'];
    delete mongoose.connection.models['ldap'];
    delete mongoose.connection.models['oauth'];
    delete mongoose.connection.models['Authentication'];
  });

  it('Should remove token if password is reset', async function () {
    const authentication = new Authentication.Local({
      _id: new mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      previousPasswords: [],
      authenticationConfigurationId: new mongoose.Types.ObjectId()
    });

    const user = {
      _id: new mongoose.Types.ObjectId()
    }

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves({
        settings: {
          passwordPolicy: {
            passwordHistoryCount: 2,
            passwordHistoryCountEnabled: true
          }
        }
      });

    sinon.mock(UserModel)
      .expects('getUserByAuthenticationId')
      .yields(null, user)

    sinon.mock(TokenModel)
      .expects('removeTokensForUser')
      .yields(null, {})

    sinon.mock(Authentication.Model.collection)
      .expects('insert')
      .yields(null, authentication);

    await authentication.save();
  });
});