import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongooseLoginRepository, LoginModel } from '../../lib/adapters/logins/adapters.logins.db.mongoose'

describe('login model legacy bridge', function() {

  let loginModule: any
  let loginModel: ReturnType<typeof LoginModel>

  before(function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    loginModule = require('../../lib/models/login')
    loginModel = LoginModel(mongoose.connection, 'test_login_legacy_bridge')
    loginModule.initialize({ loginRepo: new MongooseLoginRepository(loginModel) })
  })

  afterEach(async function() {
    await loginModel.deleteMany({})
  })

  function createLogin(user: any, device?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      loginModule.createLogin(user, device, (err: any, login: any) => err ? reject(err) : resolve(login))
    })
  }

  it('createLogin creates a login for a user with no device', async function() {
    const user = { _id: new mongoose.Types.ObjectId() }
    const login = await createLogin(user)

    expect(login.user).to.equal(user._id.toString())
  })

  it('createLogin creates a login for a user and device', async function() {
    const user = { _id: new mongoose.Types.ObjectId() }
    const device = { _id: new mongoose.Types.ObjectId() }
    const login = await createLogin(user, device)

    expect(login.device).to.equal(device._id.toString())
  })

  it('getLogins delegates to the repository and returns documents filtered by userId', async function() {
    const user = { _id: new mongoose.Types.ObjectId() }
    const matching = await createLogin(user)
    await createLogin({ _id: new mongoose.Types.ObjectId() })
    const logins = await new Promise<any[]>((resolve, reject) => {
      loginModule.getLogins({ filter: { userId: user._id.toString() } }, (err: any, logins: any) => err ? reject(err) : resolve(logins))
    })

    expect(logins).to.have.length(1)
    expect(logins[0].id).to.equal(matching.id)
  })

  it('removeLoginsForUser removes only that user\'s logins', async function() {
    const user = { _id: new mongoose.Types.ObjectId() }
    const otherUser = { _id: new mongoose.Types.ObjectId() }
    await createLogin(user)
    const otherLogin = await createLogin(otherUser)

    await new Promise<void>((resolve, reject) => {
      loginModule.removeLoginsForUser(user, (err: any) => err ? reject(err) : resolve())
    })

    const remaining = await new Promise<any[]>((resolve, reject) => {
      loginModule.getLogins({}, (err: any, logins: any) => err ? reject(err) : resolve(logins))
    })
    expect(remaining).to.have.length(1)
    expect(remaining[0].id).to.equal(otherLogin.id)
  })
})
