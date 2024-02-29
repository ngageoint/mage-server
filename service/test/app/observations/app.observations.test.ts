import { Substitute as Sub, Arg, SubstituteOf } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import uniqid from 'uniqid'
import * as api from '../../../lib/app.api/observations/app.api.observations'
import { AllocateObservationId, registerDeleteRemovedAttachmentsHandler, ReadAttachmentContent, SaveObservation, StoreAttachmentContent } from '../../../lib/app.impl/observations/app.impl.observations'
import { copyMageEventAttrs, MageEvent } from '../../../lib/entities/events/entities.events'
import { addAttachment, Attachment, AttachmentContentPatchAttrs, AttachmentCreateAttrs, AttachmentsRemovedDomainEvent, AttachmentStore, AttachmentStoreError, AttachmentStoreErrorCode, copyAttachmentAttrs, copyObservationAttrs, copyObservationStateAttrs, EventScopedObservationRepository, Observation, ObservationAttrs, ObservationDomainEventType, ObservationEmitted, ObservationRepositoryError, ObservationRepositoryErrorCode, ObservationState, patchAttachment, putAttachmentThumbnailForMinDimension, removeAttachment, removeFormEntry, StagedAttachmentContentRef } from '../../../lib/entities/observations/entities.observations'
import { permissionDenied, MageError, ErrPermissionDenied, ErrEntityNotFound, EntityNotFoundError, InvalidInputError, ErrInvalidInput, PermissionDeniedError, InfrastructureError, ErrInfrastructure } from '../../../lib/app.api/app.api.errors'
import { FormFieldType } from '../../../lib/entities/events/entities.events.forms'
import _ from 'lodash'
import { User, UserId, UserRepository } from '../../../lib/entities/users/entities.users'
import { pipeline, Readable } from 'stream'
import util from 'util'
import { BufferWriteable } from '../../utils'
import EventEmitter from 'events'

describe('observations use case interactions', function() {

  let mageEvent: MageEvent
  let obsRepo: SubstituteOf<EventScopedObservationRepository>
  let userRepo: SubstituteOf<UserRepository>
  let permissions: SubstituteOf<api.ObservationPermissionService>
  let context: api.ObservationRequestContext
  let principalHandle: SubstituteOf<{ requestingPrincipal(): string }>

  beforeEach(function() {

    mageEvent = new MageEvent({
      id: Date.now(),
      acl: {},
      feedIds: [],
      forms: [],
      layerIds: [],
      name: 'Observation App Layer Tests',
      style: {}
    })
    obsRepo = Sub.for<EventScopedObservationRepository>()
    userRepo = Sub.for<UserRepository>()
    permissions = Sub.for<api.ObservationPermissionService>()
    principalHandle = Sub.for<{ requestingPrincipal(): string }>()
    context = {
      mageEvent,
      userId: uniqid(),
      deviceId: uniqid(),
      observationRepository: obsRepo,
      requestToken: uniqid(),
      requestingPrincipal() { return principalHandle.requestingPrincipal() },
      locale() { return null }
    }
  })

  describe('external view of observation', function() {

    it('omits attachment thumbnails', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        attachments: [
          {
            id: uniqid(),
            observationFormId: uniqid(),
            fieldName: 'field1',
            oriented: false,
            thumbnails: [
              { minDimension: 100 },
              { minDimension: 200 },
            ]
          },
          {
            id: uniqid(),
            observationFormId: uniqid(),
            fieldName: 'field10',
            oriented: false,
            thumbnails: [
              { minDimension: 100 },
              { minDimension: 200 },
            ]
          }
        ]
      }
      const exo = api.exoObservationFor(from)

      expect(exo.attachments).to.have.length(2)
      expect(exo.attachments.map(omitUndefinedFrom)).to.deep.equal([
        {
          id: from.attachments[0].id,
          observationFormId: from.attachments[0].observationFormId,
          fieldName: 'field1',
          oriented: false,
          contentStored: false,
        },
        {
          id: from.attachments[1].id,
          observationFormId: from.attachments[1].observationFormId,
          fieldName: 'field10',
          oriented: false,
          contentStored: false,
        }
      ])
    })

    it('adds populated user display name for creator and important flag', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        userId: uniqid(),
        states: [],
        favoriteUserIds: [],
        important: {
          userId: uniqid(),
          timestamp: new Date(),
          description: 'populate the user',
        },
        attachments: []
      }
      const creator = { id: from.userId!, displayName: 'Creator Test' } as User
      const importantFlagger = { id: from.important?.userId!, displayName: 'Important Flagger Test' } as User
      const exo = api.exoObservationFor(from, { creator, importantFlagger })

      expect(exo.userId).to.equal(from.userId)
      expect(exo.user).to.deep.equal(creator)
      expect(exo.important?.userId).to.equal(from.important?.userId)
      expect(exo.important?.user).to.deep.equal(importantFlagger)
    })

    it('does not populate creator user if the given id does not match', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        userId: uniqid(),
        states: [],
        favoriteUserIds: [],
        attachments: []
      }
      const creator = { id: uniqid(), displayName: 'Creator Mismatch' } as User
      const exo = api.exoObservationFor(from, { creator })

      expect(exo.userId).to.equal(from.userId)
      expect(exo.user).to.be.undefined
    })

    it('does not populate creator user if the observation does not have a creator', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        attachments: []
      }
      const creator = { id: uniqid(), displayName: 'Creator Mismatch' } as User
      const exo = api.exoObservationFor(from, { creator })

      expect(exo.userId).to.be.undefined
      expect(exo.user).to.be.undefined
    })

    it('does not populate important flag user if given id does not match', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        important: {
          userId: uniqid(),
          timestamp: new Date(),
          description: 'populate the user',
        },
        attachments: []
      }
      const importantFlagger = { id: from.important?.userId!, displayName: 'Important Flagger Test' } as User
      const exo = api.exoObservationFor(from, { importantFlagger })

      expect(exo.important?.userId).to.equal(from.important?.userId)
      expect(exo.important?.user).to.deep.equal(importantFlagger)
    })

    it('does not populate important flag user if important flag has no user', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        important: {
          timestamp: new Date(),
          description: 'populate the user',
        },
        attachments: []
      }
      const importantFlagger = { id: uniqid(), displayName: 'Important Flagger Test' } as User
      const exo = api.exoObservationFor(from, { importantFlagger })

      expect(exo.important?.userId).to.be.undefined
      expect(exo.important?.user).to.be.undefined
    })

    it('does not populate important flag user if the observation has no important flag', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        attachments: []
      }
      const importantFlagger = { id: from.important?.userId!, displayName: 'Important Flagger Test' } as User
      const exo = api.exoObservationFor(from, { importantFlagger })

      expect(exo.important).to.be.undefined
    })

    it('maps undefined important flag', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        attachments: []
      }
      const exo = api.exoObservationFor(from)

      expect(exo.important).to.be.undefined
    })

    it('maps only the most recent state', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        attachments: []
      }
      let exo = api.exoObservationFor(from)

      expect(exo).not.to.have.property('states')
      expect(exo.state).to.be.undefined

      const states: ObservationState[] = [
        { id: uniqid(), name: 'archived', userId: uniqid() },
        { id: uniqid(), name: 'active', userId: uniqid() }
      ]
      from.states = states.map(copyObservationStateAttrs)
      exo = api.exoObservationFor(from)

      expect(exo).not.to.have.property('states')
      expect(exo.state).to.deep.equal({ id: states[0].id, name: 'archived', userId: states[0].userId })
    })

    it('sets content stored flag on attachments according to presence of content locator', async function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        attachments: [
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field1', oriented: false, thumbnails: [], contentLocator: void(0) },
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field1', oriented: false, thumbnails: [], contentLocator: 'over there' },
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field1', oriented: false, thumbnails: [] },
        ]
      }
      const exo = api.exoObservationFor(from)

      expect(exo.attachments[0].contentStored).to.be.false
      expect(exo.attachments[1].contentStored).to.be.true
      expect(exo.attachments[2].contentStored).to.be.false
    })

    it('overrides attachment attributes with given thumbnail attributes', async function() {

      const att: Required<Attachment> = {
        id: uniqid(),
        observationFormId: uniqid(),
        fieldName: 'field1',
        contentLocator: uniqid(),
        contentType: 'image/png',
        width: 900,
        height: 1200,
        lastModified: new Date(),
        name: 'rainbow.png',
        oriented: false,
        size: 9879870,
        thumbnails: [
          { minDimension: 200, contentLocator: void(0), size: 2000, contentType: 'image/jpeg', width: 200, height: 300, name: 'rainbow@200.jpg' },
          { minDimension: 300, contentLocator: void(0), size: 3000, contentType: 'image/jpeg', width: 300, height: 400, name: 'rainbow@300.jpg' },
          { minDimension: 400, contentLocator: void(0), size: 4000, contentType: 'image/jpeg', width: 400, height: 500, name: 'rainbow@400.jpg' },
        ]
      }

      expect(api.exoAttachmentForThumbnail(0, att)).to.deep.equal({
        ...api.exoAttachmentFor(att),
        size: 2000,
        width: 200,
        height: 300,
        contentType: 'image/jpeg'
      })
      expect(api.exoAttachmentForThumbnail(1, att)).to.deep.equal({
        ...api.exoAttachmentFor(att),
        size: 3000,
        width: 300,
        height: 400,
        contentType: 'image/jpeg'
      })
      expect(api.exoAttachmentForThumbnail(2, att)).to.deep.equal({
        ...api.exoAttachmentFor(att),
        size: 4000,
        width: 400,
        height: 500,
        contentType: 'image/jpeg'
      })

      const notStored: Attachment = { ...copyAttachmentAttrs(att), contentLocator: undefined }
      notStored.thumbnails[0].contentLocator = uniqid()
      expect(api.exoAttachmentForThumbnail(0, notStored)).to.have.property('contentStored', false)
    })

    it('preserves location provider information', function() {

      const from: ObservationAttrs = {
        id: uniqid(),
        eventId: 987,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: {
          timestamp: new Date(),
          forms: [],
          provider: 'gps',
          accuracy: 50,
          delta: 54321,
        },
        states: [],
        favoriteUserIds: [],
        attachments: [
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field1', oriented: false, thumbnails: [], contentLocator: void(0) },
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field1', oriented: false, thumbnails: [], contentLocator: 'over there' },
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field1', oriented: false, thumbnails: [] },
        ]
      }
      const exo = api.exoObservationFor(from)

      expect(exo.properties).to.include({
        provider: 'gps',
        accuracy: 50,
        delta: 54321,
      })
    })
  })

  describe('allocating observation ids', function() {

    let allocateObservationId: api.AllocateObservationId

    beforeEach(function() {
      allocateObservationId = AllocateObservationId(permissions)
    })

    it('fails without permission', async function() {

      permissions.ensureCreateObservationPermission(Arg.all()).resolves(permissionDenied('create observation', 'test1'))
      const res = await allocateObservationId({ context })

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      permissions.received(1).ensureCreateObservationPermission(context)
      obsRepo.didNotReceive().allocateObservationId()
    })

    it('gets a new observation id from the context repository', async function() {

      const id = uniqid()
      permissions.ensureCreateObservationPermission(Arg.all()).resolves(null)
      obsRepo.allocateObservationId().resolves(id)
      const res = await allocateObservationId({ context })

      expect(res.error).to.be.null
      expect(res.success).to.equal(id)
    })

    it.skip('TODO: handles rejected promises')
  })

  describe('saving observations', function() {

    let saveObservation: api.SaveObservation
    let minimalObs: ObservationAttrs

    beforeEach(function() {
      saveObservation = SaveObservation(permissions, userRepo)
      minimalObs = {
        id: uniqid(),
        eventId: mageEvent.id,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 13, 57 ] },
        properties: {
          timestamp: new Date(),
          forms: []
        },
        states: [],
        favoriteUserIds: [],
        attachments: [],
      }
      permissions.ensureCreateObservationPermission(Arg.all()).resolves(null)
      permissions.ensureUpdateObservationPermission(Arg.all()).resolves(null)
    })

    it('does not save when the obsevation event id does not match the context event', async function() {

      const eventIdOverride = mageEvent.id * 3
      const req: api.SaveObservationRequest = {
        context,
        observation: { ...observationModFor(minimalObs), eventId: eventIdOverride } as any
      }
      obsRepo.findById(Arg.any()).resolves(null)
      obsRepo.save(Arg.any()).resolves(new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservation))
      const res = await saveObservation(req)
      const err = res.error as InvalidInputError

      expect(res.success).to.be.null
      expect(err.code).to.equal(ErrInvalidInput)
      obsRepo.received(1).save(Arg.any())
    })

    it('populates the creator user id when present', async function() {

      const creator: User = {
        id: context.userId,
        active: true,
        enabled: true,
        authenticationId: 'auth1',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        displayName: 'Populate Me',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        phones: [],
        roleId: uniqid(),
        username: 'populate.me',
      }
      const req: api.SaveObservationRequest = {
        context,
        observation: observationModFor(minimalObs)
      }
      const obsAfter = Observation.evaluate({
        ...minimalObs,
        userId: creator.id
      }, mageEvent)
      obsRepo.findById(Arg.all()).resolves(null)
      obsRepo.save(Arg.all()).resolves(obsAfter)
      userRepo.findAllByIds([ creator.id ]).resolves({ [creator.id]: creator })
      const res = await saveObservation(req)
      const saved = res.success as api.ExoObservation

      expect(res.error).to.be.null
      expect(obsAfter.validation.hasErrors).to.be.false
      expect(saved.user).to.deep.equal({ id: context.userId, displayName: creator.displayName })
    })

    it('populates the important flag user id when present', async function() {

      const importantFlagger: User = {
        id: uniqid(),
        active: true,
        enabled: true,
        authenticationId: 'auth1',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        displayName: 'Populate Me',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        phones: [],
        roleId: uniqid(),
        username: 'populate.me',
      }
      const req: api.SaveObservationRequest = {
        context,
        observation: observationModFor(minimalObs)
      }
      const obsAfter = Observation.evaluate({
        ...minimalObs,
        important: {
          userId: importantFlagger.id,
          description: 'populate the user who flagged this observation',
          timestamp: new Date(Date.now() - 1000 * 60 * 15)
        }
      }, mageEvent)
      obsRepo.findById(Arg.all()).resolves(null)
      obsRepo.save(Arg.all()).resolves(obsAfter)
      userRepo.findAllByIds([ importantFlagger.id ]).resolves({ [importantFlagger.id]: importantFlagger })
      const res = await saveObservation(req)
      const saved = res.success as api.ExoObservation

      expect(res.error).to.be.null
      expect(obsAfter.validation.hasErrors).to.be.false
      expect(saved.important?.user).to.deep.equal({ id: importantFlagger.id, displayName: importantFlagger.displayName })
    })

    it('populates the creator and important flag user id when present', async function() {

      const creator: User = {
        id: uniqid(),
        active: true,
        enabled: true,
        authenticationId: 'auth1',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        displayName: 'I Made This',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        phones: [],
        roleId: uniqid(),
        username: 'user1',
      }
      const importantFlagger: User = {
        id: uniqid(),
        active: true,
        enabled: true,
        authenticationId: 'auth1',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        displayName: 'I Flagged This',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        phones: [],
        roleId: uniqid(),
        username: 'user2',
      }
      const req: api.SaveObservationRequest = {
        context,
        observation: observationModFor(minimalObs)
      }
      const obsAfter = Observation.evaluate({
        ...minimalObs,
        userId: creator.id,
        important: {
          userId: importantFlagger.id,
          description: 'populate the user who flagged this observation',
          timestamp: new Date(Date.now() - 1000 * 60 * 15)
        }
      }, mageEvent)
      obsRepo.findById(Arg.all()).resolves(null)
      obsRepo.save(Arg.all()).resolves(obsAfter)
      userRepo.findAllByIds(Arg.any()).resolves({ [creator.id]: creator, [importantFlagger.id]: importantFlagger })
      const res = await saveObservation(req)
      const saved = res.success as api.ExoObservation

      expect(res.error).to.be.null
      expect(obsAfter.validation.hasErrors).to.be.false
      expect(saved.user).to.deep.equal({ id: creator.id, displayName: creator.displayName }, 'creator')
      expect(saved.important?.user).to.deep.equal({ id: importantFlagger.id, displayName: importantFlagger.displayName }, 'important flagger')
      expect(saved).to.deep.equal(api.exoObservationFor(obsAfter, { creator, importantFlagger }), 'saved result')
      userRepo.received(1).findAllByIds(Arg.all())
      userRepo.received(1).findAllByIds(Arg.is((x: UserId[]) => x.length === 2 && x.every(id => [ creator.id, importantFlagger.id ].includes(id))))
      userRepo.didNotReceive().findById(Arg.all())
    })

    describe('creating', function() {

      beforeEach(function() {
        obsRepo.findById(Arg.any()).resolves(null)
      })

      it('ensures create permission when no observation exists', async function() {

        const deny = Sub.for<api.ObservationPermissionService>()
        deny.ensureCreateObservationPermission(Arg.all()).resolves(permissionDenied('test create', context.userId, minimalObs.id))
        saveObservation = SaveObservation(deny, userRepo)
        const req: api.SaveObservationRequest = {
          context,
          observation: observationModFor(minimalObs)
        }
        const res = await saveObservation(req)
        const denied = res.error as PermissionDeniedError

        expect(res.success).to.be.null
        expect(denied).to.be.instanceOf(MageError)
        expect(denied.code).to.equal(ErrPermissionDenied)
        deny.received(1).ensureCreateObservationPermission(context)
        deny.didNotReceive().ensureUpdateObservationPermission(Arg.all())
        obsRepo.didNotReceive().save(Arg.all())
      })

      it('validates the id for a new observation', async function() {

        const req: api.SaveObservationRequest = {
          context,
          observation: observationModFor(minimalObs)
        }
        obsRepo.save(Arg.any()).resolves(new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservationId))
        const res = await saveObservation(req)
        const err = res.error as EntityNotFoundError

        expect(res.success).to.be.null
        expect(err).to.be.instanceOf(MageError)
        expect(err.code).to.equal(ErrEntityNotFound)
        expect(err.data.entityId).to.equal(minimalObs.id)
        expect(err.data.entityType).to.equal('ObservationId')
        obsRepo.received(1).save(Arg.any())
      })

      it('assigns creating user id and device id fron request context', async function() {

        const req: api.SaveObservationRequest = {
          context,
          observation: observationModFor(minimalObs)
        }
        const createdAttrs: ObservationAttrs = {
          ...copyObservationAttrs(minimalObs),
          userId: context.userId,
          deviceId: context.deviceId
        }
        const created = Observation.evaluate(createdAttrs, mageEvent)
        const creator: User = { id: context.userId, displayName: `User ${context.userId}` } as User
        obsRepo.save(Arg.all()).resolves(created)
        userRepo.findAllByIds([ context.userId ]).resolves({ [context.userId]: creator })
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(created.validation.hasErrors).to.be.false
        expect(created.userId).to.equal(context.userId)
        expect(created.deviceId).to.equal(context.deviceId)
        expect(saved).to.deep.equal(api.exoObservationFor(created, { creator }))
        obsRepo.received(1).save(Arg.all())
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(created)))
      })

      it('accepts location provider properties', async function() {

        const req: api.SaveObservationRequest = {
          context,
          observation: observationModFor({
            ...minimalObs,
            properties: {
              ...minimalObs.properties,
              accuracy: 100,
              delta: 5000,
              provider: 'fake',
            }
          })
        }
        const createdAttrs: ObservationAttrs = {
          ...copyObservationAttrs(minimalObs),
          userId: context.userId,
          deviceId: context.deviceId,
          properties: {
            ...minimalObs.properties,
            accuracy: 100,
            delta: 5000,
            provider: 'fake',
          }
        }
        const created = Observation.evaluate(createdAttrs, mageEvent)
        const creator: User = { id: context.userId, displayName: `User ${context.userId}` } as User
        obsRepo.save(Arg.all()).resolves(created)
        userRepo.findAllByIds([ context.userId ]).resolves({ [context.userId]: creator })
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(created.validation.hasErrors).to.be.false
        expect(created.properties).to.include({
          accuracy: 100,
          delta: 5000,
          provider: 'fake',
        })
        expect(saved).to.deep.equal(api.exoObservationFor(created, { creator }))
        obsRepo.received(1).save(Arg.all())
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(created)))
      })
    })

    describe('updating', function() {

      let obsBefore: Observation

      beforeEach(function() {

        const eventAttrs = copyMageEventAttrs(mageEvent)
        eventAttrs.forms = [
          {
            id: 135,
            name: 'Form 1',
            archived: false,
            color: '#123456',
            fields: [
              {
                id: 876,
                name: 'field1',
                required: false,
                title: 'Field 1',
                type: FormFieldType.Text,
              },
              {
                id: 987,
                name: 'field2',
                required: false,
                title: 'Field 2',
                type: FormFieldType.Attachment
              }
            ],
            userFields: []
          }
        ]
        mageEvent = new MageEvent(eventAttrs)
        context.mageEvent = mageEvent
        const formId = mageEvent.forms[0].id
        const formEntryId = uniqid()
        obsBefore = Observation.evaluate({
          ...minimalObs,
          userId: uniqid(),
          deviceId: uniqid(),
          important: {
            userId: uniqid(),
            timestamp: new Date(minimalObs.lastModified.getTime() - 1000 * 60 * 20),
            description: 'oh my goodness look'
          },
          properties: {
            timestamp: minimalObs.properties.timestamp,
            provider: 'hoomon',
            accuracy: 25,
            delta: 23232,
            forms: [
              { id: formEntryId, formId, field1: 'existing form entry' }
            ],
          },
          attachments: [
            {
              id: uniqid(),
              observationFormId: formEntryId,
              fieldName: 'field2',
              name: 'photo1.png',
              oriented: false,
              thumbnails: [
                { minDimension: 120, name: 'photo1@120.png' }
              ]
            }
          ]
        }, mageEvent)
        const obsBeforeId = obsBefore.id
        obsRepo.findById(Arg.is(x => x === obsBeforeId)).resolves(obsBefore)
        userRepo.findAllByIds(Arg.all()).resolves({})
      })

      it('ensures update permission when an observation already exists', async function() {

        const deny = Sub.for<api.ObservationPermissionService>()
        deny.ensureUpdateObservationPermission(Arg.all()).resolves(permissionDenied('test update', context.userId, minimalObs.id))
        saveObservation = SaveObservation(deny, userRepo)
        const req: api.SaveObservationRequest = {
          context,
          observation: observationModFor(minimalObs)
        }
        const res = await saveObservation(req)
        const denied = res.error as PermissionDeniedError

        expect(res.success).to.be.null
        expect(denied).to.be.instanceOf(MageError)
        expect(denied.code).to.equal(ErrPermissionDenied)
        deny.received(1).ensureUpdateObservationPermission(context)
        deny.didNotReceive().ensureCreateObservationPermission(Arg.all())
        obsRepo.didNotReceive().save(Arg.all())
      })

      it('preserves creator user id and device id', async function() {

        const modUserId = uniqid()
        const modDeviceId = uniqid()
        const mod: api.ExoObservationMod = {
          id: obsBefore.id,
          type: 'Feature',
          geometry: obsBefore.geometry,
          properties: {
            timestamp: obsBefore.timestamp,
            forms: [ { id: obsBefore.formEntries[0].id, formId: obsBefore.formEntries[0].formId, field1: 'updated field' } ]
          }
        }
        const modExtra = {
          ...mod,
          userId: modUserId,
          deviceId: modDeviceId
        }
        const obsAfterAttrs: ObservationAttrs = {
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.timestamp,
            forms: [ { id: obsBefore.formEntries[0].id, formId: obsBefore.formEntries[0].formId, field1: 'updated field' } ]
          }
        }
        const obsAfter = Observation.assignTo(obsBefore, obsAfterAttrs) as Observation
        const req: api.SaveObservationRequest = { context, observation: modExtra }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(obsBefore.userId).to.exist.and.not.be.empty
        expect(obsBefore.deviceId).to.exist.and.not.be.empty
        expect(context.userId).to.not.equal(obsBefore.userId)
        expect(context.deviceId).to.not.equal(obsBefore.deviceId)
        expect(modExtra.userId).to.not.equal(obsBefore.userId)
        expect(modExtra.deviceId).to.not.equal(obsBefore.deviceId)
        expect(obsAfter.validation.hasErrors, 'valid update').to.be.false
        expect(obsAfter.userId).to.equal(obsBefore.userId)
        expect(obsAfter.deviceId).to.equal(obsBefore.deviceId)
        expect(saved).to.deep.equal(api.exoObservationFor(obsAfter))
        obsRepo.received(1).save(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter)))
      })

      it('obtains ids for new form entries', async function() {

        const nextEntryId = uniqid()
        const obsAfter = Observation.evaluate({
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.properties.timestamp,
            forms: [
              ...obsBefore.properties.forms,
              { id: nextEntryId, formId: mageEvent.forms[0].id, field1: 'new form entry' }
            ]
          },
        }, mageEvent)
        const obsMod: api.ExoObservationMod = {
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              { ...obsBefore.properties.forms[0] },
              { id: 'next1', formId: mageEvent.forms[0].id, field1: 'new form entry' }
            ]
          }
        }
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.nextFormEntryIds(1).resolves([ nextEntryId ])
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(saved.properties.forms[0]).to.deep.equal(obsBefore.properties.forms[0])
        expect(saved.properties.forms[1]).to.deep.equal({
          id: nextEntryId,
          formId: mageEvent.forms[0].id,
          field1: 'new form entry'
        })
        obsRepo.received(1).nextFormEntryIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter)))
        obsRepo.received(1).save(Arg.all())
      })

      it('obtains ids for new attachments', async function() {

        /*
        do clients send a complete array of attachments for the form fields or
        only the attachments with actions?
        answer: web app just sends the action attachments
        */

        const nextAttachmentId = uniqid()
        const newAttachment: AttachmentCreateAttrs = {
          oriented: false,
          thumbnails: [],
          size: 123678,
          name: 'new attachment.png'
        }
        const obsAfter = addAttachment(obsBefore, nextAttachmentId, 'field2', obsBefore.formEntries[0].id, newAttachment) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.properties.forms[0],
                field2: [{
                  action: api.AttachmentModAction.Add,
                  name: newAttachment.name,
                  size: newAttachment.size
                }]
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.nextAttachmentIds(1).resolves([ nextAttachmentId ])
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(saved.properties.forms).to.deep.equal(obsBefore.properties.forms)
        expect(saved.attachments).to.have.length(2)
        expect(saved.attachments.map(omitUndefinedFrom)).to.deep.equal(obsAfter.attachments.map(api.exoAttachmentFor).map(omitUndefinedFrom))
        obsRepo.received(1).nextAttachmentIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
        obsRepo.received(1).save(Arg.all())
      })

      it('ignores form entry id and field name keys on added attachments', async function() {

        // use only the attachment mod's placement in the form entry
        const nextAttachmentId = uniqid()
        const newAttachment: AttachmentCreateAttrs = {
          oriented: false,
          thumbnails: [],
          name: 'new attachment.png'
        }
        const obsAfter = addAttachment(obsBefore, nextAttachmentId, 'field2', obsBefore.formEntries[0].id, newAttachment) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.properties.forms[0],
                field2: [{
                  action: api.AttachmentModAction.Add,
                  observationFormId: 'invalidFormEntryId',
                  fieldName: 'notField2',
                  name: newAttachment.name,
                }]
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.nextAttachmentIds(1).resolves([ nextAttachmentId ])
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(saved.properties.forms).to.deep.equal(obsBefore.properties.forms)
        expect(saved.attachments).to.have.length(2)
        expect(saved.attachments[1].name).to.equal('new attachment.png')
        expect(saved.attachments[1].observationFormId).to.equal(obsBefore.formEntries[0].id)
        expect(saved.attachments[1].fieldName).to.equal('field2')
        expect(saved.attachments.map(omitUndefinedFrom)).to.deep.equal(obsAfter.attachments.map(api.exoAttachmentFor).map(omitUndefinedFrom))
        obsRepo.received(1).nextAttachmentIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
        obsRepo.received(1).save(Arg.all())
      })

      it('ignores the attachments array on the observation', async function() {

        // TODO: for create as well

        const obsMod: api.ExoObservationMod = <any>{
          ...copyObservationAttrs(obsBefore),
          attachments: [
            <Attachment>{ ...obsBefore.attachments[0], size: Number(obsBefore.attachments[0].size) * 2, name: 'do not change.png' },
            <Attachment>{ id: uniqid(), observationFormId: obsBefore.formEntries[0].id, fieldName: 'field2', name: 'cannot add from here.png', oriented: false, thumbnails: [] }
          ]
        }
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsBefore)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(saved.attachments).to.have.length(1)
        expect(omitUndefinedFrom(saved.attachments[0])).to.deep.equal(omitUndefinedFrom(api.exoAttachmentFor(obsBefore.attachments[0])))
        obsRepo.didNotReceive().nextAttachmentIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsBefore, 'repository save argument')))
        obsRepo.received(1).save(Arg.all())
      })

      it('does not save attachment mods without a corresponding form field', async function() {

        /*
        a client could submit an attachment mod array for a field name that
        does not exist in the event form
        */

        /*
        TODO: this bit should change to invalidate or remove the invalid form
        entry key.  currently observation validation only considers form field
        entries that have corresponding fields, while simply ignoring field
        entries without a corresponding field or a field that is archived.
        */
        const obsAfter = Observation.assignTo(obsBefore, {
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.properties.timestamp,
            forms: [
              {
                ...obsBefore.formEntries[0],
                whoops: [ { action: api.AttachmentModAction.Add, name: 'bad field reference.png' } as any ]
              }
            ]
          }
        }) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.properties.forms[0],
                whoops: [ { action: api.AttachmentModAction.Add, name: 'bad field reference.png' } ]
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(obsAfter.attachments.map(copyAttachmentAttrs)).to.deep.equal(obsBefore.attachments.map(copyAttachmentAttrs))
        expect(saved.attachments).to.have.length(1)
        expect(omitUndefinedFrom(saved.attachments[0])).to.deep.equal(omitUndefinedFrom(api.exoAttachmentFor(obsBefore.attachments[0])))
        obsRepo.didNotReceive().nextAttachmentIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
        obsRepo.received(1).save(Arg.all())
      })

      it('preserves existing attachments when the attachment field entry is null', async function() {
        /*
        for some reason the web client sends a null value for the attachment field
        in form entries other than the one that has a new attachment appended, so
        the server needs to ignore that. for example
        {
          id: 'aq1sw2',
          ...
          properties: {
            forms: [
              {
                ...
                attField1: [ { action: 'add', ... } ],
                attField2: null
              }
            ]
          }
        }
        */

        const obsAfter = Observation.assignTo(obsBefore, obsBefore) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.properties.forms[0],
                field2: null
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(saved.properties.forms).to.deep.equal(obsBefore.properties.forms)
        expect(saved.attachments).to.have.length(1)
        expect(saved.attachments.map(omitUndefinedFrom)).to.deep.equal(obsAfter.attachments.map(api.exoAttachmentFor).map(omitUndefinedFrom))
        obsRepo.didNotReceive().nextAttachmentIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
        obsRepo.received(1).save(Arg.all())
      })

      it('preserves attachment thumbnails even though app clients do not send them', async function() {

        const obsAfter = Observation.assignTo(obsBefore, {
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.properties.timestamp,
            forms: [
              {
                ...obsBefore.formEntries[0],
                field1: 'mod field 1',
              }
            ]
          }
        }) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.formEntries[0],
                field1: 'mod field 1',
                field2: null // no attachment mods
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)

        expect(res.error).to.be.null
        expect(res.success).to.exist
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(obsBefore.attachments.map(copyAttachmentAttrs)).to.deep.equal([
          copyAttachmentAttrs({
            id: obsBefore.attachments[0].id,
            observationFormId: obsBefore.formEntries[0].id,
            fieldName: 'field2',
            name: 'photo1.png',
            oriented: false,
            thumbnails: [
              { minDimension: 120, name: 'photo1@120.png' }
            ]
          })
        ])
        expect(obsAfter.attachments.map(copyAttachmentAttrs)).to.deep.equal(obsBefore.attachments.map(copyAttachmentAttrs))
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
        obsRepo.received(1).save(Arg.all())
      })

      it('removes form entries and their attachment meta-data', async function() {

        const obsAfter = removeFormEntry(obsBefore, obsBefore.formEntries[0].id)
        const obsMod: api.ExoObservationMod = {
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: []
          }
        }
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(saved.properties.forms).to.be.empty
        expect(saved.attachments).to.be.empty
        obsRepo.didNotReceive().nextFormEntryIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter)))
        obsRepo.received(1).save(Arg.all())
      })

      it('removes attachments', async function() {

        const obsAfter = removeAttachment(
          Observation.assignTo(obsBefore, {
            ...copyObservationAttrs(obsBefore),
            properties: {
              ...obsBefore.properties,
              timestamp: obsBefore.timestamp,
              forms: [
                {
                  ...obsBefore.formEntries[0],
                  field1: 'mod field 1'
                }
              ]
            }
          }) as Observation,
          obsBefore.attachments[0].id) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.formEntries[0],
                field1: 'mod field 1',
                field2: [
                  {
                    action: api.AttachmentModAction.Delete,
                    id: obsBefore.attachments[0].id
                  }
                ]
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsBefore.attachments).to.have.length(1)
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(obsAfter.attachments).to.be.empty
        expect(saved).to.deep.equal(api.exoObservationFor(obsAfter))
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
      })

      it('adds and removes attachments', async function() {

        const nextAttachmentId = uniqid()
        const addedAttachment: Attachment = { id: nextAttachmentId, observationFormId: obsBefore.formEntries[0].id, fieldName: 'field2', oriented: false, thumbnails: [], name: 'added.png' }
        const obsAfter = Observation.assignTo(obsBefore, {
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.timestamp,
            forms: [
              { ...obsBefore.formEntries[0], field1: 'mod field 1' }
            ],
          },
          attachments: [ addedAttachment ]
        }) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.formEntries[0],
                field1: 'mod field 1',
                field2: [
                  {
                    action: api.AttachmentModAction.Delete,
                    id: obsBefore.attachments[0].id
                  },
                  {
                    action: api.AttachmentModAction.Add,
                    name: addedAttachment.name
                  }
                ]
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.nextAttachmentIds(1).resolves([ nextAttachmentId ])
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsBefore.attachments).to.have.length(1)
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(obsAfter.attachments).to.have.length(1)
        expect(obsAfter.attachments[0]).to.deep.equal(copyAttachmentAttrs({
          id: nextAttachmentId,
          observationFormId: obsBefore.formEntries[0].id,
          fieldName: 'field2',
          name: 'added.png',
          oriented: false,
          thumbnails: [],
        }))
        expect(saved).to.deep.equal(api.exoObservationFor(obsAfter))
        obsRepo.received(1).nextAttachmentIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
      })

      it.skip('TODO: removes attachment content for removed attachments', async function() {
        expect.fail('todo')
      })

      it.skip('TODO: removes attachment content for removed form entries', async function() {
        expect.fail('todo')
      })

      it('preserves the important flag', async function() {

        const obsAfter = Observation.assignTo(obsBefore, {
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.timestamp,
            forms: [
              { ...obsBefore.formEntries[0], field1: 'mod field 1' }
            ],
          }
        }) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              { ...obsBefore.formEntries[0], field1: 'mod field 1' }
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsBefore.important).to.have.property('userId').that.is.a('string')
        expect(obsBefore.important).to.have.property('timestamp').that.is.instanceOf(Date)
        expect(obsBefore.important).to.have.property('description', 'oh my goodness look')
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(obsAfter.important).to.deep.equal(obsBefore.important)
        expect(saved).to.deep.equal(api.exoObservationFor(obsAfter))
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
      })

      it('preserves states', async function() {

        obsBefore = Observation.evaluate({
          ...copyObservationAttrs(obsBefore),
          id: uniqid(),
          states: [
            { id: uniqid(), name: 'active', userId: uniqid() },
            { id: uniqid(), name: 'archived', userId: uniqid() }
          ]
        }, mageEvent) as Observation
        const obsAfter = Observation.assignTo(obsBefore, {
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.timestamp,
            forms: [ { ...obsBefore.formEntries[0], field1: 'mod field 1' } ]
          }
        }) as Observation
        const mod: api.ExoObservationMod = {
          ...observationModFor(obsBefore),
          properties: {
            timestamp: obsBefore.timestamp,
            forms: [ { ...obsBefore.formEntries[0], field1: 'mod field 1' } ]
          },
        }
        const modExtra = {
          ...mod,
          state: { id: 'ignore', name: 'archived', userId: 'ignore' },
          states: [ { id: 'ignore still', name: 'archived', userId: 'ignore' } ],
        }
        const req: api.SaveObservationRequest = {
          context,
          observation: modExtra
        }
        obsRepo.findById(Arg.is(x => x === obsBefore.id)).resolves(obsBefore)
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsBefore.states).to.have.length(2)
        expect(obsAfter.states).to.deep.equal(obsBefore.states)
        expect(saved).to.deep.equal(api.exoObservationFor(obsAfter), 'saved result')
        expect(saved.state).to.deep.equal(obsAfter.states[0])
        obsRepo.received(1).save(Arg.all())
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'save argument')))
      })

      it('preserves location provider properties when mod does not specify them', async function() {

        const obsAfter = Observation.assignTo(obsBefore, {
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.timestamp,
            forms: [
              { ...obsBefore.formEntries[0], field1: 'mod field 1' }
            ],
          }
        }) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              { ...obsBefore.formEntries[0], field1: 'mod field 1' }
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsBefore.properties).to.have.property('accuracy').that.is.a('number')
        expect(obsBefore.properties).to.have.property('delta').that.is.a('number')
        expect(obsBefore.properties).to.have.property('provider').that.is.a('string')
        expect(obsMod.properties).not.to.have.keys('accuracy', 'delta', 'provider')
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(obsAfter.properties).to.include(_.pick(obsBefore.properties, 'accuracy', 'delta', 'provider'))
        expect(saved).to.deep.equal(api.exoObservationFor(obsAfter))
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
      })

      it('uses mod accuracy and delta when they are zero', async function() {

        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            accuracy: 0,
            delta: 0,
            timestamp: minimalObs.properties.timestamp,
            forms: obsBefore.formEntries,
          }
        }, 'attachments')
        const obsAfter = Observation.assignTo(obsBefore, {
          ...copyObservationAttrs(obsBefore),
          properties: {
            ...obsBefore.properties,
            timestamp: obsBefore.timestamp,
            accuracy: 0,
            delta: 0,
          }
        }) as Observation
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsBefore.properties).to.have.property('accuracy').that.does.not.equal(0)
        expect(obsBefore.properties).to.have.property('delta').that.does.not.equal(0)
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(obsAfter.properties).to.include({
          accuracy: 0,
          delta: 0,
        })
        expect(saved).to.deep.equal(api.exoObservationFor(obsAfter))
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
      })
    })
  })

  describe('saving attachment content', function() {

    let storeAttachmentContent: api.StoreAttachmentContent
    let store: SubstituteOf<AttachmentStore>
    let obs: Observation

    beforeEach(function() {
      const permittedUser = context.userId
      permissions.ensureStoreAttachmentContentPermission(Arg.all()).mimicks(async context => {
        if (context.userId === permittedUser) {
          return null
        }
        return permissionDenied('update observation', context.userId)
      })
      store = Sub.for<AttachmentStore>()
      mageEvent = new MageEvent({
        ...copyMageEventAttrs(mageEvent),
        forms: [
          {
            id: 1,
            name: 'Save Attachment Content',
            archived: false,
            color: '#12ab34',
            fields: [
              {
                id: 1,
                name: 'description',
                title: 'Description',
                type: FormFieldType.Text,
                required: false,
              },
              {
                id: 2,
                name: 'attachments',
                title: 'Attachments',
                type: FormFieldType.Attachment,
                required: false,
              }
            ],
            userFields: []
          }
        ]
      })
      const baseObsAttrs: ObservationAttrs = {
        id: uniqid(),
        eventId: mageEvent.id,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: {
          timestamp: new Date(),
          forms: [
            { id: 'formEntry1', formId: mageEvent.forms[0].id, description: `something interesting at ${new Date().toISOString()}` }
          ]
        },
        states: [],
        favoriteUserIds: [],
        attachments: []
      }
      baseObsAttrs.attachments = [
        {
          id: uniqid(),
          observationFormId: 'formEntry1',
          fieldName: 'attachments',
          name: 'store test 1.jpg',
          contentType: 'image/jpeg',
          size: 12345,
          oriented: false,
          thumbnails: [],
          contentLocator: uniqid()
        },
        {
          id: uniqid(),
          observationFormId: 'formEntry1',
          fieldName: 'attachments',
          name: 'store test 2.jpg',
          contentType: 'image/jpeg',
          size: 23456,
          oriented: false,
          thumbnails: [],
        }
      ]
      obs = Observation.evaluate(baseObsAttrs, mageEvent)
      storeAttachmentContent = StoreAttachmentContent(permissions, store)

      expect(obs.validation.hasErrors).to.be.false
    })

    it('checks permission to store the attachment', async function() {

      const attachment = obs.attachments[0]
      const forbiddenUser = uniqid()
      const bytesBuffer = Buffer.from('photo of something')
      const bytes: NodeJS.ReadableStream = Readable.from(bytesBuffer)
      context.userId = forbiddenUser
      const content: api.ExoIncomingAttachmentContent = {
        name: attachment.name!,
        mediaType: attachment.contentType!,
        bytes,
      }
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: obs.attachments[0].id,
        content,
      }
      obsRepo.findById(obs.id).resolves(obs)
      const res = await storeAttachmentContent(req)
      const denied = res.error as PermissionDeniedError

      expect(res.success).to.be.null
      expect(denied).to.be.instanceOf(MageError)
      expect(denied.code).to.equal(ErrPermissionDenied)
      expect(denied.data.permission).to.equal('update observation')
      expect(denied.data.subject).to.equal(forbiddenUser)
      store.didNotReceive().saveContent(Arg.all())
      obsRepo.didNotReceive().save(Arg.all())
      permissions.received(1).ensureStoreAttachmentContentPermission(Arg.all())
      permissions.received(1).ensureStoreAttachmentContentPermission(context, obs, obs.attachments[0].id)
    })

    it('saves the attachment content to the attachment store', async function() {

      const attachment = obs.attachments[0]
      const bytesBuffer = Buffer.from('photo of something')
      const bytes: NodeJS.ReadableStream = Readable.from(bytesBuffer)
      const content: api.ExoIncomingAttachmentContent = {
        name: attachment.name!,
        mediaType: attachment.contentType!,
        bytes,
      }
      const attachmentId = obs.attachments[0].id
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: obs.attachments[0].id,
        content,
      }
      const attachmentPatch: AttachmentContentPatchAttrs = Object.freeze({ contentLocator: uniqid(), size: 887766 })
      const afterStore = patchAttachment(obs, attachmentId, attachmentPatch) as Observation
      obsRepo.findById(obs.id).resolves(obs)
      store.saveContent(bytes, req.attachmentId, obs).resolves(attachmentPatch)
      obsRepo.patchAttachment(Arg.all()).resolves(afterStore)
      const res = await storeAttachmentContent(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(api.exoObservationFor(afterStore))
      store.received(1).saveContent(Arg.all())
      store.received(1).saveContent(bytes, attachmentId, Arg.is(validObservation()))
      store.received(1).saveContent(bytes, attachmentId, obs)
      obsRepo.received(1).patchAttachment(Arg.all())
      obsRepo.received(1).patchAttachment(Arg.is(validObservation()), attachmentId, attachmentPatch)
      obsRepo.received(1).patchAttachment(Arg.is(equalToObservationIgnoringDates(obs)), attachmentId, attachmentPatch)
      obsRepo.didNotReceive().save(Arg.all())
    })

    it('saves previously staged content to the attachment store', async function() {

      const attachment = obs.attachments[0]
      const stagedRef = new StagedAttachmentContentRef(uniqid())
      const content: api.ExoIncomingAttachmentContent = {
        name: attachment.name!,
        mediaType: attachment.contentType!,
        bytes: stagedRef,
      }
      const attachmentId = obs.attachments[0].id
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: obs.attachments[0].id,
        content,
      }
      const attachmentPatch: AttachmentContentPatchAttrs = { contentLocator: uniqid(), size: 223344 }
      const afterStore = patchAttachment(obs, attachmentId, attachmentPatch) as Observation
      obsRepo.findById(obs.id).resolves(obs)
      store.saveContent(stagedRef, req.attachmentId, obs).resolves(attachmentPatch)
      obsRepo.patchAttachment(Arg.all()).resolves(afterStore)
      const res = await storeAttachmentContent(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(api.exoObservationFor(afterStore))
      store.received(1).saveContent(Arg.all())
      store.received(1).saveContent(stagedRef, attachmentId, Arg.is(validObservation()))
      store.received(1).saveContent(stagedRef, attachmentId, obs)
      obsRepo.received(1).patchAttachment(Arg.all())
      obsRepo.received(1).patchAttachment(Arg.is(validObservation()), attachmentId, attachmentPatch)
      obsRepo.received(1).patchAttachment(obs, attachmentId, attachmentPatch)
      obsRepo.didNotReceive().save(Arg.all())
    })

    it('does not save the observation if the attachment store did not return a patch', async function() {

      const attachment = obs.attachments[0]
      const bytesBuffer = Buffer.from('photo of something')
      const bytes: NodeJS.ReadableStream = Readable.from(bytesBuffer)
      const content: api.ExoIncomingAttachmentContent = {
        name: attachment.name!,
        mediaType: attachment.contentType!,
        bytes,
      }
      const attachmentId = attachment.id
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: attachment.id,
        content,
      }
      obsRepo.findById(obs.id).resolves(obs)
      store.saveContent(bytes, req.attachmentId, obs).resolves(null)
      const res = await storeAttachmentContent(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(api.exoObservationFor(obs))
      store.received(1).saveContent(Arg.all())
      store.received(1).saveContent(bytes, attachmentId, Arg.is(validObservation()))
      store.received(1).saveContent(bytes, attachmentId, obs)
      obsRepo.didNotReceive().patchAttachment(Arg.all())
      obsRepo.didNotReceive().save(Arg.all())
    })

    it('fails if storing the content failed', async function() {

      const attachment = obs.attachments[0]
      const bytesBuffer = Buffer.from('photo of something')
      const bytes: NodeJS.ReadableStream = Readable.from(bytesBuffer)
      const content: api.ExoIncomingAttachmentContent = {
        name: attachment.name!,
        mediaType: attachment.contentType!,
        bytes,
      }
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: attachment.id,
        content,
      }
      obsRepo.findById(obs.id).resolves(obs)
      store.saveContent(Arg.all()).resolves(new AttachmentStoreError(AttachmentStoreErrorCode.StorageError, 'the imaginary storage failed'))
      const res = await storeAttachmentContent(req)
      const err = res.error as InfrastructureError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.code).to.equal(ErrInfrastructure)
      expect(err.message).to.contain('the imaginary storage failed')
      store.received(1).saveContent(Arg.all())
      obsRepo.didNotReceive().save(Arg.all())
    })

    it('fails if the observation does not exist', async function() {

      const bytes = Sub.for<NodeJS.ReadableStream>()
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: uniqid(),
        attachmentId: uniqid(),
        content: { bytes, name: 'fail.jpg', mediaType: 'image/jpeg' },
      }
      obsRepo.findById(Arg.all()).resolves(null)
      const res = await storeAttachmentContent(req)
      const err = res.error as EntityNotFoundError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.code).to.equal(ErrEntityNotFound)
      expect(err.data.entityId).to.equal(req.observationId)
      store.didNotReceive().saveContent(Arg.all())
      obsRepo.didNotReceive().save(Arg.all())
    })

    it('fails if the attachment does not exist on the observation', async function() {

      const attachment = obs.attachments[0]
      const bytesBuffer = Buffer.from('photo of something')
      const bytes: NodeJS.ReadableStream = Readable.from(bytesBuffer)
      const content: api.ExoIncomingAttachmentContent = {
        name: attachment.name!,
        mediaType: attachment.contentType!,
        bytes,
      }
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: 'wut',
        content,
      }
      obsRepo.findById(obs.id).resolves(obs)
      const res = await storeAttachmentContent(req)
      const err = res.error as EntityNotFoundError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.code).to.equal(ErrEntityNotFound)
      expect(err.data.entityId).to.equal(req.attachmentId)
      expect(err.data.entityType).to.equal('Attachment')
      store.didNotReceive().saveContent(Arg.all())
      obsRepo.didNotReceive().save(Arg.all())
    })

    it('fails if the request content name does not match', async function() {

      const attachment = obs.attachments[0]
      const bytesBuffer = Buffer.from('photo of something')
      const bytes: NodeJS.ReadableStream = Readable.from(bytesBuffer)
      const content: api.ExoIncomingAttachmentContent = {
        name: 'img_123.wut',
        mediaType: attachment.contentType!,
        bytes,
      }
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: attachment.id,
        content,
      }
      obsRepo.findById(obs.id).resolves(obs)
      const res = await storeAttachmentContent(req)
      const err = res.error as EntityNotFoundError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.code).to.equal(ErrInvalidInput)
      store.didNotReceive().saveContent(Arg.all())
      obsRepo.didNotReceive().save(Arg.all())
    })

    it('fails if the request media type does not match', async function() {

      const attachment = obs.attachments[0]
      const bytesBuffer = Buffer.from('photo of something')
      const bytes: NodeJS.ReadableStream = Readable.from(bytesBuffer)
      const content: api.ExoIncomingAttachmentContent = {
        name: attachment.name!,
        mediaType: 'image/wut',
        bytes,
      }
      const req: api.StoreAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: attachment.id,
        content,
      }
      obsRepo.findById(obs.id).resolves(obs)
      const res = await storeAttachmentContent(req)
      const err = res.error as InvalidInputError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.code).to.equal(ErrInvalidInput)
      store.didNotReceive().saveContent(Arg.all())
      obsRepo.didNotReceive().save(Arg.all())
    })
  })

  describe('reading attachment content', function() {

    let obs: Observation
    let store: SubstituteOf<AttachmentStore>
    let readAttachmentContent: api.ReadAttachmentContent

    beforeEach(function() {
      store = Sub.for<AttachmentStore>()
      const permittedUser = context.userId
      permissions.ensureReadObservationPermission(Arg.all()).mimicks(async context => {
        if (context.userId === permittedUser) {
          return null
        }
        return permissionDenied('read observation', context.userId)
      })
      store = Sub.for<AttachmentStore>()
      mageEvent = new MageEvent({
        ...copyMageEventAttrs(mageEvent),
        forms: [
          {
            id: 1,
            name: 'Save Attachment Content',
            archived: false,
            color: '#12ab34',
            fields: [
              {
                id: 1,
                name: 'description',
                title: 'Description',
                type: FormFieldType.Text,
                required: false,
              },
              {
                id: 2,
                name: 'attachments',
                title: 'Attachments',
                type: FormFieldType.Attachment,
                required: false,
              }
            ],
            userFields: []
          }
        ]
      })
      const baseObsAttrs: ObservationAttrs = {
        id: uniqid(),
        eventId: mageEvent.id,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 55, 66 ] },
        properties: {
          timestamp: new Date(),
          forms: [
            { id: 'formEntry1', formId: mageEvent.forms[0].id, description: `something interesting at ${new Date().toISOString()}` },
            { id: 'formEntry2', formId: mageEvent.forms[0].id }
          ]
        },
        states: [],
        favoriteUserIds: [],
        attachments: []
      }
      baseObsAttrs.attachments = [
        {
          id: uniqid(),
          observationFormId: 'formEntry1',
          fieldName: 'attachments',
          name: 'store test 1.jpg',
          contentType: 'image/jpeg',
          size: 12345,
          oriented: false,
          thumbnails: [],
          contentLocator: uniqid()
        },
        {
          id: uniqid(),
          observationFormId: 'formEntry2',
          fieldName: 'attachments',
          name: 'store test 2.jpg',
          contentType: 'image/jpeg',
          size: 23456,
          oriented: false,
          thumbnails: [],
        }
      ]
      obs = Observation.evaluate(baseObsAttrs, mageEvent)
      readAttachmentContent = ReadAttachmentContent(permissions, store)

      expect(obs.validation.hasErrors).to.be.false
    })

    it('checks permission', async function() {

      const forbiddenUser = uniqid()
      const observationId = uniqid()
      const attachmentId = uniqid()
      context.userId = forbiddenUser
      const req: api.ReadAttachmentContentRequest = {
        context,
        observationId,
        attachmentId,
      }
      const res = await readAttachmentContent(req)
      const denied = res.error as PermissionDeniedError

      expect(res.success).to.be.null
      expect(denied).to.be.instanceOf(MageError)
      expect(denied.code).to.equal(ErrPermissionDenied)
      expect(denied.data.permission).to.equal('read observation')
      expect(denied.data.subject).to.equal(forbiddenUser)
      obsRepo.didNotReceive().findById(Arg.all())
      store.didNotReceive().readContent(Arg.all())
      store.didNotReceive().readThumbnailContent(Arg.all())
    })

    it('fails if the observation does not exist', async function() {

      const req: api.ReadAttachmentContentRequest = {
        context,
        observationId: uniqid(),
        attachmentId: uniqid(),
      }
      obsRepo.findById(Arg.all()).resolves(null)
      const res = await readAttachmentContent(req)
      const err = res.error as EntityNotFoundError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.code).to.equal(ErrEntityNotFound)
      expect(err.data.entityId).to.equal(req.observationId)
      expect(err.data.entityType).to.equal('Observation')
    })

    it('fails if the attachment does not exist on the observation', async function() {

      const req: api.ReadAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: uniqid(),
      }
      obsRepo.findById(Arg.all()).resolves(obs)
      const res = await readAttachmentContent(req)
      const err = res.error as EntityNotFoundError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.code).to.equal(ErrEntityNotFound)
      expect(err.data.entityId).to.equal(req.attachmentId)
      expect(err.data.entityType).to.equal('Attachment')
    })

    it('fails if the content does not exist in the attachment store', async function() {

      const req: api.ReadAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: obs.attachments[1].id,
      }
      obsRepo.findById(Arg.all()).resolves(obs)
      store.readContent(Arg.all()).resolves(null)
      const res = await readAttachmentContent(req)
      const err = res.error as EntityNotFoundError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.code).to.equal(ErrEntityNotFound)
      expect(err.data.entityId).to.equal(req.attachmentId)
      expect(err.data.entityType).to.equal('AttachmentContent')
      store.received(1).readContent(Arg.all())
      store.received(1).readContent(req.attachmentId, obs, undefined)
    })

    it('returns the attachment meta-data and its full content stream', async function() {

      const req: api.ReadAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: obs.attachments[0].id,
      }
      const contentBytes = Buffer.from(Array.from({ length: 100 }).map(_ => uniqid()).join('+'))
      obsRepo.findById(Arg.all()).resolves(obs)
      store.readContent(Arg.all()).resolves(Readable.from(contentBytes))
      const res = await readAttachmentContent(req)
      const resContent = res.success as api.ExoAttachmentContent
      const resStream = new BufferWriteable()
      await util.promisify(pipeline)(resContent.bytes, resStream)

      expect(res.error).to.be.null
      expect(resContent.attachment).to.deep.equal(api.exoAttachmentFor(obs.attachments[0]))
      expect(resStream.bytes).to.deep.equal(contentBytes)
      store.received(1).readContent(Arg.all())
      store.received(1).readContent(req.attachmentId, obs, undefined)
    })

    it('reads a range of the attachment content', async function() {

      const req: api.ReadAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: obs.attachments[0].id,
        contentRange: { start: 120, end: 239 }
      }
      const contentBytes = Buffer.from(Array.from({ length: 100 }).map(_ => uniqid()).join('+'))
      obsRepo.findById(Arg.all()).resolves(obs)
      store.readContent(Arg.all()).resolves(Readable.from(contentBytes.slice(120, 240)))
      const res = await readAttachmentContent(req)
      const resContent = res.success as api.ExoAttachmentContent
      const resStream = new BufferWriteable()
      await util.promisify(pipeline)(resContent.bytes, resStream)

      expect(res.error).to.be.null
      expect(resContent.attachment).to.deep.equal(api.exoAttachmentFor(obs.attachments[0]))
      expect(resContent.bytesRange).to.deep.equal({ start: 120, end: 239 })
      expect(resStream.bytes).to.deep.equal(contentBytes.slice(120, 240))
      store.received(1).readContent(Arg.all())
      store.received(1).readContent(req.attachmentId, obs, Arg.deepEquals({ ...req.contentRange! }))
    })

    it('reads the thumbnail content for the requested minimum dimension', async function() {

      obs = putAttachmentThumbnailForMinDimension(obs, obs.attachments[0].id, {
        minDimension: 200,
        contentLocator: uniqid(),
        contentType: 'image/jpeg',
        name: `${obs.attachments[0].name}@200`,
        size: 1000
      }) as Observation
      obs = putAttachmentThumbnailForMinDimension(obs, obs.attachments[0].id, {
        minDimension: 400,
        contentLocator: uniqid(),
        contentType: 'image/jpeg',
        name: `${obs.attachments[0].name}@400`,
        size: 2000
      }) as Observation
      obs = putAttachmentThumbnailForMinDimension(obs, obs.attachments[0].id, {
        minDimension: 600,
        contentLocator: uniqid(),
        contentType: 'image/jpeg',
        name: `${obs.attachments[0].name}@600`,
        size: 3000
      }) as Observation
      const contentBytes = Buffer.from(Array.from({ length: obs.attachments[1].size! }).map((_, index) => index % 10).join())
      const req: api.ReadAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: obs.attachments[0].id,
        minDimension: 260
      }
      obsRepo.findById(Arg.all()).resolves(obs)
      store.readThumbnailContent(Arg.all()).resolves(Readable.from(contentBytes))
      const res = await readAttachmentContent(req)
      const resContent = res.success as api.ExoAttachmentContent
      const resStream = new BufferWriteable()
      await util.promisify(pipeline)(resContent.bytes, resStream)

      expect(res.error).to.be.null
      expect(resContent.attachment).to.deep.equal(api.exoAttachmentForThumbnail(1, obs.attachments[0]))
      expect(resContent.bytesRange).to.be.undefined
      expect(resStream.bytes).to.deep.equal(contentBytes)
      store.didNotReceive().readContent(Arg.all())
      store.received(1).readThumbnailContent(Arg.all())
      store.received(1).readThumbnailContent(400, req.attachmentId, obs)
    })

    it('reads the full content if the store does not have the thumbnail content', async function() {

      obs = putAttachmentThumbnailForMinDimension(obs, obs.attachments[0].id, {
        minDimension: 200,
        contentLocator: uniqid(),
        contentType: 'image/jpeg',
        name: `${obs.attachments[0].name}@200`,
        size: 1000
      }) as Observation
      obs = putAttachmentThumbnailForMinDimension(obs, obs.attachments[0].id, {
        minDimension: 400,
        contentLocator: uniqid(),
        contentType: 'image/jpeg',
        name: `${obs.attachments[0].name}@400`,
        size: 2000
      }) as Observation
      obs = putAttachmentThumbnailForMinDimension(obs, obs.attachments[0].id, {
        minDimension: 600,
        contentLocator: uniqid(),
        contentType: 'image/jpeg',
        name: `${obs.attachments[0].name}@600`,
        size: 3000
      }) as Observation
      const contentBytes = Buffer.from(Array.from({ length: obs.attachments[1].size! }).map((_, index) => index % 10).join())
      const req: api.ReadAttachmentContentRequest = {
        context,
        observationId: obs.id,
        attachmentId: obs.attachments[0].id,
        minDimension: 260
      }
      obsRepo.findById(Arg.all()).resolves(obs)
      store.readThumbnailContent(Arg.all()).resolves(null)
      store.readContent(Arg.all()).resolves(Readable.from(contentBytes))
      const res = await readAttachmentContent(req)
      const resContent = res.success as api.ExoAttachmentContent
      const resStream = new BufferWriteable()
      await util.promisify(pipeline)(resContent.bytes, resStream)

      expect(res.error).to.be.null
      expect(resContent.attachment).to.deep.equal(api.exoAttachmentFor(obs.attachments[0]))
      expect(resContent.bytesRange).to.be.undefined
      expect(resStream.bytes).to.deep.equal(contentBytes)
      store.received(1).readThumbnailContent(Arg.all())
      store.received(1).readThumbnailContent(400, req.attachmentId, obs)
      store.received(1).readContent(Arg.all())
      store.received(1).readContent(req.attachmentId, obs, undefined)
    })
  })

  describe('handling removed attachments', function() {

    class DeleteAttachmentContent {

      readonly promise: Promise<any>
      private resolve: ((result: any) => any) | undefined = undefined
      private reject: ((err?: any) => void) | undefined = undefined

      constructor() {
        this.promise = new Promise((resolve, reject) => {
          this.resolve = resolve
          this.reject = reject
        })
      }

      resolvePromise(): Promise<any> {
        this.resolve!(null)
        return this.promise
      }

      rejectPromise(err: Error): Promise<any> {
        this.reject!(err)
        return this.promise
      }
    }
    let attachmentStore: SubstituteOf<AttachmentStore>

    beforeEach(function() {
      attachmentStore = Sub.for<AttachmentStore>()
      mageEvent = new MageEvent({
        ...copyMageEventAttrs(mageEvent),
        forms: [
          {
            id: 135,
            name: 'Remove Attachments Test',
            color: '#ab1234',
            archived: false,
            userFields: [],
            fields: [
              {
                id: 1,
                name: 'attachments',
                title: 'Remove Attachments',
                required: false,
                type: FormFieldType.Attachment,
              }
            ]
          }
        ]
      })
    })

    it('schedules a task to delete attachment content upon a removed attachments event', async function() {

      let observation = Observation.evaluate({
        id: uniqid(),
        eventId: mageEvent.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 15, 27 ] },
        properties: {
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
          forms: [
            { id: uniqid(), formId: 135 }
          ]
        },
        states: [],
        favoriteUserIds: [],
        attachments: [],
      }, mageEvent)
      observation = addAttachment(observation, 'not_removed', 'attachments', observation.formEntries[0].id, {
        oriented: false,
        thumbnails: [],
        name: 'not_removed.jpg',
        contentLocator: uniqid()
      }) as Observation
      const removed1: Attachment = {
        id: 'remove1',
        observationFormId: observation.properties.forms[0].id,
        fieldName: 'attachments',
        oriented: false,
        thumbnails: [],
        contentLocator: uniqid()
      }
      const removed2: Attachment = {
        id: 'removed2',
        observationFormId: observation.properties.forms[0].id,
        fieldName: 'attachments',
        oriented: false,
        thumbnails: [],
        contentLocator: uniqid()
      }
      const deletes = [] as DeleteAttachmentContent[]
      attachmentStore.deleteContent(Arg.all()).mimicks((att, obs) => {
        const del = new DeleteAttachmentContent()
        deletes.push(del)
        return del.promise.then(_ => null)
      })
      const domainEvents = new EventEmitter()
      registerDeleteRemovedAttachmentsHandler(domainEvents, attachmentStore)
      domainEvents.emit(ObservationDomainEventType.AttachmentsRemoved, Object.freeze<ObservationEmitted<AttachmentsRemovedDomainEvent>>({
        type: ObservationDomainEventType.AttachmentsRemoved,
        observation,
        removedAttachments: Object.freeze([ removed1, removed2 ])
      }))
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(deletes).to.have.length(2)
      attachmentStore.received(2).deleteContent(Arg.all())
      attachmentStore.received(1).deleteContent(removed1, observation)
      attachmentStore.received(1).deleteContent(removed2, observation)

      await Promise.all(deletes.map(x => x.resolvePromise()))
    })

    it('swallows rejections', async function() {

      let observation = Observation.evaluate({
        id: uniqid(),
        eventId: mageEvent.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 15, 27 ] },
        properties: {
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
          forms: [
            { id: uniqid(), formId: 135 }
          ]
        },
        states: [],
        favoriteUserIds: [],
        attachments: [],
      }, mageEvent)
      observation = addAttachment(observation, 'not_removed', 'attachments', observation.formEntries[0].id, {
        oriented: false,
        thumbnails: [],
        name: 'not_removed.jpg',
        contentLocator: uniqid()
      }) as Observation
      const removed1: Attachment = {
        id: 'remove1',
        observationFormId: observation.properties.forms[0].id,
        fieldName: 'attachments',
        oriented: false,
        thumbnails: [],
        contentLocator: uniqid()
      }
      const removed2: Attachment = {
        id: 'removed2',
        observationFormId: observation.properties.forms[0].id,
        fieldName: 'attachments',
        oriented: false,
        thumbnails: [],
        contentLocator: uniqid()
      }
      const deletes = [] as DeleteAttachmentContent[]
      attachmentStore.deleteContent(Arg.all()).mimicks(async (att, obs) => {
        deletes.push(new DeleteAttachmentContent())
        return deletes[deletes.length - 1].promise
      })
      const domainEvents = new EventEmitter()
      registerDeleteRemovedAttachmentsHandler(domainEvents, attachmentStore)
      domainEvents.emit(ObservationDomainEventType.AttachmentsRemoved, Object.freeze<ObservationEmitted<AttachmentsRemovedDomainEvent>>({
        type: ObservationDomainEventType.AttachmentsRemoved,
        observation,
        removedAttachments: Object.freeze([ removed1, removed2 ])
      }))
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(deletes).to.have.length(2)
      attachmentStore.received(2).deleteContent(Arg.all())
      attachmentStore.received(1).deleteContent(removed1, observation)
      attachmentStore.received(1).deleteContent(removed2, observation)

      deletes[0].rejectPromise(new Error('catch me')).catch(err => 'caught')
      await deletes[1].resolvePromise()
    })
  })
})

function equalToObservationIgnoringDates(expected: ObservationAttrs, message?: string): (actual: ObservationAttrs) => boolean {
  const expectedWithoutDates = _.omit(copyObservationAttrs(expected), 'createdAt', 'lastModified')
  expectedWithoutDates.attachments.forEach(x => x.lastModified = new Date(0))
  return actual => {
    const actualWithoutDates = _.omit(copyObservationAttrs(actual), 'createdAt', 'lastModified')
    actualWithoutDates.attachments.forEach(x => x.lastModified = new Date(0))
    expect(actualWithoutDates).to.deep.equal(expectedWithoutDates, message)
    return true
  }
}

function validObservation(): (actual: Observation) => boolean {
  return actual => !actual.validation.hasErrors
}

function omitUndefinedFrom<T extends object>(x: T): Partial<T> {
  return _.omitBy(x, (value) => value === undefined)
}

function observationModFor(observation: ObservationAttrs): api.ExoObservationMod {
  return _.omit(copyObservationAttrs(observation), 'eventId', 'createdAt', 'lastModified', 'states', 'attachments')
}