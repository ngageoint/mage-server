import { expect } from 'chai'
import mongoose from 'mongoose'
import {
  UserLocationModel,
  MongooseUserLocationRepository
} from '../../lib/adapters/locations/adapters.locations.db.mongoose'
import {
  RecentUserLocationModel,
  MongooseRecentUserLocationsRepository
} from '../../lib/adapters/locations/adapters.locations.recent.db.mongoose'

describe('user model location cascade', function() {

  let UserModel: mongoose.Model<any>
  let locationModel: ReturnType<typeof UserLocationModel>
  let recentModel: ReturnType<typeof RecentUserLocationModel>

  before(function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const userModule = require('../../lib/models/user')
    UserModel = userModule.Model
    locationModel = UserLocationModel(mongoose.connection, 'test_user_cascade_locations')
    recentModel = RecentUserLocationModel(mongoose.connection, 'test_user_cascade_recent_locations')
    userModule.initialize({
      userLocationRepo: new MongooseUserLocationRepository(locationModel),
      recentUserLocationRepo: new MongooseRecentUserLocationsRepository(recentModel)
    })
  })

  afterEach(async function() {
    await UserModel.deleteMany({ username: /^cascade-test/ })
    await locationModel.deleteMany({})
    await recentModel.deleteMany({})
  })

  it("removes the user's locations and recent locations when the user is deleted", async function() {
    const user = await UserModel.create({
      username: 'cascade-test-1',
      displayName: 'Cascade Test',
      active: true,
      roleId: new mongoose.Types.ObjectId(),
      authenticationId: new mongoose.Types.ObjectId()
    })

    await locationModel.create({
      userId: user._id,
      eventId: 1,
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { timestamp: new Date() }
    })
    await recentModel.create({
      userId: user._id,
      eventId: 1,
      locations: []
    })

    expect(await locationModel.countDocuments({ userId: user._id })).to.equal(1)
    expect(await recentModel.countDocuments({ userId: user._id })).to.equal(1)

    await user.deleteOne()

    expect(await locationModel.countDocuments({ userId: user._id })).to.equal(0)
    expect(await recentModel.countDocuments({ userId: user._id })).to.equal(0)
  })

  it('does not leave other users\' locations behind', async function() {
    const user = await UserModel.create({
      username: 'cascade-test-2',
      displayName: 'Cascade Test',
      active: true,
      roleId: new mongoose.Types.ObjectId(),
      authenticationId: new mongoose.Types.ObjectId()
    })
    const otherUserId = new mongoose.Types.ObjectId()

    await locationModel.create({
      userId: user._id,
      eventId: 1,
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { timestamp: new Date() }
    })
    await locationModel.create({
      userId: otherUserId,
      eventId: 1,
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { timestamp: new Date() }
    })

    await user.deleteOne()

    expect(await locationModel.countDocuments({ userId: otherUserId })).to.equal(1)
  })

  it('does not throw when no Location/CappedLocation repositories have been injected', async function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const userModule = require('../../lib/models/user')
    userModule.initialize({ userLocationRepo: null, recentUserLocationRepo: null })
    try {
      const user = await UserModel.create({
        username: 'cascade-test-3',
        displayName: 'Cascade Test',
        active: true,
        roleId: new mongoose.Types.ObjectId(),
        authenticationId: new mongoose.Types.ObjectId()
      })

      await user.deleteOne()
    } finally {
      userModule.initialize({
        userLocationRepo: new MongooseUserLocationRepository(locationModel),
        recentUserLocationRepo: new MongooseRecentUserLocationsRepository(recentModel)
      })
    }
  })
})
