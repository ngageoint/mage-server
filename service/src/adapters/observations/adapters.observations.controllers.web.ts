/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { scanAttachmentWithClamAV } from './adapters.attachments.clamav'
import { Readable } from 'stream'
import express from 'express'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import {
  AllocateObservationId,
  ExoAttachment,
  ExoIncomingAttachmentContent,
  ExoObservation,
  ObservationRequest,
  ReadAttachmentContent,
  ReadAttachmentContentRequest,
  SaveObservation,
  SaveObservationRequest,
  StoreAttachmentContent,
  StoreAttachmentContentRequest
} from '../../app.api/observations/app.api.observations'
import {
  AttachmentStore,
  EventScopedObservationRepository,
  ObservationState
} from '../../entities/observations/entities.observations'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import busboy from 'busboy'
import { invalidInput } from '../../app.api/app.api.errors'
import { exoObservationModFromJson } from './adapters.observations.dto.ecma404-json'

declare module 'express-serve-static-core' {
  interface Request {
    attachmentUpload?: busboy.Busboy
  }
}

export interface ObservationAppLayer {
  allocateObservationId: AllocateObservationId
  saveObservation: SaveObservation
  storeAttachmentContent: StoreAttachmentContent
  readAttachmentContent: ReadAttachmentContent
}

export type ObservationWebAppRequestFactory = <Params extends object>(
  req: express.Request,
  params?: Params
) => Params & ObservationRequest<unknown>
export type EnsureEventScope = (
  eventId: MageEventId
) => Promise<null | { mageEvent: MageEvent; observationRepository: EventScopedObservationRepository }>

export function ObservationRoutes(
  app: ObservationAppLayer,
  attachmentStore: AttachmentStore,
  createAppRequest: ObservationWebAppRequestFactory
): express.Router {
  const routes = express.Router()

  // --------------------------------------
  // Allocate Observation ID
  // --------------------------------------
  routes.route('/id').post(async (req, res, next) => {
    try {
      const appReq = createAppRequest(req)
      console.log('🔹 [DEBUG] Allocating observation ID, appReq:', appReq)
      const appRes = await app.allocateObservationId(appReq)
      const id = appRes.success
      const path = `${req.baseUrl}/${id}`
      if (id) {
        console.log('🟢 [DEBUG] Allocated observation ID:', id)
        return res.status(201).location(path).json({
          id,
          eventId: appReq.context.mageEvent.id,
          url: `${req.getRoot()}${path}`
        })
      }
      next(appRes.error)
    } catch (err) {
      console.log('❌ [DEBUG] Exception in /id route:', err)
      next(err)
    }
  })

  // --------------------------------------
  // Attachment upload / download / delete
  // --------------------------------------
  routes
    .route('/:observationId/attachments/:attachmentId')
    .put(async (req, res, next) => {
      try {
        console.log('🔹 [DEBUG] Incoming attachment PUT request:', req.params)
        const bb = busboy({ headers: req.headers, limits: { files: 1, fields: 0 } })
        let handled = false

        bb.on('file', async (fieldName, fileStream, info) => {
          console.log('🔹 [DEBUG] Busboy received file field: ', fieldName, info)
          if (handled) {
            console.log('⚠️ [DEBUG] Already handled a file, skipping extra stream')
            return fileStream.resume()
          }
          handled = true

          if (fieldName !== 'attachment') {
            console.log('⚠️ [DEBUG] Unexpected field name, rejecting file')
            fileStream.resume()
            return next(invalidInput(`request must contain only one file part named 'attachment'`))
          }

          try {
            // -----------------------------
            // FIX: Guarantee file has bytes
            // -----------------------------
            // Step 1: fully buffer the uploaded file
            const originalChunks: Buffer[] = []
            for await (const chunk of fileStream) {
              originalChunks.push(chunk as Buffer)
            }
            const originalBuffer = Buffer.concat(originalChunks)
            console.log('🔹 [DEBUG] Buffered original file size:', originalBuffer.length)

            // Step 2: scan with ClamAV
            const passThrough = Readable.from(originalBuffer)
            const scannedStream: Readable = await scanAttachmentWithClamAV(passThrough)

            // Step 3: buffer scanned output
            const scannedChunks: Buffer[] = []
            for await (const chunk of scannedStream) {
              scannedChunks.push(chunk as Buffer)
            }
            let finalBuffer = Buffer.concat(scannedChunks)
            console.log('🔹 [DEBUG] Scanned file size:', finalBuffer.length)

            // Step 4: fallback if scanned result is empty
            if (finalBuffer.length === 0) {
              console.log('⚠️ [DEBUG] Scanned file empty, using original buffer')
              finalBuffer = originalBuffer
            }

            const { observationId, attachmentId } = req.params
            const content: ExoIncomingAttachmentContent = {
              bytes: Readable.from(finalBuffer),
              mediaType: info.mimeType,
              name: info.filename
            }

            const appReqParams: Omit<StoreAttachmentContentRequest, 'context'> = {
              observationId,
              attachmentId,
              content
            }
            const appReq: StoreAttachmentContentRequest = createAppRequest(req, appReqParams)
            console.log('🔹 [DEBUG] Prepared content object for storage:', content)
            const appRes = await app.storeAttachmentContent(appReq)
            console.log('🟢 [DEBUG] storeAttachmentContent response:', appRes)

            if (appRes.success) {
              const attachment = appRes.success.attachments.find(x => x.id === appReq.attachmentId)!
              const attachmentJson = jsonForAttachment(
                attachment,
                `${qualifiedBaseUrl(req)}/${observationId}`
              )
              console.log('🟢 [DEBUG] Returning attachment JSON:', attachmentJson)
              return res.json(attachmentJson)
            }

            if (appRes.error) {
              console.log('❌ [DEBUG] Error storing attachment:', appRes.error)
              return next(appRes.error)
            }

            next(invalidInput('Attachment could not be stored'))
          } catch (err) {
            console.log('❌ [DEBUG] Exception during file handling:', err)
            return next(err)
          }
        })

        bb.on('field', (name, val) => {
          console.log('🔹 [DEBUG] Unexpected form field detected:', name, val)
          next(invalidInput(`unexpected form field`))
        })
        bb.on('filesLimit', () => {
          console.log('⚠️ [DEBUG] Busboy filesLimit reached')
          next(invalidInput(`too many files`))
        })
        bb.on('fieldsLimit', () => {
          console.log('⚠️ [DEBUG] Busboy fieldsLimit reached')
          next(invalidInput(`too many fields`))
        })
        bb.on('error', (err) => {
          console.log('❌ [DEBUG] Busboy error:', err)
          next(err)
        })

        req.pipe(bb)
      } catch (err) {
        console.log('❌ [DEBUG] Exception in attachment PUT route:', err)
        next(err)
      }
    })
    .get(async (req, res, next) => {
      try {
        console.log('🔹 [DEBUG] Attachment GET request:', req.params, req.query)
        const sizeParam = req.query.size;
        const minDimension =
          typeof sizeParam === 'string' ? parseInt(sizeParam, 10) : undefined;
        
        const contentRange = req.headers.range
          ? req.headers.range
              .replace(/bytes=/i, '')
              .split('-')
              .map(x => parseInt(x, 10))
              .filter(x => typeof x === 'number' && !Number.isNaN(x))
          : []
        console.log('🔹 [DEBUG] Parsed contentRange:', contentRange)

        const appReq: ReadAttachmentContentRequest = createAppRequest(req, {
          observationId: req.params.observationId,
          attachmentId: req.params.attachmentId,
          minDimension,
          contentRange:
            contentRange.length === 2 ? { start: contentRange[0], end: contentRange[1] } : undefined
        })
        const appRes = await app.readAttachmentContent(appReq)
        if (appRes.error) {
          console.log('❌ [DEBUG] readAttachmentContent returned error:', appRes.error)
          return next(appRes.error)
        }

        const content = appRes.success
        if (!content) {
          console.log('⚠️ [DEBUG] readAttachmentContent returned no content')
          return res.status(500).json({ message: 'unknown application response' })
        }

        const { bytesRange } = content
        const headers: any = {
          'content-type': String(content.attachment.contentType)
        }

        if (content.attachment.size && content.attachment.size > 0) {
          headers['content-length'] = String(
            bytesRange
              ? bytesRange.end - bytesRange.start + 1
              : content.attachment.size
          )
        }

        if (bytesRange) {
          headers['content-range'] = `bytes ${bytesRange.start}-${bytesRange.end}/${
            content.attachment.size || '*'
          }`
        }

        console.log('🔹 [DEBUG] Sending attachment bytes with headers:', headers)
        return content.bytes.pipe(res.writeHead(bytesRange ? 206 : 200, headers))
      } catch (err) {
        console.log('❌ [DEBUG] Exception in attachment GET route:', err)
        next(err)
      }
    })
    .delete(async (req, res) => {
      console.log('🔹 [DEBUG] Attachment DELETE request:', req.params)
      res.sendStatus(204)
    })

  // --------------------------------------
  // Update Observation
  // --------------------------------------
  routes.route('/:observationId').put(async (req, res, next) => {
    try {
      console.log('🔹 [DEBUG] Update Observation PUT request:', req.params, req.body)
      const body = req.body
      const observationId = req.params.observationId
      if (Object.prototype.hasOwnProperty.call(body, 'id') && body.id !== observationId) {
        console.log('⚠️ [DEBUG] Body observation ID mismatch:', body.id, observationId)
        return res
          .status(400)
          .json({ message: 'Body observation ID does not match path observation ID' })
      }
      const mod = exoObservationModFromJson({ ...body, id: observationId })
      if (mod instanceof Error) {
        console.log('❌ [DEBUG] Failed to create observation mod:', mod)
        return next(mod)
      }
      const appReq: SaveObservationRequest = createAppRequest(req, { observation: mod })
      if (
        Object.prototype.hasOwnProperty.call(body, 'eventId') &&
        body.eventId !== appReq.context.mageEvent.id
      ) {
        console.log('⚠️ [DEBUG] Body event ID mismatch:', body.eventId, appReq.context.mageEvent.id)
        return res.status(400).json({ message: 'Body event ID does not match path event ID' })
      }
      const appRes = await app.saveObservation(appReq)
      console.log('🟢 [DEBUG] saveObservation response:', appRes)
      if (appRes.success) return res.json(jsonForObservation(appRes.success, qualifiedBaseUrl(req)))
      next(appRes.error)
    } catch (err) {
      console.log('❌ [DEBUG] Exception in Update Observation route:', err)
      next(err)
    }
  })

  return routes.use(compatibilityMageAppErrorHandler)
}

// ----------------------
// JSON serialization
// ----------------------
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
    state: o.state ? { ...o.state, url: `${obsUrl}/states/${o.state.id as string}` } : void 0,
    attachments: o.attachments.map(a => jsonForAttachment(a, obsUrl))
  }
}

export function jsonForAttachment(a: ExoAttachment, observationUrl: string): WebAttachment {
  return { ...a, url: a.contentStored ? `${observationUrl}/attachments/${a.id}` : void 0 }
}

function qualifiedBaseUrl(req: express.Request): string {
  return req.getRoot() + req.baseUrl
}
