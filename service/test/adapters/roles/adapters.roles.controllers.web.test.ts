import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { entityNotFound, permissionDenied } from '../../../lib/app.api/app.api.errors'
import {
  RoleAppLayer,
  RoleRoutes,
} from '../../../lib/adapters/roles/adapters.roles.controllers.web'
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web'
import { RoleRequest } from '../../../lib/app.api/roles/app.api.roles'
import { Role } from '../../../lib/entities/authorization/entities.authorization'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'

const root = '/test/roles'
const jsonMimeType = /^application\/json/

const principal = { id: 'user1', username: 'testuser' } as unknown as UserWithRole

type AppRequestFactoryHandle = { createAppRequest: WebAppRequestFactory<RoleRequest> }

const stubAppRequestFactory: WebAppRequestFactory<RoleRequest> =<P extends object>(_req: express.Request, params?: P): P & RoleRequest => {
  return {
    context: {
      requestToken: Symbol(),
      requestingPrincipal: () => principal,
      locale: () => null,
    },
    ...(params || {} as any),
  }
}

function makeRole(overrides?: Partial<Role>): Role {
  return {
    id: 'role1',
    name: 'TEST_ROLE',
    permissions: ['READ_ROLE'],
    ...overrides,
  }
}

describe('roles web controller', function() {

  let appLayer: SubstituteOf<RoleAppLayer>
  let appReqFactory: SubstituteOf<AppRequestFactoryHandle>
  let client: supertest.SuperTest<supertest.Test>

  beforeEach(function() {
    appLayer = Sub.for<RoleAppLayer>()
    appReqFactory = Sub.for<AppRequestFactoryHandle>()
    appReqFactory.createAppRequest(Arg.all()).mimicks(stubAppRequestFactory)

    const app = express().use(express.json())
    app.use(root, RoleRoutes(appLayer, appReqFactory.createAppRequest))
    client = supertest(app)
  })

  describe('GET / - readRoles', function() {

    it('returns 200 with array of roles', async function() {
      appLayer.readRoles(Arg.all()).resolves(AppResponse.success([makeRole()]))

      const res = await client.get(root)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.be.an('array').with.length(1)
    })

    it('returns 403 on permission denied', async function() {
      appLayer.readRoles(Arg.all()).resolves(AppResponse.error(permissionDenied('READ_ROLE', principal.id)))

      const res = await client.get(root)

      expect(res.status).to.equal(403)
    })
  })

  describe('GET /:roleId - readRole', function() {

    it('returns 200 with the role', async function() {
      const role = makeRole()
      appLayer.readRole(Arg.all()).resolves(AppResponse.success(role))

      const res = await client.get(`${root}/${role.id}`)

      expect(res.status).to.equal(200)
      expect(res.body.id).to.equal(role.id)
    })

    it('returns 404 when the role does not exist', async function() {
      appLayer.readRole(Arg.all()).resolves(AppResponse.error(entityNotFound('missing', 'Role')))

      const res = await client.get(`${root}/missing`)

      expect(res.status).to.equal(404)
    })
  })

  describe('POST / - createRole', function() {

    it('returns 200 with the created role', async function() {
      const role = makeRole()
      appLayer.createRole(Arg.all()).resolves(AppResponse.success(role))

      const res = await client.post(root).send({ name: 'TEST_ROLE', permissions: ['READ_ROLE'] })

      expect(res.status).to.equal(200)
      expect(res.body.name).to.equal('TEST_ROLE')
    })

    it('returns 400 when name is missing', async function() {
      const res = await client.post(root).send({ permissions: ['READ_ROLE'] })

      expect(res.status).to.equal(400)
      appLayer.didNotReceive().createRole(Arg.any())
    })

    it('parses comma-separated permissions string into an array', async function() {
      appLayer.createRole(Arg.all()).resolves(AppResponse.success(makeRole()))

      await client.post(root).send({ name: 'TEST_ROLE', permissions: 'READ_ROLE,UPDATE_ROLE' })

      appLayer.received(1).createRole(Arg.is(req => {
        expect(req.role.permissions).to.deep.equal(['READ_ROLE', 'UPDATE_ROLE'])
        return true
      }))
    })
  })

  describe('PUT /:roleId - updateRole', function() {

    it('returns 200 with the updated role', async function() {
      const role = makeRole({ name: 'RENAMED' })
      appLayer.updateRole(Arg.all()).resolves(AppResponse.success(role))

      const res = await client.put(`${root}/role1`).send({ name: 'RENAMED' })

      expect(res.status).to.equal(200)
      expect(res.body.name).to.equal('RENAMED')
    })

    it('returns 404 when the role does not exist', async function() {
      appLayer.updateRole(Arg.all()).resolves(AppResponse.error(entityNotFound('missing', 'Role')))

      const res = await client.put(`${root}/missing`).send({ name: 'X' })

      expect(res.status).to.equal(404)
    })
  })

  describe('DELETE /:roleId - deleteRole', function() {

    it('returns 200 with the deleted role', async function() {
      const role = makeRole()
      appLayer.deleteRole(Arg.all()).resolves(AppResponse.success(role))

      const res = await client.delete(`${root}/${role.id}`)

      expect(res.status).to.equal(200)
      expect(res.body.id).to.equal(role.id)
    })

    it('returns 403 on permission denied', async function() {
      appLayer.deleteRole(Arg.all()).resolves(AppResponse.error(permissionDenied('DELETE_ROLE', principal.id)))

      const res = await client.delete(`${root}/role1`)

      expect(res.status).to.equal(403)
    })
  })
})
