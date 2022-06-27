import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { ObservationPermissionsServiceImpl } from '../../lib/permissions/permissions.observations'
import { ObservationRequestContext } from '../../lib/app.api/observations/app.api.observations'
import { copyMageEventAttrs, EventAccessType, MageEvent } from '../../lib/entities/events/entities.events'
import { Attachment, copyObservationAttrs, EventScopedObservationRepository, Observation, ObservationAttrs } from '../../lib/entities/observations/entities.observations'
import { EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'
import { expect } from 'chai'
import { ObservationPermission } from '../../lib/entities/authorization/entities.permissions'
import { ErrPermissionDenied, MageError, PermissionDeniedError } from '../../lib/app.api/app.api.errors'
import uniqid from 'uniqid'
import { FormFieldType } from '../../lib/entities/events/entities.events.forms'

describe('observation permissions service', function() {

  let permissions: ObservationPermissionsServiceImpl
  let eventPermissions: SubstituteOf<EventPermissionServiceImpl>
  let mageEvent: MageEvent
  let obsRepo: SubstituteOf<EventScopedObservationRepository>
  let user: UserWithRole
  let context: ObservationRequestContext<UserWithRole>

  beforeEach(function() {

    eventPermissions = Sub.for<EventPermissionServiceImpl>()
    permissions = new ObservationPermissionsServiceImpl(eventPermissions)
    mageEvent = new MageEvent({
      id: 357,
      name: 'Obsevation Permissions Tests',
      forms: [],
      layerIds: [],
      feedIds: [],
      acl: {},
      style: {}
    })
    obsRepo = Sub.for<EventScopedObservationRepository>()
    user = {
      id: uniqid(),
      roleId: {
        id: uniqid(),
        name: 'Role 1',
        permissions: []
      } as any
    } as any
    context = {
      mageEvent,
      userId: uniqid(),
      deviceId: uniqid(),
      observationRepository: obsRepo,
      requestToken: Symbol(),
      requestingPrincipal() { return user },
      locale() { return null }
    }
  })

  describe('create permission', function() {

    it('grants when the user role has create permission and the user is a participant of the event', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
      user.roleId.permissions = [ ObservationPermission.CREATE_OBSERVATION ]
      const denied = await permissions.ensureCreateObservationPermission(context)

      expect(denied).to.be.null
    })

    it('denies when the context user is not an event participant', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(false)
      user.roleId.permissions = [ ObservationPermission.CREATE_OBSERVATION ]
      const denied = await permissions.ensureCreateObservationPermission(context) as PermissionDeniedError

      expect(denied).to.be.instanceOf(MageError)
      expect(denied.code).to.equal(ErrPermissionDenied)
    })

    it('denies when the context user role does not include create permission', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
      user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_ALL, ObservationPermission.UPDATE_OBSERVATION_EVENT ]
      const denied = await permissions.ensureCreateObservationPermission(context) as PermissionDeniedError

      expect(denied).to.be.instanceOf(MageError)
      expect(denied.code).to.equal(ErrPermissionDenied)
    })
  })

  describe('update permission', function() {

    it('grants when the context user role has permission to update all observations regardless of event scope', async function() {

      user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_ALL ]
      const denied = await permissions.ensureUpdateObservationPermission(context)

      expect(denied).to.be.null
    })

    it('grants when the context user role has event participant update permission and read access for the context event', async function() {

      user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_EVENT ]
      eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read).resolves(true)
      const denied = await permissions.ensureUpdateObservationPermission(context)

      eventPermissions.received(1).userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read)
    })

    describe('denies', function() {

      const denyTests: [ testName: string, setupContext: () => any ][] = [
        [ 'with empty permissions', () => void(0) ],
        [
          'with participant update permission but without event read access',
          () => {
            user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_EVENT ]
            eventPermissions.userHasEventPermission(Arg.all()).resolves(false)
          }
        ],
        [
          'with event read access but without participant update permission',
          () => {
            user.roleId.permissions = []
            eventPermissions.userHasEventPermission(Arg.all()).resolves(true)
          }
        ]
      ]
      denyTests.forEach(([ testName, setupContext ]) => {
        it(testName, async function() {
          setupContext()
          const denied = await permissions.ensureUpdateObservationPermission(context)
          expect(denied).to.be.instanceOf(MageError)
          expect(denied?.code).to.equal(ErrPermissionDenied)
          expect(denied?.data.permission).to.equal('UPDATE_OBSERVATION')
        })
      })
    })

    it('denies in all other cases', async function() {

      let denied = await permissions.ensureUpdateObservationPermission(context)

      expect(denied).to.be.instanceOf(MageError)
      expect(denied?.code).to.equal(ErrPermissionDenied)
      expect(denied?.data.permission).to.equal('UPDATE_OBSERVATION')
    })
  })

  describe('read permission', function() {

    it('grants when the context user role has permission to read all observations globally', async function() {

      user.roleId.permissions = [ ObservationPermission.READ_OBSERVATION_ALL ]
      const denied = await permissions.ensureReadObservationPermission(context)

      expect(denied).to.be.null
    })

    it('grants when the context user role has event event-scoped read permission and the event acl has an entry for the user', async function() {

      user.roleId.permissions = [ ObservationPermission.READ_OBSERVATION_EVENT ]
      eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read).resolves(true)
      const denied = await permissions.ensureReadObservationPermission(context)

      expect(denied).to.be.null
    })

    describe('denies', function() {

      const denyTests: [ testName: string, setupContext: () => any ][] = [
        [ 'with empty permissions', () => void(0) ],
        [
          'with participant read permission but without event read access',
          () => {
            user.roleId.permissions = [ ObservationPermission.READ_OBSERVATION_EVENT ]
            eventPermissions.userHasEventPermission(Arg.all()).resolves(false)
          }
        ],
        [
          'with event read access but without participant read permission',
          () => {
            user.roleId.permissions = []
            eventPermissions.userHasEventPermission(Arg.all()).resolves(true)
          }
        ]
      ]
      denyTests.forEach(([ testName, setupContext ]) => {
        it(testName, async function() {
          setupContext()
          const denied = await permissions.ensureReadObservationPermission(context)
          expect(denied).to.be.instanceOf(MageError)
          expect(denied?.code).to.equal(ErrPermissionDenied)
          expect(denied?.data.permission).to.equal('READ_OBSERVATION')
        })
      })
    })
  })

  describe('store attachment content permission', function() {

    let observation: Observation
    let attachment: Attachment

    beforeEach(function() {

      mageEvent = new MageEvent({
        ...copyMageEventAttrs(mageEvent),
        forms: [
          {
            id: 1,
            name: 'Permissions Test',
            archived: false,
            color: '#ccc222',
            userFields: [],
            fields: [
              {
                id: 1,
                name: 'attachments',
                title: 'Attachments',
                required: false,
                type: FormFieldType.Attachment
              }
            ],
          }
        ]
      })
      context.mageEvent = mageEvent
      const attrs: ObservationAttrs = {
        id: uniqid(),
        eventId: mageEvent.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 20),
        lastModified: new Date(Date.now() - 1000 * 60 * 20),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 34, 56 ] },
        properties: {
          timestamp: new Date(Date.now() - 1000 * 60 * 25),
          forms: [
            { id: uniqid(), formId: 1 }
          ]
        },
        states: [],
        favoriteUserIds: [],
        attachments: []
      }
      attachment = {
        id: uniqid(),
        observationFormId: attrs.properties.forms[0].id,
        fieldName: 'attachments',
        name: 'photo1.jpg',
        oriented: false,
        thumbnails: [],
      }
      attrs.attachments = [ attachment ]
      observation = Observation.evaluate(attrs, mageEvent)
    })

    describe('for attachments without existing content', async function() {

      it('grants if the context user has permission to update all observations', async function() {

        user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_ALL ]
        const denied = await permissions.ensureStoreAttachmentContentPermission(context, observation, attachment.id)

        expect(denied).to.be.null
      })

      it('grants if the context user has event participant permission to update observations', async function() {

        user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_EVENT ]
        eventPermissions.userIsParticipantInEvent(context.mageEvent, user.id).resolves(true)
        eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read).resolves(true)
        const denied = await permissions.ensureStoreAttachmentContentPermission(context, observation, attachment.id)

        expect(denied).to.be.null
        eventPermissions.received(1).userHasEventPermission(Arg.all())
        eventPermissions.received(1).userHasEventPermission(mageEvent, user.id, EventAccessType.Read)
      })

      it('grants if the context user has permission to create observations and is the creator of the observation', async function() {

        user.roleId.permissions = [ ObservationPermission.CREATE_OBSERVATION ]
        eventPermissions.userIsParticipantInEvent(mageEvent, user.id).resolves(true)
        observation = Observation.evaluate({
          ...copyObservationAttrs(observation),
          userId: user.id
        }, mageEvent)
        const denied = await permissions.ensureStoreAttachmentContentPermission(context, observation, attachment.id)

        expect(denied).to.be.null
      })

      it('denies when the context user has create permission but is not the observation creator', async function() {

        user.roleId.permissions = [ ObservationPermission.CREATE_OBSERVATION ]
        eventPermissions.userIsParticipantInEvent(mageEvent, user.id).resolves(true)
        observation = Observation.evaluate({
          ...copyObservationAttrs(observation),
          userId: uniqid(),
        }, mageEvent)
        const denied = await permissions.ensureStoreAttachmentContentPermission(context, observation, attachment.id)

        expect(denied).to.be.instanceOf(MageError)
        expect(denied?.code).to.equal(ErrPermissionDenied)
        expect(denied?.data.permission).to.equal('STORE_ATTACHMENT_CONTENT')
        expect(denied?.data.subject).to.equal(user.id)
        expect(denied?.data.object).to.equal(`observation ${observation.id}, attachment ${attachment.id}`)
        eventPermissions.didNotReceive().userIsParticipantInEvent(Arg.all())
        eventPermissions.didNotReceive().userHasEventPermission(Arg.all())
      })
    })

    describe('for attachments with existing content', function() {

      beforeEach(function() {

        attachment.contentLocator = uniqid()
        observation = Observation.evaluate({
          ...copyObservationAttrs(observation),
          attachments: [ attachment ]
        }, mageEvent)
      })

      it('grants if the context user has permission to update all observations', async function() {

        user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_ALL ]
        const denied = await permissions.ensureStoreAttachmentContentPermission(context, observation, attachment.id)

        expect(denied).to.be.null
      })

      it('grants if the context user has event participant permission to update observations', async function() {

        user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_EVENT ]
        eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read).returns(Promise.resolve(true))
        const denied = await permissions.ensureStoreAttachmentContentPermission(context, observation, attachment.id)

        expect(denied).to.be.null
        eventPermissions.received(1).userHasEventPermission(Arg.all())
        eventPermissions.received(1).userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read)
      })

      it('denies when the context user has permission to create observations and is the creator of the observation', async function() {

        user.roleId.permissions = [ ObservationPermission.CREATE_OBSERVATION ]
        eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
        observation = Observation.evaluate({
          ...copyObservationAttrs(observation),
          userId: user.id
        }, mageEvent)
        const denied = await permissions.ensureStoreAttachmentContentPermission(context, observation, attachment.id)

        expect(denied).to.be.instanceOf(MageError)
        expect(denied?.code).to.equal(ErrPermissionDenied)
        expect(denied?.data.permission).to.equal('STORE_ATTACHMENT_CONTENT')
        expect(denied?.data.subject).to.equal(user.id)
        expect(denied?.data.object).to.equal(`observation ${observation.id}, attachment ${attachment.id}`)
        eventPermissions.didNotReceive().userIsParticipantInEvent(Arg.all())
        eventPermissions.didNotReceive().userHasEventPermission(Arg.all())
      })

      it('denies when the context user has event participant permission to update observations but is not a participant', async function() {

        user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_EVENT ]
        eventPermissions.userHasEventPermission(Arg.all()).resolves(false)
        observation = Observation.evaluate({
          ...copyObservationAttrs(observation),
        }, mageEvent)
        const denied = await permissions.ensureStoreAttachmentContentPermission(context, observation, attachment.id)

        expect(denied).to.be.instanceOf(MageError)
        expect(denied?.code).to.equal(ErrPermissionDenied)
        expect(denied?.data.permission).to.equal('STORE_ATTACHMENT_CONTENT')
        expect(denied?.data.subject).to.equal(user.id)
        expect(denied?.data.object).to.equal(`observation ${observation.id}, attachment ${attachment.id}`)
        eventPermissions.received(1).userHasEventPermission(Arg.all())
      })
    })
  })
})