import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { MageEvent, MageEventRepository } from '../../lib/entities/events/entities.events'
import { ensureEventScope, eventScopeKey } from '../../lib/adapters/adapters.controllers.web'

const rootPath = '/test/events'

describe('event scope web middleware', function () {

  let eventRepo: SubstituteOf<MageEventRepository>
  let event: MageEvent
  let scopedEvent: MageEvent | undefined
  let client: supertest.SuperTest<supertest.Test>

  beforeEach(function () {
    event = new MageEvent({
      id: 123,
      name: 'Event Scope Test',
      forms: [],
      layerIds: [],
      feedIds: [],
      acl: {},
      style: {}
    })
    eventRepo = Sub.for<MageEventRepository>()
    scopedEvent = undefined
    const app = express()
    app.use(`${rootPath}/:${eventScopeKey}/things`, [
      ensureEventScope(eventRepo),
      (req: express.Request, res: express.Response) => {
        scopedEvent = req[eventScopeKey]?.mageEvent
        res.sendStatus(200)
      }
    ])
    client = supertest(app)
  })

  it('adds the event from the path to the request', async function () {

    eventRepo.findById(event.id).resolves(event)

    const res = await client.get(`${rootPath}/${event.id}/things`)

    expect(res.status).to.equal(200)
    expect(scopedEvent).to.equal(event)
    eventRepo.received(1).findById(event.id)
  })

  it('fails with 404 when the event does not exist', async function () {

    eventRepo.findById(Arg.any()).resolves(null)

    const res = await client.get(`${rootPath}/${event.id}/things`)

    expect(res.status).to.equal(404)
    expect(scopedEvent).to.be.undefined
  })

  it('fails with 404 without looking up the event when the event id is not a number', async function () {

    const res = await client.get(`${rootPath}/abc/things`)

    expect(res.status).to.equal(404)
    expect(scopedEvent).to.be.undefined
    eventRepo.didNotReceive().findById(Arg.any())
  })
})
