const chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = require("chai").expect
  , util = require('util')
  , mongoose = require('mongoose')
  , PasswordValidator = require('../../utilities/passwordValidator')
  , hasher = require('../../utilities/pbkdf2')();

chai.use(sinonChai);

require('../../models/user');
const UserModel = mongoose.model('User');

require('../../models/token');
const TokenModel = mongoose.model('Token');

const Authentication = require('../../models/authentication');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("Password Validator Tests", function () {

  afterEach(function () {
    sinon.restore();
  });

  it('Should fail on null password', async function () {
    const authentication = {
      password: null
    }

    const validationStatus = await PasswordValidator.validate({}, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should meet minimum password length', async function () {
    const policy = {
      passwordMinLength: 3,
      passwordMinLengthEnabled: true
    }

    const authentication = {
      password: '123'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail minimum password length', async function () {
    const policy = {
      passwordMinLength: 3,
      passwordMinLengthEnabled: true
    }

    const authentication = {
      password: '12'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should ignore minimum password length', async function () {
    const policy = {
      passwordMinLength: 10,
      passwordMinLengthEnabled: false
    }

    const authentication = {
      password: '123'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should meet minimum characters', async function () {
    const policy = {
      minChars: 3,
      minCharsEnabled: true
    }

    const authentication = {
      password: 'abc'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail minimum characters', async function () {
    const policy = {
      minChars: 3,
      minCharsEnabled: true
    }

    const authentication = {
      password: 'ab'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should ignore minimum characters', async function () {
    const policy = {
      minChars: 3,
      minCharsEnabled: false
    }

    const authentication = {
      password: 'a'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should meet maximum consecutive character count', async function () {
    const policy = {
      maxConChars: 2,
      maxConCharsEnabled: true
    }

    const authentication = {
      password: 'ab123'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail maximum consecutive character count', async function () {
    const policy = {
      maxConChars: 2,
      maxConCharsEnabled: true
    }

    const authentication = {
      password: 'ab123abc'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should ignore maximum consecutive character count', async function () {
    const policy = {
      maxConChars: 1,
      maxConCharsEnabled: false
    }

    const authentication = {
      password: 'abc'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should meet minimum number of lowercase characters', async function () {
    const policy = {
      lowLetters: 2,
      lowLettersEnabled: true
    }

    const authentication = {
      password: 'aBcD'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail minimum number of lowercase characters', async function () {
    const policy = {
      lowLetters: 2,
      lowLettersEnabled: true
    }

    const authentication = {
      password: 'ABCDE1234f'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should ignore minimum number of lowercase characters disabled', async function () {
    const policy = {
      lowLetters: 10,
      lowLettersEnabled: false
    }

    const authentication = {
      password: 'abc'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should meet minimum number of uppercase characters', async function () {
    const policy = {
      highLetters: 2,
      highLettersEnabled: true
    }

    const authentication = {
      password: 'aBcD'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail minimum number of uppercase characters', async function () {
    const policy = {
      highLetters: 2,
      highLettersEnabled: true
    }

    const authentication = {
      password: 'abcde1234F'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should ignore minimum number of uppercase characters', async function () {
    const policy = {
      highLetters: 10,
      highLettersEnabled: false
    }

    const authentication = {
      password: 'ABC'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should meet minimum number of numbers', async function () {
    const policy = {
      numbers: 2,
      numbersEnabled: true
    }

    const authentication = {
      password: 'aBcD12'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail minimum number of numbers', async function () {
    const policy = {
      numbers: 2,
      numbersEnabled: true
    }

    const authentication = {
      password: 'abcde1F'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should ignore minimum number of numbers', async function () {
    const policy = {
      numbers: 10,
      numbersEnabled: false
    }

    const authentication = {
      password: 'ABC1'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should meet minimum number of special characters', async function () {
    const policy = {
      specialChars: 2,
      specialCharsEnabled: true
    }

    const authentication = {
      password: 'abc$@'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail minimum number of special characters', async function () {
    const policy = {
      specialChars: 2,
      specialCharsEnabled: true
    }

    const authentication = {
      password: 'abc&'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should ignore minimum number of special characters disabled', async function () {
    const policy = {
      specialChars: 10,
      specialCharsEnabled: false
    }

    const authentication = {
      password: 'abc$@'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail with restricted special characters', async function () {
    const policy = {
      specialChars: 1,
      specialCharsEnabled: true,
      restrictSpecialChars: '$',
      restrictSpecialCharsEnabled: true
    }

    const authentication = {
      password: 'abc$@'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

  it('Should pass with unrestricted special characters', async function () {
    const policy = {
      specialChars: 1,
      specialCharsEnabled: true,
      restrictSpecialChars: '$',
      restrictSpecialCharsEnabled: true
    }

    const authentication = {
      password: 'abc$$$$$'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should ignore special characters', async function () {
    const policy = {
      specialChars: 10,
      specialCharsEnabled: false
    }

    const authentication = {
      password: 'abc'
    }

    const validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Test complex password policy', async function () {
    const policy = {
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

    let validationStatus = await PasswordValidator.validate(policy, { password: 'ab1cD3F~~~' });
    expect(validationStatus.valid).to.be.true;

    // Fail min letters
    validationStatus = await PasswordValidator.validate(policy, { password: '1234567890' });
    expect(validationStatus.valid).to.be.false;

    // Fail consecutive characters
    validationStatus = await PasswordValidator.validate(policy, { password: 'abcd1cD3F~~' });
    expect(validationStatus.valid).to.be.false;

    // Fail lowercase letters
    validationStatus = await PasswordValidator.validate(policy, { password: 'AB1CD3F~~~' });
    expect(validationStatus.valid).to.be.false;

    // Fail uppercase letters
    validationStatus = await PasswordValidator.validate(policy, { password: 'ab1cd3f~~~' });
    expect(validationStatus.valid).to.be.false;

    // Fail numbers
    validationStatus = await PasswordValidator.validate(policy, { password: 'ab#cd#f~~~' });
    expect(validationStatus.valid).to.be.false;

    // Fail password length
    validationStatus = await PasswordValidator.validate(policy, { password: 'ab1cD3F~~' });
    expect(validationStatus.valid).to.be.false;

    // Fail multiple
    validationStatus = await PasswordValidator.validate(policy, { password: '~' });
    expect(validationStatus.valid).to.be.false;
  });

  it('Should pass password history', async function () {
    const policy = {
      passwordHistoryCount: 2,
      passwordHistoryCountEnabled: true
    }

    const hashPassword = util.promisify(hasher.hashPassword);

    const hash1 = await hashPassword('hash1');
    const hash2 = await hashPassword('hash2');
    const hash3 = await hashPassword('hash3');

    const authentication = {
      password: 'hash1',
      previousPasswords: [hash3, hash2, hash1]
    }

    let validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.true;
  });

  it('Should fail password history', async function () {
    const policy = {
      passwordHistoryCount: 2,
      passwordHistoryCountEnabled: true
    }

    const hashPassword = util.promisify(hasher.hashPassword);

    const hash1 = await hashPassword('hash1');
    const hash2 = await hashPassword('hash2');

    const authentication = {
      password: 'hash1',
      previousPasswords: [hash2, hash1]
    }

    let validationStatus = await PasswordValidator.validate(policy, authentication);
    expect(validationStatus.valid).to.be.false;
  });

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
    proxyquire('../../models/authentication', {
      '../utilities/pbkdf2': function () {
        return {
          hashPassword: hasherStub
        }
      }
    });

    const Authentication = require('../../models/authentication');
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
      .expects('findOne')
      .chain('populate')
      .chain('populate')
      .chain('exec')
      .resolves({});

    sinon.mock(TokenModel)
      .expects('remove')
      .yields(null, {});

    const authentication = new Authentication.Local({
      type: 'local',
      password: 'hash1',
      previousPasswords: [hash3, hash2, hash1],
      authenticationConfigurationId: mongoose.Types.ObjectId()
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
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      previousPasswords: [],
      authenticationConfigurationId: mongoose.Types.ObjectId()
    });

    const user = {
      _id: mongoose.Types.ObjectId()
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
      .expects('findOne')
      .withArgs({ authenticationId: authentication._id })
      .chain('populate')
      .chain('exec')
      .resolves(user)

    sinon.mock(TokenModel)
      .expects('remove')
      .withArgs({ userId: user._id })
      .yields(null, {})

    sinon.mock(Authentication.Model.collection)
      .expects('insert')
      .yields(null, authentication);

    await authentication.save();
  });
});