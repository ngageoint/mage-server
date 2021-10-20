import { describe, it, beforeEach } from 'mocha'
import request from 'supertest'
import { expect } from 'chai'
import express from 'express'

xdescribe('plugins routes', function() {

  let app: express.Application

  beforeEach(async function() {
    app = express()
  })

  describe('/plugins path', function() {

    describe('GET', function() {

      it('returns an array of plugin descriptors', async function() {

        const res: request.Response = await request(app).get('/plugins')

        expect(res.status).to.equal(200)
        expect(res.type).to.match(/application\/json/)
        const body = res.body as object[]
        expect(body).to.be('array')
        expect(body).to.deep.equal([
          {
            pluginId: 'dopey',
            displayName: 'Dopey',
            summary: 'Not the sharpest',
            enabled: true,
          },
          {
            pluginId: 'sneezy',
            displayName: 'Sneezy',
            summary: 'Cover your mouth',
            enabled: true,
          }
        ])
      })
    })
  })
})