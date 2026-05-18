import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import _ from 'lodash'
import * as legacy from '../../../lib/models/setting'
import { MongooseSettingsRepository, SettingsDocument, SettingsModel } from '../../../lib/adapters/settings/adapters.settings.db.mongoose'
import { MapSettings, MobileSearchType, WebSearchType } from '../../../lib/entities/settings/entities.settings'

describe('settings mongoose repository', function() {

  let model: SettingsModel
  let repo: MongooseSettingsRepository

  before(async function () {
    model = legacy.Model as mongoose.Model<SettingsDocument>
    repo = new MongooseSettingsRepository(model)
  })

  afterEach(async function() {
    await model.remove({})
  })

  describe('finding map settings', function() {

    const mapSettings = {
      webSearchType: WebSearchType.NONE,
      webNominatimUrl: "web url",
      mobileSearchType: MobileSearchType.NOMINATIM,
      mobileNominatimUrl: "mobile url"
    }

    beforeEach('create map settings', async function () {
      await model.update({ type: 'map' }, {settings: mapSettings }, { upsert: true})
    })

    it('looks up map settings by type', async function() {
      const fetched = await repo.getMapSettings()
      expect(fetched).to.deep.equal(mapSettings)
    })

  })

  describe('updating map settings', function () {

    const mapSettings: MapSettings = {
      webSearchType: WebSearchType.NOMINATIM,
      webNominatimUrl: "web url",
      mobileSearchType: MobileSearchType.NOMINATIM,
      mobileNominatimUrl: "mobile url"
    }

    it('updates map settings by type', async function () {
      const fetched = await repo.updateMapSettings(mapSettings)
      expect(fetched).to.deep.equal(mapSettings)
    })

  })
})