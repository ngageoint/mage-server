import express from 'express'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import { AllocateObservationId, ExoAttachment, ExoIncomingAttachmentContent, ExoObservation, ExoObservationMod, ObservationRequest, ReadAttachmentContent, SaveObservation, SaveObservationRequest, StoreAttachmentContent, StoreAttachmentContentRequest } from '../../app.api/observations/app.api.observations'
import { AttachmentStore, EventScopedObservationRepository, ObservationState, StagedAttachmentContentRef } from '../../entities/observations/entities.observations'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import multer from 'multer'

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        stagedContent: StagedAttachmentContentRef
      }
    }
  }
}

export interface ObservationAppLayer {
  allocateObservationId: AllocateObservationId
  saveObservation: SaveObservation
  storeAttachmentContent: StoreAttachmentContent
  readAttachmentContent: ReadAttachmentContent
}

export interface ObservationWebAppRequestFactory {
  <Params extends object>(req: express.Request, params?: Params): Params & ObservationRequest<unknown>
}

export interface EnsureEventScope {
  (eventId: MageEventId): Promise<null | { mageEvent: MageEvent, observationRepository: EventScopedObservationRepository }>
}

export function ObservationRoutes(app: ObservationAppLayer, attachmentStore: AttachmentStore, createAppRequest: ObservationWebAppRequestFactory): express.Router {

  const routes = express.Router().use(express.json())

  routes.route('/id')
    .post(async (req, res, next) => {
      const appReq = createAppRequest(req)
      const appRes = await app.allocateObservationId(appReq)
      const id = appRes.success
      const path = `${req.baseUrl}/${id}`
      if (id) {
        // TODO: add location header? kind of a gray area restfully speaking
        return res.status(201).location(path).json({
          id,
          eventId: appReq.context.mageEvent.id,
          url: `${req.getRoot()}${path}`
        })
      }
      next(appRes.error)
    })

  const attachmentUpload = multer({
    storage: {
      async _handleFile(req, file, callback) {
        const staged = await attachmentStore.stagePendingContent()
        file.stream.pipe(staged.tempLocation)
        callback(null, {
          ...file,
          stagedContent: new StagedAttachmentContentRef(staged.id)
        })
      },
      _removeFile(req, file, callback) {
        callback(null)
      }
    }
  })

  routes.route('/:observationId/attachments/:attachmentId')
    .put(
      attachmentUpload.single('attachment'),
      async (req, res, next) => {
        if (!req.file) {
          return res.status(400).json({ message: 'no attachment content found' })
        }
        const content: ExoIncomingAttachmentContent = {
          bytes: req.file.stagedContent,
          mediaType: req.file.mimetype,
          name: req.file.originalname,
        }
        const appReqParams: Omit<StoreAttachmentContentRequest, 'context'> = {
          observationId: req.params.observationId,
          attachmentId: req.params.attachmentId,
          content,
        }
        const appReq: StoreAttachmentContentRequest = createAppRequest(req, appReqParams)
        const appRes = await app.storeAttachmentContent(appReq)
        if (appRes.success) {
          const obs = appRes.success
          const attachment = obs.attachments.find(x => x.id === appReq.attachmentId)
          return res.json(attachment)
        }
        return next(appRes.error)
      }
    )

  routes.route('/:observationId')
    .put(async (req, res, next) => {
      const body = req.body
      const observationId = req.params.observationId
      if (body.hasOwnProperty('id') && body.id !== observationId) {
        return res.status(400).json({ message: 'Body observation ID does not match path observation ID' })
      }
      const mod: ExoObservationMod = {
        id: observationId,
        type: 'Feature',
        geometry: req.body.geometry,
        properties: {
          timestamp: new Date(body.properties.timestamp),
          forms: body.properties.forms
        }
      }
      const appReq: SaveObservationRequest = createAppRequest(req, { observation: mod })
      if (body.hasOwnProperty('eventId') && body.eventId !== appReq.context.mageEvent.id) {
        return res.status(400).json({ message: 'Body event ID does not match path event ID' })
      }
      const appRes = await app.saveObservation(appReq)
      if (appRes.success) {
        return res.json(jsonForObservation(appRes.success, `${req.getRoot()}${req.baseUrl}`))
      }
      next(appRes.error)
    })

  return routes.use(compatibilityMageAppErrorHandler)
}

export type WebObservation = Omit<ExoObservation, 'attachments' | 'state'> & {
  url: string
  state?: WebObservationState
  attachments: WebAttachment[]
}

export type WebObservationState = ObservationState & {
  url: string
}

export type WebAttachment = ExoAttachment & {
  url?: string
}

export function jsonForObservation(o: ExoObservation, baseUrl: string): WebObservation {
  const obsUrl = `${baseUrl}/${o.id}`
  return {
    ...o,
    url: obsUrl,
    state: o.state ? { ...o.state, url: `${obsUrl}/states/${o.state.id as string}` } : void(0),
    attachments: o.attachments.map(a => ({ ...a, url: a.contentStored ? `${obsUrl}/attachments/${a.id}` : void(0) })),
  }
}