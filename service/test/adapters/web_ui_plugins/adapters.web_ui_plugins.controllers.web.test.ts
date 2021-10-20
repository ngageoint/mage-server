import path from 'path'
import { expect } from 'chai'
import express from 'express'
import supertest from 'supertest'
import { WebUIPluginRoutes } from '../../../lib/adapters/web_ui_plugins/adapters.web_ui_plugins.controllers.web'

const jsonType = /application\/json/
const searchPath = path.resolve(__dirname, '..', '..', 'node_modules', 'adapters.web_ui_plugins.controllers.web.test')

describe('web ui plugins web controller', function() {

  const prefix = '/test/web_ui_plugins'
  const pluginModuleNames = [
    'main-file-plugin',
    'index-plugin',
    'nest/ed/plug/in',
  ]
  let client: supertest.SuperTest<supertest.Test>

  beforeEach(function() {

    const controller = WebUIPluginRoutes(pluginModuleNames, [ searchPath ])
    const endpoint = express()
    endpoint.use(prefix, controller)
    client = supertest(endpoint)
  })

  describe('plugin module with package main file', function() {

    const base = `${prefix}/main-file-plugin`

    it('loads the default file', async function() {

      const res = await client.get(base)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonType)
      expect(res.body).to.deep.equal(require(`${searchPath}/node_modules/main-file-plugin`))
    })

    it('loads the default file with trailing slash', async function() {

      const res = await client.get(`${base}/`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonType)
      expect(res.body).to.deep.equal(require(`${searchPath}/node_modules/main-file-plugin`))
    })

    it('loads plugin child resources', async function() {

      const res = await client.get(`${base}/assets/hello.txt`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(/text/)
      expect(res.text).to.equal('hello')
    })
  })

  describe('plugin module with index file', function() {

    const base = `${prefix}/index-plugin`

    it('loads the default file', async function() {

      const res = await client.get(base)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonType)
      expect(res.body).to.deep.equal(require(`${searchPath}/node_modules/index-plugin`))
    })

    it('loads the default file with trailing slash', async function() {

      const res = await client.get(`${base}/`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonType)
      expect(res.body).to.deep.equal(require(`${searchPath}/node_modules/index-plugin`))
    })

    it('loads plugin child resources', async function() {

      const res = await client.get(`${base}/assets/hello.txt`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(/text/)
      expect(res.text).to.equal('hello')
    })
  })

  describe('nested plugin module', function() {

    const base = `${prefix}/nest/ed/plug/in`

    it('loads the default file', async function() {

      const res = await client.get(base)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonType)
      expect(res.body).to.deep.equal(require(`${searchPath}/node_modules/nest/ed/plug/in`))
    })

    it('loads the default file with trailing slash', async function() {

      const res = await client.get(`${base}/`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonType)
      expect(res.body).to.deep.equal(require(`${searchPath}/node_modules/nest/ed/plug/in`))
    })

    it('loads plugin child resources', async function() {

      const res = await client.get(`${base}/assets/hello.txt`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(/text/)
      expect(res.text).to.equal('hello')
    })
  })
})