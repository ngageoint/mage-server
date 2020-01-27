import { expect } from 'chai'
import { mock, reset, instance, when, deepEqual } from 'ts-mockito'
import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import { SourceRepository, AdapterRepository } from '../../../plugins/mage-manifold/repositories'
import { SourceDescriptor, SourceDescriptorEntity, SourceDescriptorModel } from '../../../plugins/mage-manifold/models'
import mongoose from 'mongoose'
import { parseEntity } from '../../utils'
import { ManifoldService } from '../../../plugins/mage-manifold/services'
import { ManifoldController, createRouter } from '../../../plugins/mage-manifold'
import OgcApiFeatures from '../../../plugins/mage-manifold/ogcapi-features'
const log = require('../../../logger')

describe.only('manifold source routes', function() {

  const sourceBase = '/manifold/sources/abc123'
  const adapterRepoMock = mock<AdapterRepository>()
  const adapterRepo = instance(adapterRepoMock)
  const sourceRepoMock = mock<SourceRepository>()
  const sourceRepo = instance(sourceRepoMock)
  const manifoldServiceMock = mock<ManifoldService>()
  const manifoldService = instance(manifoldServiceMock)
  const featuresAdapterMock = mock<OgcApiFeatures.ServiceAdapter>()
  const featuresAdapter = instance(featuresAdapterMock)
  // TODO: workaround for https://github.com/NagRock/ts-mockito/issues/163
  ;(featuresAdapterMock as any).__tsmockitoMocker.excludedPropertyNames.push('then')
  const app = express()
  app.use(express.json())
  const injection: ManifoldController.Injection = {
    adapterRepo,
    sourceRepo,
    manifoldService
  }
  const manifold = createRouter(injection)
  app.use('/manifold', manifold)
  app.use((err: any, req: Request, res: Response, next: NextFunction): any => {
    if (err) {
      log.error(err)
    }
    next(err)
  })

  beforeEach(function() {
    reset(adapterRepoMock)
    reset(sourceRepoMock)
    reset(manifoldServiceMock)
  })

  describe('path /{sourceId}/collections', function() {

  })

  describe('path /{sourceId}/collections/{collectionId}', function() {

    describe('GET', function() {

      it.only('returns the collection descriptor', async function() {

        const colId = 'col1'
        const colDesc: OgcApiFeatures.CollectionDescriptorJson = {
          id: colId,
          title: 'Collection 1',
          description: 'A test collection',
          links: [],
          crs: [ OgcApiFeatures.CrsWgs84 ],
          extent: {
            spatial: {
              crs: OgcApiFeatures.CrsWgs84,
              bbox: [[ 1, 1, 2, 2 ]]
            }
          }
        }

        const source: SourceDescriptorEntity = new SourceDescriptorModel({
          title: 'Source 1',
          adapter: mongoose.Types.ObjectId().toHexString(),
          isReadable: true,
          isWritable: false,
          url: 'https://source1.test.net'
        })
        const collectionDescriptors = new Map([
          [ colId, colDesc ]
        ])
        const featuresAdapterPromise = Promise.resolve(featuresAdapter)
        when(sourceRepoMock.findById(source.id as string)).thenResolve(source)
        when(manifoldServiceMock.getAdapterForSource(source)).thenCall(() => {
          return featuresAdapterPromise
        })
        when(featuresAdapterMock.getCollections()).thenResolve(collectionDescriptors)

        const res = await request(app).get(`/manifold/sources/${source.id}/collections/${colId}`)

        expect(res.status).to.equal(200)
        expect(res.type).to.match(/^application\/json/)
        expect(res.body).to.deep.equal(colDesc)
      })
    })
  })

  describe('path /{sourceId}/collections/{collectionId}/items', function() {

  })

  describe('path /{sourceId}/collections/{collectoinId}/items/{featureId}', function() {

  })
})
