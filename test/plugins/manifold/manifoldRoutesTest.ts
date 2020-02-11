import { expect } from 'chai'
import { mock, reset, instance, when, deepEqual } from 'ts-mockito'
import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import { SourceRepository, AdapterRepository } from '../../../plugins/mage-manifold/repositories'
import { SourceDescriptor, SourceDescriptorModel, AdapterDescriptorModel, ManifoldModels, SourceDescriptorSchema, AdapterDescriptorSchema } from '../../../plugins/mage-manifold/models'
import { createRouter, ManifoldController } from '../../../plugins/mage-manifold'
import mongoose from 'mongoose'
import { parseEntity, transformObject as transformJson } from '../../utils'
import { ManifoldDescriptor, ManifoldService } from '../../../plugins/mage-manifold/services'
const log = require('../../../logger')


describe('manifold routes', function() {

  const AdapterDescriptorModel: AdapterDescriptorModel = mongoose.model(ManifoldModels.AdapterDescriptor, AdapterDescriptorSchema)
  const SourceDescriptorModel: SourceDescriptorModel = mongoose.model(ManifoldModels.SourceDescriptor, SourceDescriptorSchema)
  const adapterRepoMock = mock<AdapterRepository>()
  const sourceRepoMock = mock<SourceRepository>()
  const manifoldServiceMock = mock<ManifoldService>()
  const adapterRepo = instance(adapterRepoMock)
  const sourceRepo = instance(sourceRepoMock)
  const manifoldService = instance(manifoldServiceMock)
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

  describe('path /descriptor', function() {

    describe('GET', function() {

      it('returns the manifold descriptor', async function() {

        const descriptor: ManifoldDescriptor = {
          adapters: {
            'a1': {
              id: 'a1',
              title: 'Adapter 1',
              description: 'Adapting 1s',
              isReadable: true,
              isWritable: false,
              modulePath: '/var/manifold/a1'
            },
            'a2': {
              id: 'a2',
              title: 'Adapter 2',
              description: 'Adapting 2s',
              isReadable: true,
              isWritable: false,
              modulePath: '/var/manifold/a2'
            }
          },
          sources: {
            'a1s1': {
              id: 'a1s1',
              adapter: 'a1',
              title: 'Adapter 1 Source 1',
              description: 'Adapter 1 Source 1 details',
              isReadable: true,
              isWritable: false,
              url: 'https://a1s1.test/api'
            }
          }
        }
        when(manifoldServiceMock.getManifoldDescriptor()).thenResolve(descriptor)

        const res = await request(app).get('/manifold/descriptor')

        expect(res.status).to.equal(200)
        expect(res.type).to.match(/^application\/json/)
        expect(res.body).to.deep.equal(descriptor)
      })
    })
  })

  describe('path /sources', function() {

    describe('POST', function() {

      it('creates a source', async function() {

        const source: SourceDescriptor = {
          adapter: mongoose.Types.ObjectId().toHexString(),
          title: 'Source 123',
          description: 'A test source',
          isReadable: true,
          isWritable: false,
          url: 'http://test.com/source123'
        }
        const created = parseEntity(SourceDescriptorModel, source)

        when(sourceRepoMock.create(deepEqual(source))).thenResolve(created)

        let res = await request(app)
          .post('/manifold/sources')
          .accept('application/json')
          .send(source)

        expect(res.status).to.equal(201)
        expect(res.type).to.match(/^application\/json/)
        expect(res.header.location).to.equal(`/manifold/sources/${created.id}`)
        expect(res.body).to.deep.equal({
          ...source,
          id: created.id
        })
      })
    })
  })

  describe('path /sources/{sourceId}', function() {

    describe('GET', function() {

      it('returns the source descriptor', async () => {

        const source: SourceDescriptor = {
          id: mongoose.Types.ObjectId().toHexString(),
          adapter: {
            id: mongoose.Types.ObjectId().toHexString(),
            title: 'Adapter 123',
            description: 'A test adapter',
            isReadable: true,
            isWritable: false,
            modulePath: '/var/lib/mage/manifold/adapter123'
          },
          title: 'Source 123',
          description: 'A test source',
          isReadable: true,
          isWritable: false,
          url: 'http://test.com/source123'
        }
        const sourceEntity = parseEntity(SourceDescriptorModel, source)
        sourceEntity.adapter = parseEntity(AdapterDescriptorModel, source.adapter)

        when(sourceRepoMock.findById(source.id!)).thenResolve(sourceEntity)

        const res = await request(app).get(`/manifold/sources/${source.id}`)
        expect(res.status).to.equal(200)
        expect(res.type).to.match(/^application\/json/)
        expect(res.body).to.deep.equal(transformJson(source, {
          adapter: transformJson(source.adapter, { modulePath: transformJson.DELETE_KEY })
        }))
      })
    })
  })
})