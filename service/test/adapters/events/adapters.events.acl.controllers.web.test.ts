import { beforeEach } from 'mocha'
import express from 'express'
import { expect } from 'chai'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import _ from 'lodash'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web'
import { EventAccessType, EventRole, MageEvent, MageEventRepository } from '../../../lib/entities/events/entities.events'
import { EventAclEntry, EventAclRequest, RemoveEventAclUserRequest, SetEventAclRoleRequest } from '../../../lib/app.api/events/app.api.events.acl'
import { EventAclApp, EventAclRoutes } from '../../../lib/adapters/events/adapters.events.acl.controllers.web'
import { entityNotFound, invalidInput, permissionDenied } from '../../../lib/app.api/app.api.errors'

const rootPath = '/test/events'
const jsonMimeType = /^application\/json/
const testUser = 'lummytin'

describe('event acl web controller', function () {

  const createAppRequest: WebAppRequestFactory<EventAclRequest> = <P>(webReq: express.Request, params?: P): EventAclRequest & P => {
    return {
      context: {
        requestToken: Symbol(),
        requestingPrincipal(): typeof testUser {
          return testUser
        },
        event: (webReq as any).eventEntity
      },
      ...(params || {})
    } as EventAclRequest & P
  }
  const forEvent = (req: EventAclRequest) => req.context.event.id === event.id
  let app: express.Application
  let eventRepo: SubstituteOf<MageEventRepository>
  let eventAclApp: SubstituteOf<EventAclApp>
  let client: supertest.SuperTest<supertest.Test>
  let event: MageEvent
  const entries: EventAclEntry[] = [
    {
      user: { id: 'user1', username: 'user1', displayName: 'User One', email: 'user1@test.mage' },
      role: EventRole.OWNER,
      permissions: [ EventAccessType.Read, EventAccessType.Update, EventAccessType.Delete ]
    }
  ]

  beforeEach(function () {
    event = new MageEvent({
      id: Math.floor(Math.random() * 1000),
      name: 'Test Event',
      forms: [],
      teamIds: [],
      layerIds: [],
      feedIds: [],
      style: {},
      acl: {}
    })
    eventRepo = Sub.for<MageEventRepository>()
    eventRepo.findById(event.id).resolves(event)
    eventAclApp = Sub.for<EventAclApp>()
    eventAclApp.eventRepo.returns!(eventRepo)
    app = express()
    app.use(rootPath, EventAclRoutes(eventAclApp, createAppRequest))
    client = supertest(app)
  })

  describe('GET /events/{eventId}/acl', function () {

    it('returns the acl entries', async function () {

      eventAclApp.listEventAcl(Arg.is(forEvent)).resolves(AppResponse.success(entries))

      const res = await client.get(`${rootPath}/${event.id}/acl`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(entries)
    })

    it('returns 403 without permission', async function () {

      eventAclApp.listEventAcl(Arg.all()).resolves(AppResponse.error(permissionDenied('UPDATE_EVENT', testUser, String(event.id))))

      const res = await client.get(`${rootPath}/${event.id}/acl`)

      expect(res.status).to.equal(403)
    })

    it('returns 404 when the event does not exist', async function () {

      eventRepo.findById(event.id + 1).resolves(null)

      const res = await client.get(`${rootPath}/${event.id + 1}/acl`)

      expect(res.status).to.equal(404)
      eventAclApp.didNotReceive().listEventAcl(Arg.all())
    })
  })

  describe('PUT /events/{eventId}/acl/{userId}', function () {

    it('sets the user role and returns the acl entries', async function () {

      const requestParams: Partial<SetEventAclRoleRequest> = { user: 'user1', role: EventRole.OWNER }
      eventAclApp.setEventAclRole(Arg.is(x => forEvent(x) && _.isMatch(x, requestParams))).resolves(AppResponse.success(entries))

      const res = await client.put(`${rootPath}/${event.id}/acl/user1`).send({ role: EventRole.OWNER })

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal(entries)
      eventAclApp.received(1).setEventAclRole(Arg.is(x => forEvent(x) && _.isMatch(x, requestParams)))
    })

    it('returns 400 for invalid input', async function () {

      eventAclApp.setEventAclRole(Arg.all()).resolves(AppResponse.error(invalidInput('invalid event role', [ 'NOTHING', 'role' ])))

      const res = await client.put(`${rootPath}/${event.id}/acl/user1`).send({ role: 'NOTHING' })

      expect(res.status).to.equal(400)
    })

    it('returns 404 when the user does not exist', async function () {

      eventAclApp.setEventAclRole(Arg.all()).resolves(AppResponse.error(entityNotFound('nobody', 'User')))

      const res = await client.put(`${rootPath}/${event.id}/acl/nobody`).send({ role: EventRole.GUEST })

      expect(res.status).to.equal(404)
    })
  })

  describe('DELETE /events/{eventId}/acl/{userId}', function () {

    it('removes the user and returns the acl entries', async function () {

      const requestParams: Partial<RemoveEventAclUserRequest> = { user: 'user2' }
      eventAclApp.removeEventAclUser(Arg.is(x => forEvent(x) && _.isMatch(x, requestParams))).resolves(AppResponse.success(entries))

      const res = await client.delete(`${rootPath}/${event.id}/acl/user2`)

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal(entries)
      eventAclApp.received(1).removeEventAclUser(Arg.is(x => forEvent(x) && _.isMatch(x, requestParams)))
    })

    it('returns 400 when removing the last owner', async function () {

      eventAclApp.removeEventAclUser(Arg.all()).resolves(AppResponse.error(invalidInput('the event must have at least one owner', [ 'user1', 'user' ])))

      const res = await client.delete(`${rootPath}/${event.id}/acl/user1`)

      expect(res.status).to.equal(400)
    })
  })
})
