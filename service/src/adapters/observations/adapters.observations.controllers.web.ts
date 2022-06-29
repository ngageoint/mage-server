import express from 'express'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import { AllocateObservationId, ExoAttachment, ExoIncomingAttachmentContent, ExoObservation, ExoObservationMod, ObservationRequest, ReadAttachmentContent, SaveObservation, SaveObservationRequest, StoreAttachmentContent, StoreAttachmentContentRequest } from '../../app.api/observations/app.api.observations'
import { AttachmentStore, EventScopedObservationRepository, ObservationState } from '../../entities/observations/entities.observations'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import busboy from 'busboy'
import { invalidInput } from '../../app.api/app.api.errors'

declare module 'express-serve-static-core' {
  interface Request {
    attachmentUpload: busboy.Busboy | null
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

  routes.route('/:observationId/attachments/:attachmentId')
    .put(
      (req, res, next) => {
        try {
          req.attachmentUpload = busboy({
            headers: req.headers,
            limits: { files: 1, fields: 0 }
          })
        }
        catch (err) {
          return res.status(400).json({ message: err instanceof Error ? err.message : String(err) })
        }
        next()
      },
      async (req, res, next) => {
        const afterUploadStream = {
          successResult: null as WebAttachment | null,
          errorResult: null as Error | null,
          invalidRequestStructure() {
            afterUploadStream.error(invalidInput(`request must contain only one file part named 'attachment'`))
          },
          error(x: Error) {
            if (!afterUploadStream.errorResult) {
              afterUploadStream.errorResult = x
            }
          },
          success(x: WebAttachment) {
            if (!afterUploadStream.successResult) {
              afterUploadStream.successResult = x
            }
          }
        }
        req.pipe(req.attachmentUpload!
          .on('file', async (fieldName, stream, info) => {
            if (fieldName !== 'attachment' || afterUploadStream.errorResult) {
              // per busboy docs, drain the file stream and move on
              afterUploadStream.invalidRequestStructure()
              return void(stream.resume())
            }
            const content: ExoIncomingAttachmentContent = {
              bytes: stream,
              mediaType: info.mimeType,
              name: info.filename,
            }
            const { observationId, attachmentId } = req.params
            const appReqParams: Omit<StoreAttachmentContentRequest, 'context'> = { observationId, attachmentId, content }
            const appReq: StoreAttachmentContentRequest = createAppRequest(req, appReqParams)
            const appRes = await app.storeAttachmentContent(appReq)
            if (appRes.success) {
              const obs = appRes.success
              const attachment = obs.attachments.find(x => x.id === appReq.attachmentId)!
              const attachmentJson = jsonForAttachment(attachment, `${qualifiedBaseUrl(req)}/${observationId}`)
              return void(afterUploadStream.success(attachmentJson))
            }
            if (appRes.error) {
              afterUploadStream.error(appRes.error)
            }
            else {
              afterUploadStream.invalidRequestStructure()
            }
            /*
            per busboy docs, drain the stream and ignore the contents; necessary
            for the busboy stream to terminate properly
            */
            stream.resume()
          })
          .on('filesLimit', afterUploadStream.invalidRequestStructure)
          .on('fieldsLimit', afterUploadStream.invalidRequestStructure)
          .on('close', () => {
            if (afterUploadStream.successResult) {
              return res.json(afterUploadStream.successResult)
            }
            next(afterUploadStream.errorResult)
          })
        )
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
        return res.json(jsonForObservation(appRes.success, `${qualifiedBaseUrl(req)}`))
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
    attachments: o.attachments.map(a => jsonForAttachment(a, obsUrl)),
  }
}

export function jsonForAttachment(a: ExoAttachment, observationUrl: string): WebAttachment {
  return { ...a, url: a.contentStored ? `${observationUrl}/attachments/${a.id}` : void(0) }
}

function qualifiedBaseUrl(req: express.Request): string {
  return req.getRoot() + req.baseUrl
}