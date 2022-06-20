
import { describe, it } from 'mocha'
import { expect } from 'chai'
import { Substitute as Sub } from '@fluffy-spoon/substitute'
import uniqid from 'uniqid'
import { PreFetchedUserRoleFeedsPermissionService } from '../../lib/permissions/permissions.feeds'
import { AppRequestContext } from '../../lib/app.api/app.api.global'
import { MageError, ErrPermissionDenied } from '../../lib/app.api/app.api.errors'
import { AnyPermission, FeedsPermission } from '../../lib/entities/authorization/entities.permissions'
import { RoleDocument } from '../../src/models/role'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'

describe('feeds permission service', function() {

  const permissions = new PreFetchedUserRoleFeedsPermissionService()

  function contextWithPermissions(...perms: AnyPermission[]): AppRequestContext<UserWithRole> {
    const user = Sub.for<UserWithRole>()
    const role = Sub.for<RoleDocument>()
    user.username.returns!(uniqid())
    user.roleId.returns!(role)
    role.permissions.returns!(perms)
    return {
      requestToken: Symbol(),
      requestingPrincipal() { return user },
      locale() { return null }
    }
  }

  it('ensures list service types permission', async function() {

    let context = contextWithPermissions(FeedsPermission.FEEDS_LIST_SERVICE_TYPES)
    let denied = await permissions.ensureListServiceTypesPermissionFor(context)

    expect(denied).to.be.null

    context = contextWithPermissions(FeedsPermission.FEEDS_CREATE_SERVICE)
    denied = await permissions.ensureListServiceTypesPermissionFor(context)

    expect(denied).to.be.instanceOf(MageError)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    expect(denied?.data.permission).to.equal(FeedsPermission.FEEDS_LIST_SERVICE_TYPES)
    expect(denied?.data.subject).to.equal(context.requestingPrincipal().username)
  })

  it('ensures list services permission', async function() {

    let context = contextWithPermissions(FeedsPermission.FEEDS_LIST_SERVICES)
    let denied = await permissions.ensureListServicesPermissionFor(context)

    expect(denied).to.be.null

    context = contextWithPermissions(FeedsPermission.FEEDS_LIST_SERVICE_TYPES)
    denied = await permissions.ensureListServicesPermissionFor(context)

    expect(denied).to.be.instanceOf(MageError)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    expect(denied?.data.permission).to.equal(FeedsPermission.FEEDS_LIST_SERVICES)
    expect(denied?.data.subject).to.equal(context.requestingPrincipal().username)
  })

  it('ensures create service permission', async function() {

    let context = contextWithPermissions(FeedsPermission.FEEDS_CREATE_SERVICE)
    let denied = await permissions.ensureCreateServicePermissionFor(context)

    expect(denied).to.be.null

    context = contextWithPermissions()
    denied = await permissions.ensureCreateServicePermissionFor(context)

    expect(denied).to.be.instanceOf(MageError)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    expect(denied?.data.permission).to.equal(FeedsPermission.FEEDS_CREATE_SERVICE)
    expect(denied?.data.subject).to.equal(context.requestingPrincipal().username)
  })

  describe('ensuring list topics permission', function() {

    it('ensures permisison with a service id', async function() {

      let context = contextWithPermissions(FeedsPermission.FEEDS_LIST_TOPICS)
      const serviceId = uniqid()
      let denied = await permissions.ensureListTopicsPermissionFor(context, serviceId)

      expect(denied).to.be.null

      context = contextWithPermissions(FeedsPermission.FEEDS_LIST_SERVICE_TYPES)
      denied = await permissions.ensureListTopicsPermissionFor(context, serviceId)

      expect(denied).to.be.instanceOf(MageError)
      expect(denied?.code).to.equal(ErrPermissionDenied)
      expect(denied?.data.permission).to.equal('FEEDS_LIST_TOPICS')
      expect(denied?.data.subject).to.equal(context.requestingPrincipal().username)
    })
  })

  describe('ensuring create feed permission', function() {

    it('ensures permission with a service id', async function() {

      let context = contextWithPermissions(FeedsPermission.FEEDS_CREATE_FEED)
      const serviceId = uniqid()
      let denied = await permissions.ensureCreateFeedPermissionFor(context, serviceId)

      expect(denied).to.be.null

      context = contextWithPermissions(FeedsPermission.FEEDS_LIST_TOPICS)
      denied = await permissions.ensureCreateFeedPermissionFor(context, serviceId)

      expect(denied).to.be.instanceOf(MageError)
      expect(denied?.code).to.equal(ErrPermissionDenied)
      expect(denied?.data.permission).to.equal('FEEDS_CREATE_FEED')
      expect(denied?.data.subject).to.equal(context.requestingPrincipal().username)
    })
  })

  describe('ensuring fetch feed content permission', function() {
    it('always denies', async function() {
      let context = contextWithPermissions(FeedsPermission.FEEDS_FETCH_CONTENT)
      let denied = await permissions.ensureFetchFeedContentPermissionFor(context)

      expect(denied).to.be.instanceOf(MageError)
      expect(denied?.code).to.equal(ErrPermissionDenied)
      expect(denied?.data.permission).to.equal('FEEDS_FETCH_CONTENT')
      expect(denied?.data.subject).to.equal(context.requestingPrincipal().username)
    })
  })
})
