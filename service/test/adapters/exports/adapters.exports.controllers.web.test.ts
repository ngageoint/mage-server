import { expect } from 'chai'
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web'
import { AppRequest, AppResponse } from '../../../lib/app.api/app.api.global'
import { SubstituteOf, Substitute as Sub, Arg } from '@fluffy-spoon/substitute'
import supertest from 'supertest'
import uniqid from 'uniqid'
import express from 'express'
import mongoose from 'mongoose'
import { ExportAppLayer, MyExportRoutes } from '../../../lib/adapters/exports/adapters.exports.controllers.web'
import { GetExportsRequest } from '../../../lib/app.api/exports/app.api.exports'
import { Export, ExportStatus } from '../../../lib/entities/exports/entities.exports'
import { ExportExpanded } from '../../../lib/entities/exports/entities.exports'
import { Readable } from 'stream'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'
import { entityNotFound, infrastructureError, permissionDenied } from '../../../lib/app.api/app.api.errors'

describe('exports web controller', function() {

  const userId = new mongoose.Types.ObjectId()
  const hostUrl = 'http://mage.test'
  const root = '/exports-test'
  const jsonMimeType = /^application\/json/
  const validPrincipal: UserWithRole = {
    _id: userId,
    id: userId.toHexString(),
    username: 'test.user',
    displayName: 'You Sir Testington',
  } as unknown as UserWithRole

  const createAppRequest = <Params>(p?: Params): Params & AppRequest<{ user: string }> => {
    return {
      context: {
        requestToken: Symbol(),
        requestingPrincipal() {
          return validPrincipal
        }
      },
      ...(p || {} as any)
    }
  }

  type AppRequestFactoryHandle = {
    createRequest: WebAppRequestFactory
  }

  let client: supertest.SuperTest<supertest.Test>
  let appLayer: SubstituteOf<ExportAppLayer>
  let appReqFactory: SubstituteOf<AppRequestFactoryHandle>

  beforeEach(function() {
    appLayer = Sub.for<ExportAppLayer>()
    appReqFactory = Sub.for<AppRequestFactoryHandle>()
    const endpoint = express()
    endpoint.use(function lookupUser(req: express.Request, res: express.Response, next: express.NextFunction) {
      req.testUser = req.headers['user'] as string
      next()
    })
    const controller = MyExportRoutes(appLayer, appReqFactory.createRequest)
    endpoint
      .use((req, res, next) => {
        req.getRoot = () => hostUrl
        next()
      })
      .use(root, controller)
    client = supertest(endpoint)
  })

  describe('GET /mine', function() {

    const exportBytes = Buffer.from(Array.from({ length: 10000 }).map(x => uniqid()).join(' | '))
    const id = uniqid()
    const exp: ExportExpanded = {
      id,
      userId: userId.toHexString(),
      user: { id: validPrincipal.id, username: validPrincipal.username, displayName: validPrincipal.displayName },
      relativePath: 'some/path',
      filename: 'export',
      size: exportBytes.length,
      exportType: 'kml',
      status: ExportStatus.Completed,
      options: {
        eventId: 1,
        event: { id: 1, name: 'Test 1' },
        filter: undefined,
        projection: undefined
      },
      processingErrors: [],
      expirationDate: new Date(),
      summary: {
        observations: {
          count: 2,
          startTimestamp: new Date(),
          endTimestamp: new Date()
        },
        locations: {
          count: 2,
          startTimestamp: new Date(),
          endTimestamp: new Date()
        }
      },
      lastUpdated: new Date()
    }

    it('fetches exports for user', async function() {
      const appReq: GetExportsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getExports(Arg.all()).resolves(AppResponse.success([exp]))
      const res = await client.get(`${root}`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.be.an('array').with.length(1)
      expect(res.body[0]).to.deep.include({
        id: exp.id,
        user: {
          id: validPrincipal.id,
          username: validPrincipal.username,
          displayName: validPrincipal.displayName
        }
      })
    })

    it('fetches export content for user', async function() {
      const appReq: GetExportsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getExportContent(Arg.all()).resolves(AppResponse.success({
        export: exp,
        bytes: Readable.from([exportBytes])
      }))
      const res = await client.get(`${root}/${exp.id}`).responseType('blob')

      expect(res.status).to.equal(200)
      expect(res.headers).to.have.property('content-type', 'application/zip')
      expect(res.headers).to.have.property('content-length', String(exportBytes.length))
      expect(res.body).to.deep.equal(exportBytes)
      appLayer.received(1).getExportContent(Arg.all())
      appLayer.received(1).getExportContent(Arg.is(x => {
        const principle = x.context.requestingPrincipal()
        expect(principle.username).to.equal('test.user')
        return true
      }))
    })

    it('returns 403 without permission', async function() {
      const denied = permissionDenied('read export content', 'happy gillmore')
      appLayer.getExportContent(Arg.all()).resolves(AppResponse.error(denied))
      const res = await client.get(`${root}/none`)

      expect(res.status).to.equal(403)
      expect(res.body).to.deep.equal({ message: 'permission denied: read export content' })
      appLayer.received(1).getExportContent(Arg.all())
    })

    it('returns 404 if the export does not exist', async function() {
      const notFound = entityNotFound(exp.id, 'Export')
      const appReq: GetExportsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getExportContent(Arg.all()).resolves(AppResponse.error(notFound))
      const res = await client.get(`${root}/none`)

      expect(res.status).to.equal(404)
      expect(res.body).to.deep.equal({ message: notFound.message })
      appLayer.received(1).getExportContent(Arg.all())
    })

    it('returns 500 if the export does not exist', async function() {
      const notFound = infrastructureError('infastructure error')
      const appReq: GetExportsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getExportContent(Arg.all()).resolves(AppResponse.error(notFound))
      const res = await client.get(`${root}/none`)

      expect(res.status).to.equal(500)
      expect(res.body).to.deep.equal({ message: notFound.message })
      appLayer.received(1).getExportContent(Arg.all())
    })
  })

  describe('POST /myself', function() {

    const id = uniqid()
    const exp: ExportExpanded = {
      id,
      userId: validPrincipal.id,
      user: { id: validPrincipal.id, username: validPrincipal.username },
      relativePath: 'some/path',
      filename: 'export',
      exportType: 'kml',
      status: ExportStatus.Completed,
      options: {
        eventId: 1,
        event: { id: 1, name: 'Event 1' },
        filter: undefined,
        projection: undefined
      },
      processingErrors: [],
      expirationDate: new Date(),
      summary: {
        observations: {
          count: 2,
          startTimestamp: new Date(),
          endTimestamp: new Date()
        },
        locations: {
          count: 2,
          startTimestamp: new Date(),
          endTimestamp: new Date()
        }
      },
      lastUpdated: new Date()
    }

    it('fetches exports for user', async function() {
      const appReq: GetExportsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getExports(Arg.all()).resolves(AppResponse.success([exp]))
      const res = await client.get(`${root}`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.be.an('array').with.length(1)
      expect(res.body[0]).to.deep.include({
        id: exp.id,
        user: {
          id: validPrincipal.id,
          username: validPrincipal.username
        }
      })
    })
  })
})
