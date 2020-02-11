
import { describe, beforeEach, afterEach, it } from 'mocha'
import { expect, assert } from 'chai'
import { mock, instance, reset, spy, when, verify } from 'ts-mockito'
import mongoose from 'mongoose'
import { ManifoldService } from '../../../manifold/services'
import { AdapterRepository, SourceRepository } from '../../../manifold/repositories'
import { SourceDescriptor, AdapterDescriptorSchema, ManifoldModels, AdapterDescriptorEntity } from '../../../manifold/models'
import { ManifoldAdapter } from '../../../manifold/adapters'
import path from 'path'
import plugin = require('./manifold_plugin_1')


describe('manifold service', function() {

  const modulePath = path.resolve(__dirname, 'manifold_plugin_1')
  const adapterMock = mock<ManifoldAdapter>()
  const adapter = instance(adapterMock)
  const adpaterRepoMock = mock<AdapterRepository>()
  const adapterRepo = instance(adpaterRepoMock)
  const sourceRepoMock = mock<SourceRepository>()
  const sourceRepo = instance(sourceRepoMock)
  const AdapterDescriptorModel = mongoose.model<AdapterDescriptorEntity>(ManifoldModels.AdapterDescriptor, AdapterDescriptorSchema)
  let service: ManifoldService

  ;(adapterMock as any).__tsmockitoMocker.excludedPropertyNames.push('then')

  beforeEach(function() {
    service = new ManifoldService(adapterRepo, sourceRepo)
  })

  afterEach(function() {
    reset(adpaterRepoMock)
    reset(sourceRepoMock)
  })

  describe('fetching the manifold descriptor', function() {

  })

  describe('loading adapters', function() {

    it('fetches the adapter descriptor if the given source does not have one', async function() {

      const source: SourceDescriptor = {
        title: 'Source 1',
        description: 'Testing',
        isReadable: true,
        isWritable: false,
        url: 'https://source1.test.mage',
        adapter: mongoose.Types.ObjectId().toHexString()
      }

      when(adpaterRepoMock.findById(source.adapter)).thenResolve(new AdapterDescriptorModel({
        id: source.id,
        title: 'Adapter 1',
        description: '',
        modulePath
      }))

      const pluginSpy = spy(plugin)
      when(pluginSpy.createAdapter()).thenResolve(adapter)

      const retrievedAdapter = await service.getAdapterForSource(source)

      expect(retrievedAdapter).to.equal(adapter)
      verify(pluginSpy.createAdapter()).once()
    })

    it('requires the adapter descriptor of the source to have an id', async function() {

      const pluginSpy = spy(plugin)
      when(pluginSpy.createAdapter()).thenResolve(adapter)

      const source: SourceDescriptor  = {
        title: 'Source 1',
        description: 'Testing',
        isReadable: true,
        isWritable: false,
        url: 'https://source1.test.mage',
        adapter: {
          title: 'Plugin 1',
          description: '',
          isReadable: true,
          isWritable: false,
          modulePath
        }
      }

      try {
        await service.getAdapterForSource(source)
      }
      catch (err) {
        verify(pluginSpy.createAdapter()).never()
        return
      }

      assert.fail('should have been rejected')
    })

    it('caches created adapters', async function() {

      const pluginSpy = spy(plugin)
      when(pluginSpy.createAdapter()).thenResolve(adapter)

      const source: SourceDescriptor = {
        title: 'Source 1',
        description: 'Testing',
        isReadable: true,
        isWritable: false,
        url: 'https://source1.test.mage',
        adapter: {
          id: 'mp1',
          title: 'Plugin 1',
          description: '',
          isReadable: true,
          isWritable: false,
          modulePath
        }
      }
      const adapter1 = await service.getAdapterForSource(source)
      const adapter2 = await service.getAdapterForSource(source)

      expect(adapter1).to.equal(adapter)
      expect(adapter2).to.equal(adapter1)
      verify(pluginSpy.createAdapter()).once()
    })
  })
})