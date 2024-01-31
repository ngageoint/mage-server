import express from 'express'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import { AllocateObservationId, ExoAttachment, ExoIncomingAttachmentContent, ExoObservation, ExoObservationMod, ObservationRequest, ReadAttachmentContent, ReadAttachmentContentRequest, SaveObservation, SaveObservationRequest, StoreAttachmentContent, StoreAttachmentContentRequest } from '../../app.api/observations/app.api.observations'
import { AttachmentStore, EventScopedObservationRepository, ObservationState } from '../../entities/observations/entities.observations'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import busboy from 'busboy'
import { invalidInput } from '../../app.api/app.api.errors'
import { exoObservationModFromJson } from './adapters.observations.dto.ecma404-json'

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
        /*
        encapsulate the busboy init in a middleware so the request can
        fail-fast when busboy throws a validation error
        */
        try {
          req.attachmentUpload = busboy({
            headers: req.headers,
            limits: { files: 1, fields: 0 }
          })
        }
        catch (err) {
          console.error('error initializing attachment upload\n', req.params, '\nheaders:\n', req.headers, '\n', err)
          return res.status(400).json({ message: err instanceof Error ? err.message : String(err) })
        }
        next()
      },
      async (req, res, next) => {
        const afterUploadStreamEvent = 'afterUploadStream'
        const sendInvalidRequestStructure = () => next(invalidInput(`request must contain only one file part named 'attachment'`))
        const afterUploadStream = (finishResponse: () => void) => {
          if (req.attachmentUpload?.listenerCount(afterUploadStreamEvent)) {
            return
          }
          if (req.attachmentUpload?.writable) {
            return void(req.attachmentUpload.on(afterUploadStreamEvent, finishResponse))
          }
          finishResponse()
        }
        const { observationId, attachmentId } = req.params
        req.pipe(req.attachmentUpload!
          .on('file', async (fieldName, stream, info) => {
            if (fieldName !== 'attachment') {
              // per busboy docs, drain the file stream and move on
              console.error(`unexpected file entry '${fieldName}' uploading attachment ${attachmentId} on observation ${observationId}`)
              stream.resume()
              return afterUploadStream(sendInvalidRequestStructure)
            }
            const content: ExoIncomingAttachmentContent = {
              bytes: stream,
              mediaType: info.mimeType,
              name: info.filename,
            }
            const appReqParams: Omit<StoreAttachmentContentRequest, 'context'> = { observationId, attachmentId, content }
            const appReq: StoreAttachmentContentRequest = createAppRequest(req, appReqParams)
            const appRes = await app.storeAttachmentContent(appReq)
            if (appRes.success) {
              const obs = appRes.success
              const attachment = obs.attachments.find(x => x.id === appReq.attachmentId)!
              const attachmentJson = jsonForAttachment(attachment, `${qualifiedBaseUrl(req)}/${observationId}`)
              console.info(`successfully stored attachment ${attachmentId} on observation ${observationId}`)
              return void(afterUploadStream(() => res.json(attachmentJson)))
            }
            if (appRes.error) {
              const error = appRes.error
              afterUploadStream(() => next(error))
            }
            else {
              afterUploadStream(sendInvalidRequestStructure)
            }
            /*
            per busboy docs, drain the stream and ignore the contents; necessary
            for the busboy stream to terminate properly
            */
            stream.resume()
          })
          .on('field', (fieldName, content, info) => {
            console.error(`unexpected field ${fieldName} uploading attachment ${attachmentId} on observation ${observationId}`)
            afterUploadStream(sendInvalidRequestStructure)
          })
          .on('filesLimit', () => {
            console.error(`too many file parts in upload request for attachment ${attachmentId} on observation ${observationId}`)
            afterUploadStream(sendInvalidRequestStructure)
          })
          .on('fieldsLimit', () => {
            console.error(`too many field parts in upload request for attachment ${attachmentId} on observation ${observationId}`)
            afterUploadStream(sendInvalidRequestStructure)
          })
          .on('close', () => {
            req.attachmentUpload?.emit(afterUploadStreamEvent)
            req.attachmentUpload?.removeAllListeners()
          })
        )
      }
    )
    .get(async (req, res, next) => {
      const minDimension = parseInt(String(req.query.size), 10) || undefined
      const contentRange = req.headers.range ?
        req.headers.range.replace(/bytes=/i, '').split('-').map(x => parseInt(x, 10)).filter(x => typeof x === 'number' && !Number.isNaN(x)) : []
      const appReq: ReadAttachmentContentRequest = createAppRequest(req, {
        observationId: req.params.observationId,
        attachmentId: req.params.attachmentId,
        minDimension,
        contentRange: contentRange.length === 2 ? { start: contentRange[0], end: contentRange[1] } : undefined
      })
      const appRes = await app.readAttachmentContent(appReq)
      if (appRes.error) {
        return next(appRes.error)
      }
      const content = appRes.success
      if (!content) {
        return res.status(500).json({ message: 'unknown application response' })
      }
      const { bytesRange } = content
      const headers = {
        'content-type': String(content.attachment.contentType),
        'content-length': String(bytesRange ? bytesRange.end - bytesRange.start + 1 : content.attachment.size!)
      } as any
      if (bytesRange) {
        headers['content-range'] = `bytes ${bytesRange.start}-${bytesRange.end}/${content.attachment.size || '*'}`
      }
      return content.bytes.pipe(res.writeHead(bytesRange ? 206 : 200, headers))
    })
    .delete(async (req, res, next) => {
      // TODO: this should go away when ios app is fixed to stop sending delete requests
      res.sendStatus(204)
    })

  routes.route('/:observationId')
    .put(async (req, res, next) => {
      const body = req.body
      const observationId = req.params.observationId
      if (Object.prototype.hasOwnProperty.call(body, 'id') && body.id !== observationId) {
        return res.status(400).json({ message: 'Body observation ID does not match path observation ID' })
      }
      const mod = exoObservationModFromJson({ ...body, id: observationId })
      if (mod instanceof Error) {
        return next(mod)
      }
      const appReq: SaveObservationRequest = createAppRequest(req, { observation: mod })
      if (Object.prototype.hasOwnProperty.call(body, 'eventId') && body.eventId !== appReq.context.mageEvent.id) {
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