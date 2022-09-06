import { expect } from 'chai'
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web'
import { AppRequest, AppResponse } from '../../../lib/app.api/app.api.global'
import { StaticIconsAppLayer, StaticIconRoutes } from '../../../lib/adapters/icons/adapters.icons.controllers.web'
import { URL } from 'url'
import { SubstituteOf, Substitute as Sub, Arg } from '@fluffy-spoon/substitute'
import supertest from 'supertest'
import uniqid from 'uniqid'
import express from 'express'
import { StaticIcon } from '../../../lib/entities/icons/entities.icons'
import { GetStaticIconContentRequest, GetStaticIconRequest, ListStaticIconsRequest, StaticIconWithContent } from '../../../lib/app.api/icons/app.api.icons'
import _ from 'lodash'
import { entityNotFound, EntityNotFoundError } from '../../../lib/app.api/app.api.errors'
import { PageOf } from '../../../lib/entities/entities.global'
import { Readable } from 'stream'



describe('icons web controller', function() {

  const root = '/icons-test'
  const iconJson: (icon: StaticIcon) => Omit<StaticIcon, 'sourceUrl'> & { sourceUrl: string } = (icon) => {
    return {
      ...icon,
      sourceUrl: String(icon.sourceUrl),
      contentPath: `${root}/${icon.id}/content`
    }
  }
  const jsonMimeType = /^application\/json/
  const validPrincipal = {
    user: 'test.user'
  }

  const createAppRequest = <Params>(p?: Params): Params & AppRequest<{ user: string }> => {
    const safeParams = p || {} as any
    return {
      ...safeParams,
      context: {
        requestToken: Symbol(),
        requestingPrincipal() {
          return validPrincipal
        }
      }
    }
  }

  type AppRequestFactoryHandle = {
    createRequest: WebAppRequestFactory
  }

  let client: supertest.SuperTest<supertest.Test>
  let appLayer: SubstituteOf<StaticIconsAppLayer>
  let appReqFactory: SubstituteOf<AppRequestFactoryHandle>

  beforeEach(function() {
    appLayer = Sub.for<StaticIconsAppLayer>()
    appReqFactory = Sub.for<AppRequestFactoryHandle>()
    const endpoint = express()
    endpoint.use(function lookupUser(req: express.Request, res: express.Response, next: express.NextFunction) {
      req.testUser = req.headers['user'] as string
      next()
    })
    const controller = StaticIconRoutes(appLayer, appReqFactory.createRequest)
    endpoint.use(root, controller)
    client = supertest(endpoint)
  })

  describe('GET /:iconId', function() {

    it('fetches the icon for id in the path', async function() {

      const id = uniqid()
      const icon: StaticIcon = {
        id,
        sourceUrl: new URL('test://icons/icon1.png'),
        registeredTimestamp: Date.now()
      }
      const appReq: GetStaticIconRequest = createAppRequest({ iconRef: { id }})
      appReqFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getIcon(Arg.all()).resolves(AppResponse.success(icon))
      const res = await client.get(`${root}/${id}`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(iconJson(icon))
      appReqFactory.received(1).createRequest(Arg.any(), Arg.deepEquals({ iconRef: { id }}))
      appReqFactory.received(1).createRequest(Arg.all())
      appLayer.received(1).getIcon(Arg.requestTokenMatches(appReq))
      appLayer.received(1).getIcon(Arg.all())
    })

    it('responds with 404 if the icon does not exist', async function() {

      const id = uniqid()
      const appReq: GetStaticIconRequest = createAppRequest({ iconRef: { id }})
      appReqFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getIcon(Arg.all()).resolves(AppResponse.error(entityNotFound(id, 'StaticIcon')))
      const res = await client.get(`${root}/${id}`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.equal(`icon not found: ${id}`)
      appReqFactory.received(1).createRequest(Arg.any(), Arg.deepEquals({ iconRef: { id }}))
      appReqFactory.received(1).createRequest(Arg.all())
      appLayer.received(1).getIcon(Arg.requestTokenMatches(appReq))
      appLayer.received(1).getIcon(Arg.all())
    })
  })

  describe('GET /:iconId/content', function() {

    it('gets the content for the icon id in the path', async function() {

      const icon: StaticIcon = {
        id: uniqid(),
        sourceUrl: new URL('test:///get_content.png'),
        registeredTimestamp: Date.now(),
        mediaType: 'image/png'
      }
      const appReq: GetStaticIconContentRequest = createAppRequest({ iconId: icon.id })
      appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id })).returns(appReq)
      const iconBytes = Readable.from('1234567890')
      appLayer.getIconContent(Arg.all()).resolves(AppResponse.success({ iconInfo: icon, iconContent: iconBytes }))
      const res = await client.get(`${root}/${icon.id}/content`)

      expect(res.status).to.equal(200)
      const body = res.body as Buffer
      expect(body.toString('utf-8')).to.equal('1234567890')
      appReqFactory.received(1).createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id }))
      appLayer.received(1).getIconContent(Arg.requestTokenMatches(appReq))
    })

    it('sets the response content type from the icon meta-data', async function() {

      const icon: StaticIcon = {
        id: uniqid(),
        sourceUrl: new URL('test:///get_content.png'),
        registeredTimestamp: Date.now(),
        mediaType: 'image/test-type'
      }
      const appReq: GetStaticIconContentRequest = createAppRequest({ iconId: icon.id })
      appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id })).returns(appReq)
      const iconBytes = Readable.from('1234567890')
      appLayer.getIconContent(Arg.all()).resolves(AppResponse.success({ iconInfo: icon, iconContent: iconBytes }))
      const res = await client.get(`${root}/${icon.id}/content`)

      expect(res.status).to.equal(200)
      expect(res.type).to.equal('image/test-type')
    })

    xit('sets the response content length to the size of the content stream', async function() {

      /*
      this might be unnecessary for GET, but for HEAD should return the size
      in bytes from the icon db record
      */

      const icon: StaticIcon = {
        id: uniqid(),
        sourceUrl: new URL('test:///get_content.png'),
        registeredTimestamp: Date.now(),
        mediaType: 'image/test-type',
        sizeBytes: 100
      }
      const appReq: GetStaticIconContentRequest = createAppRequest({ iconId: icon.id })
      appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id })).returns(appReq)
      const iconBytes = Readable.from('1234567890')
      appLayer.getIconContent(Arg.all()).resolves(AppResponse.success({ iconInfo: icon, iconContent: iconBytes }))
      const res = await client.get(`${root}/${icon.id}/content`)

      expect(res.status).to.equal(200)
      expect(res.header['content-length']).to.equal(iconBytes.readableLength)
    })

    xdescribe('caching behavior', function() {

      it('sets cache control header with max age', async function() {

        const icon: StaticIcon = {
          id: uniqid(),
          sourceUrl: new URL('test:///get_content.png'),
          registeredTimestamp: Date.now(),
          mediaType: 'image/test-type',
          contentHash: uniqid()
        }
        const appReq: GetStaticIconContentRequest = createAppRequest({ iconId: icon.id })
        appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id })).returns(appReq)
        const iconBytes = Readable.from('1234567890')
        appLayer.getIconContent(Arg.all()).resolves(AppResponse.success({ iconInfo: icon, iconContent: iconBytes }))
        const res = await client.get(`${root}/${icon.id}/content`)

        const oneYearInSeconds = 365 * 24 * 60 * 60
        expect(res.status).to.equal(200)
        expect(res.header).to.haveOwnProperty('cache-control', `private; max-age=${oneYearInSeconds}`)
        expect(res.header).to.have.ownProperty('etag')
      })

      it('uses the icon content hash for etag when available', async function() {

        const icon: StaticIcon = {
          id: uniqid(),
          sourceUrl: new URL('test:///get_content.png'),
          registeredTimestamp: Date.now(),
          mediaType: 'image/test-type',
          contentHash: uniqid()
        }
        const appReq: GetStaticIconContentRequest = createAppRequest({ iconId: icon.id })
        appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id })).returns(appReq)
        const iconBytes = Readable.from('1234567890')
        appLayer.getIconContent(Arg.all()).resolves(AppResponse.success({ iconInfo: icon, iconContent: iconBytes }))
        const res = await client.get(`${root}/${icon.id}/content`)

        expect(res.status).to.equal(200)
        expect(res.header).to.haveOwnProperty('etag', `${icon.id}.${icon.contentHash}`)

        expect.fail('todo: need app layer support')
      })

      it('uses resolved timestamp for etag when content hash is not available', async function() {

        const icon: StaticIcon = {
          id: uniqid(),
          sourceUrl: new URL('test:///get_content.png'),
          registeredTimestamp: Date.now(),
          mediaType: 'image/test-type',
          resolvedTimestamp: Date.now(),
        }
        const appReq: GetStaticIconContentRequest = createAppRequest({ iconId: icon.id })
        appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id })).returns(appReq)
        const iconBytes = Readable.from('1234567890')
        appLayer.getIconContent(Arg.all()).resolves(AppResponse.success({ iconInfo: icon, iconContent: iconBytes }))
        const res = await client.get(`${root}/${icon.id}/content`)

        expect(res.status).to.equal(200)
        expect(res.header).to.haveOwnProperty('etag', `${icon.id}.${icon.resolvedTimestamp}`)

        expect.fail('todo: need app layer support')
      })

      it('supports if-none-match conditional request with content hash', async function() {

        const icon: StaticIcon = {
          id: uniqid(),
          sourceUrl: new URL('test:///get_content.png'),
          registeredTimestamp: Date.now(),
          mediaType: 'image/test-type',
          contentHash: uniqid(),
          resolvedTimestamp: Date.now()
        }
        const appReq: GetStaticIconContentRequest = createAppRequest({ iconId: icon.id })
        appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id })).returns(appReq)
        const iconBytes = Readable.from('1234567890')
        appLayer.getIconContent(Arg.all()).resolves(AppResponse.success({ iconInfo: icon, iconContent: iconBytes }))
        const res = await client.get(`${root}/${icon.id}/content`).set('if-none-match', `${icon.id}.${icon.contentHash}`)

        expect(res.status).to.equal(304)
        expect(res.noContent).to.be.true
        expect(res.header).to.haveOwnProperty('etag', `${icon.id}.${icon.contentHash}`)

        expect.fail('todo: need app layer support')
      })

      it('supports if-none-match conditional request with resolved timestamp', async function() {

        const icon: StaticIcon = {
          id: uniqid(),
          sourceUrl: new URL('test:///get_content.png'),
          registeredTimestamp: Date.now(),
          mediaType: 'image/test-type',
          contentHash: uniqid(),
          resolvedTimestamp: Date.now()
        }
        const appReq: GetStaticIconContentRequest = createAppRequest({ iconId: icon.id })
        appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId: icon.id })).returns(appReq)
        const iconBytes = Readable.from('1234567890')
        appLayer.getIconContent(Arg.all()).resolves(AppResponse.success({ iconInfo: icon, iconContent: iconBytes }))
        const res = await client.get(`${root}/${icon.id}/content`).set('if-none-match', `${icon.id}.${icon.resolvedTimestamp}`)

        expect(res.status).to.equal(304)
        expect(res.noContent).to.be.true
        expect(res.header).to.haveOwnProperty('etag', `${icon.id}.${icon.resolvedTimestamp}`)

        expect.fail('todo: need app layer support')
      })
    })

    it('responds with 404 if the icon does not exist', async function() {

      const iconId = 'not_there'
      const appReq: GetStaticIconContentRequest = createAppRequest({ iconId })
      appReqFactory.createRequest(Arg.any(), Arg.deepEquals({ iconId })).returns(appReq)
      appLayer.getIconContent(Arg.all()).resolves(AppResponse.error(entityNotFound(iconId, 'StaticIcon')))
      const res = await client.get(`${root}/${iconId}/content`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: `StaticIcon not found: ${iconId}` })
    })
  })

  describe('GET /', function() {

    describe('with source url query parameter', function() {

      it('fetches a single icon by source url', async function() {

        const id = uniqid()
        const icon: StaticIcon = {
          id,
          sourceUrl: new URL('test://icons/icon1.png'),
          registeredTimestamp: Date.now()
        }
        const appReq: GetStaticIconRequest = createAppRequest({ iconRef: { sourceUrl: icon.sourceUrl }})
        appReqFactory.createRequest(Arg.all()).returns(appReq)
        appLayer.getIcon(Arg.all()).resolves(AppResponse.success(icon))
        const res = await client.get(`${root}`).query({ source_url: String(icon.sourceUrl) })

        expect(res.status).to.equal(200)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal(iconJson(icon))
        appReqFactory.received(1).createRequest(Arg.any(), Arg.deepEquals({ iconRef: { sourceUrl: icon.sourceUrl }}))
        appReqFactory.received(1).createRequest(Arg.all())
        appLayer.received(1).getIcon(Arg.requestTokenMatches(appReq))
        appLayer.received(1).getIcon(Arg.all())
      })

      it('decodes the source url parameter', async function() {

        const id = uniqid()
        const icon: StaticIcon = {
          id,
          sourceUrl: new URL('test://icons?type=png&tags=[test,decode]'),
          registeredTimestamp: Date.now()
        }
        const appReq: GetStaticIconRequest = createAppRequest({ iconRef: { sourceUrl: icon.sourceUrl }})
        appReqFactory.createRequest(Arg.all()).returns(appReq)
        appLayer.getIcon(Arg.all()).resolves(AppResponse.success(icon))
        const encodedUrl = encodeURIComponent(icon.sourceUrl.toString())
        const res = await client.get(`${root}?source_url=${encodedUrl}`)

        expect(res.status).to.equal(200)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal(iconJson(icon))
        appReqFactory.received(1).createRequest(Arg.any(), Arg.deepEquals({ iconRef: { sourceUrl: icon.sourceUrl }}))
        appReqFactory.received(1).createRequest(Arg.all())
        appLayer.received(1).getIcon(Arg.requestTokenMatches(appReq))
        appLayer.received(1).getIcon(Arg.all())
      })

      it('returns 400 if the source url is invalid', async function() {

        appReqFactory.createRequest(Arg.all()).throws(new Error())
        appLayer.getIcon(Arg.all()).throws(new Error())

        const res = await client.get(`${root}`).query({ source_url: 'not-a-url' })

        expect(res.status).to.equal(400)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.equal('invalid icon source url: not-a-url')
        appReqFactory.didNotReceive().createRequest(Arg.all())
        appLayer.didNotReceive().getIcon(Arg.all())
      })
    })

    describe('without source url parameter', function() {

      it('lists static icons', async function() {

        const icons: StaticIcon[] = [
          {
            id: 'icon1',
            sourceUrl: new URL('test://icons/1'),
            registeredTimestamp: Date.now()
          },
          {
            id: 'icon2',
            sourceUrl: new URL('test://icons/2'),
            registeredTimestamp: Date.now()
          }
        ]
        const page: PageOf<StaticIcon> = {
          pageIndex: 0,
          pageSize: 10,
          totalCount: 2,
          items: icons
        }
        const appReq: ListStaticIconsRequest = createAppRequest({})
        appReqFactory.createRequest(Arg.all()).returns(appReq)
        appLayer.listIcons(Arg.all()).resolves(AppResponse.success(page))
        const res = await client.get(`${root}`)

        expect(res.status).to.equal(200)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal({ ...page, items: icons.map(iconJson)})
        appLayer.received(1).listIcons(Arg.requestTokenMatches(appReq))
        appLayer.received(1).listIcons(Arg.all())
        appLayer.didNotReceive().getIcon(Arg.all())
      })

      it('applies search text', async function() {

        const icons: StaticIcon[] = [
          {
            id: 'best',
            sourceUrl: new URL('test://icons/best.png'),
            registeredTimestamp: Date.now()
          }
        ]
        const page: PageOf<StaticIcon> = {
          pageIndex: 0, pageSize: 10, totalCount: 1,
          items: icons
        }
        const appReq: ListStaticIconsRequest = createAppRequest({ searchText: 'best icons' })
        appReqFactory.createRequest(Arg.all()).returns(appReq)
        appLayer.listIcons(Arg.all()).resolves(AppResponse.success(page))
        const res = await client.get(`${root}`).query({ search: 'best icons' })

        expect(res.status).to.equal(200)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal({ ...page, items: icons.map(iconJson)})
        appReqFactory.received(1).createRequest(Arg.any(), Arg.deepEquals({ searchText: 'best icons' }))
        appLayer.received(1).listIcons(Arg.requestTokenMatches(appReq))
        appLayer.received(1).listIcons(Arg.all())
        appLayer.didNotReceive().getIcon(Arg.all())
      })

      it('applies paging parameters', async function() {

        const icons: StaticIcon[] = [
          {
            id: 'best1',
            sourceUrl: new URL('test://icons/best1.png'),
            registeredTimestamp: Date.now()
          },
          {
            id: 'best2',
            sourceUrl: new URL('test://icons/best2.png'),
            registeredTimestamp: Date.now()
          }
        ]
        const page: PageOf<StaticIcon> = {
          pageIndex: 3, pageSize: 2, totalCount: null,
          items: icons
        }
        const appReq: ListStaticIconsRequest = createAppRequest({ paging: { pageSize: 2, pageIndex: 3 } })
        appReqFactory.createRequest(Arg.all()).returns(appReq)
        appLayer.listIcons(Arg.all()).resolves(AppResponse.success(page))
        const res = await client.get(`${root}`).query({ page_size: 2, page: 3 })

        expect(res.status).to.equal(200)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal({ ...page, items: icons.map(iconJson)})
        appReqFactory.received(1).createRequest(Arg.any(), Arg.deepEquals({ paging: appReq.paging }))
        appLayer.received(1).listIcons(Arg.requestTokenMatches(appReq))
        appLayer.received(1).listIcons(Arg.all())
        appLayer.didNotReceive().getIcon(Arg.all())
      })

      it('applies search text and paging parameters', async function() {

        const icons: StaticIcon[] = [
          {
            id: 'best1',
            sourceUrl: new URL('test://icons/best1.png'),
            registeredTimestamp: Date.now()
          },
          {
            id: 'best2',
            sourceUrl: new URL('test://icons/best2.png'),
            registeredTimestamp: Date.now()
          }
        ]
        const page: PageOf<StaticIcon> = {
          pageIndex: 3, pageSize: 2, totalCount: null,
          items: icons
        }
        const appReq: ListStaticIconsRequest = createAppRequest({
          paging: { pageSize: 2, pageIndex: 3 },
          searchText: 'best icons'
        })
        appReqFactory.createRequest(Arg.all()).returns(appReq)
        appLayer.listIcons(Arg.all()).resolves(AppResponse.success(page))
        const res = await client.get(`${root}`).query({ page_size: 2, page: 3, search: 'best icons' })

        expect(res.status).to.equal(200)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal({ ...page, items: icons.map(iconJson)})
        appReqFactory.received(1).createRequest(Arg.any(), Arg.deepEquals({ paging: appReq.paging, searchText: appReq.searchText }))
        appLayer.received(1).listIcons(Arg.requestTokenMatches(appReq))
        appLayer.received(1).listIcons(Arg.all())
        appLayer.didNotReceive().getIcon(Arg.all())
      })
    })
  })

  xdescribe('POST /', function() {

    it('should register an icon', async function() {
      expect.fail('todo')
    })
  })
})