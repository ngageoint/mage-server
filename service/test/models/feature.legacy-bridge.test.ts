import { expect } from 'chai'

describe('feature model legacy bridge', function() {

  let featureModule: any

  before(function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    featureModule = require('../../lib/models/feature')
  })

  afterEach(async function() {
    const model = featureModule.featureModel({ collectionName: 'test_bridge_layer_a' })
    await model.deleteMany({})
  })

  it('createFeatures creates documents in the layer-specific collection', async function() {
    const layer = { collectionName: 'test_bridge_layer_a' }
    const created = await featureModule.createFeatures(layer, [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: { name: 'bridge-a' } }
    ])

    expect(created).to.have.length(1)
    expect(created[0].toJSON().properties.name).to.equal('bridge-a')
  })

  it('getFeatures returns documents with a working toJSON()', async function() {
    const layer = { collectionName: 'test_bridge_layer_a' }
    await featureModule.createFeatures(layer, [
      { type: 'Feature', geometry: null, properties: { name: 'bridge-b' } }
    ])

    const found = await featureModule.getFeatures(layer)

    expect(found).to.have.length(1)
    const json = found[0].toJSON()
    expect(json.id).to.exist
    expect(json.properties.name).to.equal('bridge-b')
  })

  it('keeps different layers in independent collections', async function() {
    const layerA = { collectionName: 'test_bridge_layer_a' }
    const layerB = { collectionName: 'test_bridge_layer_b' }

    await featureModule.createFeatures(layerA, [{ type: 'Feature', geometry: null }])
    const foundB = await featureModule.getFeatures(layerB)

    expect(foundB).to.have.length(0)

    const modelB = featureModule.featureModel(layerB)
    await modelB.deleteMany({})
  })
})
