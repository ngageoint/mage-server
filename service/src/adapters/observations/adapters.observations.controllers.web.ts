/* eslint-disable @typescript-eslint/explicit-function-return-type */
import express from 'express'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import { AllocateObservationId, ExoAttachment, ExoIncomingAttachmentContent, ExoObservation, ObservationRequest, ReadAttachmentContent, ReadAttachmentContentRequest, SaveObservation, SaveObservationRequest, StoreAttachmentContent, StoreAttachmentContentRequest } from '../../app.api/observations/app.api.observations'
import { AttachmentStore, EventScopedObservationRepository, ObservationState } from '../../entities/observations/entities.observations'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import busboy from 'busboy'
import { invalidInput } from '../../app.api/app.api.errors'
import { exoObservationModFromJson } from './adapters.observations.dto.ecma404-json'
import { scanAttachmentWithClamAV } from './adapters.attachments.clamav'

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

export type ObservationWebAppRequestFactory = <Params extends object>(req: express.Request, params?: Params) => Params & ObservationRequest<unknown>
export type EnsureEventScope = (eventId: MageEventId) => Promise<null | { mageEvent: MageEvent, observationRepository: EventScopedObservationRepository }>
export function ObservationRoutes(app: ObservationAppLayer, attachmentStore: AttachmentStore, createAppRequest: ObservationWebAppRequestFactory): express.Router {

  const routes = express.Router().use(express.json())

  // --------------------------------------
  // Allocate Observation ID
  // --------------------------------------
  routes.route('/id')
    .post(async (req, res, next) => {
      const appReq = createAppRequest(req)
      const appRes = await app.allocateObservationId(appReq)
      const id = appRes.success
      const path = `${req.baseUrl}/${id}`
      if (id) {
        return res.status(201).location(path).json({
          id,
          eventId: appReq.context.mageEvent.id,
          url: `${req.getRoot()}${path}`
        })
      }
      next(appRes.error)
    })

  // --------------------------------------
  // Attachment upload / download / delete
  // --------------------------------------
  routes.route('/:observationId/attachments/:attachmentId')
    .put(
      // 1️⃣ Init Busboy for multipart upload
      (req, res, next) => {
        try {
          req.attachmentUpload = busboy({
            headers: req.headers,
            limits: { files: 1, fields: 0 }
          })
        } catch (err) {
          console.error('Error initializing attachment upload\n', req.params, '\nheaders:\n', req.headers, '\n', err)
          return res.status(400).json({ message: err instanceof Error ? err.message : String(err) })
        }
        next()
      },
      // 2️⃣ Handle Busboy streams
      async (req, res, next) => {
        const { observationId, attachmentId } = req.params
        const sendInvalidRequestStructure = () => next(invalidInput(`request must contain only one file part named 'attachment'`))

        req.pipe(req.attachmentUpload!
          .on('file', async (fieldName, stream, info) => {
            console.log('Received file', fieldName, info)

            if (fieldName !== 'attachment') {
              console.error(`Unexpected file entry '${fieldName}' uploading attachment ${attachmentId} on observation ${observationId}`)
              stream.resume()
              return sendInvalidRequestStructure()
            }

            // -------------------------------
            // PLAN FOR PRE-DISK CLAMAV SCAN
            // -------------------------------
            // 1. 'stream' is the first point we have the uploaded file bytes (BLOB in memory)
            // 2. Before writing anything to disk ($MAGE_ATTACHMENT_DIR), pipe 'stream' through ClamAV
            // 3. Fail fast if ClamAV detects infection: reject request, do NOT persist bytes or metadata
            // 4. Only after ClamAV scan passes, pass the clean stream to storeAttachmentContent()
            // 5. storeAttachmentContent() will handle fs.move() to pod filesystem and Mongo metadata commit
            // 6. This ensures pre-disk scanning invariant: Busboy stream → ClamAV → clean stream → storage
            // -------------------------------

            try {
              const cleanStream = await scanAttachmentWithClamAV(stream)

              const content: ExoIncomingAttachmentContent = {
                bytes: cleanStream,
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
                console.info(`Successfully stored attachment ${attachmentId} on observation ${observationId}`)
                return res.json(attachmentJson)
              }

              if (appRes.error) return next(appRes.error)
              sendInvalidRequestStructure()
            } catch (err) {
              console.error('Error processing attachment upload:', err)
              return next(err)
            }
          })
          .on('field', (fieldName) => {
            console.error(`Unexpected field ${fieldName} uploading attachment ${attachmentId}`)
            sendInvalidRequestStructure()
          })
          .on('filesLimit', () => sendInvalidRequestStructure())
          .on('fieldsLimit', () => sendInvalidRequestStructure())
          .on('close', () => req.attachmentUpload?.removeAllListeners())
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
    .delete(async (req, res) => {
      res.sendStatus(204)
    })

  // --------------------------------------
  // Update Observation
  // --------------------------------------
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
        return res.json(jsonForObservation(appRes.success, qualifiedBaseUrl(req)))
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
