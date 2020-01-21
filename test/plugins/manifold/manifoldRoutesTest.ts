import { expect } from 'chai'
import { mock, reset, instance, when } from 'ts-mockito'
import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import { ManifoldController, loadApi } from '../../../plugins/mage-manifold'
import { SourceRepository, AdapterRepository } from '../../../plugins/mage-manifold/repositories'
import { SourceDescriptor, SourceDescriptorEntity, SourceDescriptorModel } from '../../../plugins/mage-manifold/models'
import mongoose from 'mongoose'
import { parseEntity } from '../../utils'
import { ManifoldDescriptor, ManifoldService } from '../../../plugins/mage-manifold/services'
const log = require('../../../logger')


describe.only('manifold routes', function() {

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
  const enforcer = loadApi(injection)
  app.use('/manifold', enforcer.middleware())
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

      it.only('returns the manifold descriptor', async function() {

        const descriptor: ManifoldDescriptor = {
          adapters: {
            'a1': {
              id: 'a1',
              title: 'Adapter 1',
              description: 'Adapting 1s',
              isReadable: true,
              isWritable: false,
              libPath: '/var/manifold/a1'
            },
            'a2': {
              id: 'a2',
              title: 'Adapter 2',
              description: 'Adapting 2s',
              isReadable: true,
              isWritable: false,
              libPath: '/var/manifold/a2'
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

        const source = {
          adapter: 'adapter123',
          title: 'Source 123',
          description: 'A test source',
          isReadable: true,
          isWritable: false,
          url: 'http://test.com/source123'
        }
        const created = parseEntity(SourceDescriptorModel, source)

        when(sourceRepoMock.create(source)).thenResolve(created)

        let res = await request(app)
          .post('/manifold/sources')
          .accept('application/json')
          .send(source)

        expect(res.status).to.equal(200)
        expect(res.type).to.match(/^application\/json/)
        expect(res.body).to.deep.equal({
          ...source,
          id: created.id
        })
      })

      it('returns multiple sources', async function() {

      })
    })
  })

})