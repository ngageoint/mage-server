import express from 'express'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import { AllocateObservationId, ExoAttachment, ExoIncomingAttachmentContent, ExoObservation, ExoObservationMod, ObservationRequest, ObservationSearch, ReadAttachmentContent, ReadAttachmentContentRequest, ReadObservations, SaveObservation, SaveObservationRequest, StoreAttachmentContent, StoreAttachmentContentRequest, parseConditionFilter } from '../../app.api/observations/app.api.observations'
import { AttachmentStore, EventScopedObservationRepository, FindObservationsSort, FindObservationsSortField, ObservationFieldFilter, ObservationState } from '../../entities/observations/entities.observations'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import busboy from 'busboy'
import { invalidInput, InvalidInputError, MageError } from '../../app.api/app.api.errors'
import { exoObservationModFromJson } from './adapters.observations.dto.ecma404-json'
import moment from 'moment'
import { PagingParameters } from '../../entities/entities.global'

declare module 'express-serve-static-core' {
  interface Request {
    attachmentUpload: busboy.Busboy | null
  }
}

export interface ObservationAppLayer {
  readObservations: ReadObservations
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

  const readObservations: express.RequestHandler = async (req, res, next) => {
    const search = parseObservationParams(req.query, req.body)
    if (search instanceof MageError) {
      return next(search)
    }
    const mapping = ((observation: ExoObservation) => jsonForObservation(observation, qualifiedBaseUrl(req)))
    const appReq = createAppRequest(req, { search, mapping })
    const appRes = await app.readObservations(appReq)
    if (appRes.success) {
      return res.json(appRes.success)
    }
    next(appRes.error)
  }
  routes.route('/').get(readObservations)
  routes.route('/search').post(readObservations)

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

/**
 * Attempt to parse the given string to an array of numbers that represents a
 * bounding box of the form [ xMin, yMin, xMax, yMax ].  This does not validate
 * lat/lon bounds, only array length and number type.  The string can be a
 * JSON string number array (deprecated), e.g., `'[ 1, 2, 3, 4 ]'`, or a comma-
 * separated list, e.g., `'1,2,3,4'`.
 */
function parseBBox(param: any): number[] | InvalidInputError {
  if (typeof param !== 'string') {
    return invalidInput('bbox must be a string.', [ 'bbox' ])
  }

  let bbox: number[] = []
  try {
    const json = JSON.parse(param)
    if (Array.isArray(json)) {
      bbox = json
    }
  } catch (err) {
    bbox = param.split(',').map(parseFloat)
  }

  if (bbox.length !== 4 || bbox.some(corner => typeof corner !== 'number' || isNaN(corner))) {
    return invalidInput('bbox invalid.', [ 'bbox' ])
  }

  return bbox
}

const observationStateNames: ObservationState['name'][] = [ 'active', 'archived' ]

/**
 * Parse observation state name strings from the given input string.  This expects the input string to be
 * comma-separated values with no spaces.  Only parse the first N state names, where N is number of valid state names.
 * Return error if the input is not a string or contains no valid state names.
 */
function parseStatesParam(param: any): ObservationState['name'][] | InvalidInputError {
  if (typeof param !== 'string') {
    return invalidInput('states must be a string.', [ 'states' ])
  }
  const states = param.split(',', observationStateNames.length).reduce((states: Set<ObservationState['name']>, stateName: any) => {
    if (observationStateNames.includes(stateName) && !states.has(stateName)) {
      return states.add(stateName)
    }
    return states
  }, new Set<ObservationState['name']>())

  return states.size > 0 ? Array.from(states.values()) : invalidInput('no valid states', [ 'states' ])
}

const allowedSortFields: Record<FindObservationsSortField, true> = {
  lastModified: true,
  timestamp: true,
}

/**
 * Parse a sort field specification of the form `field+order`, where `field` is the name of an observation field,
 * and `order` is `desc`, `-`, or `-1`, to indicate a descending sort.  The default sort order is ascending.  Only the
 * first valid sort field is used
 */
function parseSortParam(param: any): FindObservationsSort | InvalidInputError {
  if (typeof param !== 'string') {
    return invalidInput('sort must be a string.', [ 'sort' ])
  }

  const sort = param.split(',').reduce<FindObservationsSort[]>((sort, sortFieldSpec) => {
    const [ name, orderString ] = sortFieldSpec.split('+')
    const order: 1 | -1 = orderString?.toLowerCase() === 'desc' || orderString === '-' || orderString === '-1' ? -1 : 1
    if (name in allowedSortFields) {
      return [ ...sort, { field: name as FindObservationsSortField, order } ]
    }
    return sort
  }, [])[0]

  return sort || invalidInput('sort invalid', [ 'sort' ])
}

function parsePagingParam(param: any): PagingParameters | InvalidInputError {
  const pageSize = parseInt(param.page_size, 10)
  if (!pageSize || pageSize < 1) {
    return invalidInput('page_size must be an int greater than 0', [ 'page_size' ])
  }

  const page = parseInt(param.page, 10)

  const includeTotalCount = param.include_total_count === 'true' || false

  return { pageIndex: page > 0 ? page : 0, pageSize, includeTotalCount }
}

function parseFilterParam(keyword: any, body: any): ObservationFieldFilter | undefined {
  const fieldFilter: ObservationFieldFilter = {}
  if (body) {
    if (typeof body.keyword === 'string' && body.keyword.length) {
      fieldFilter.keyword = body.keyword
    }

    if (body.condition) {
      const condition = parseConditionFilter(body.condition)
      if (condition) {
        fieldFilter.condition = condition
      }
    }
  }

  if (typeof keyword === 'string' && keyword.length > 0) {
    fieldFilter.keyword = keyword
  }

  return Object.keys(fieldFilter).length ? fieldFilter : undefined
}

function parseISO8601(iso8601: string): Date | undefined {
  const date = moment(iso8601, moment.ISO_8601, true)
  if (typeof iso8601 === 'string' && date.isValid()) {
    return date.toDate()
  }
}

function parseObservationParams(query: any, body: any): ObservationSearch | InvalidInputError {
  const params = { ...query, ...body }
  const find: ObservationSearch = {}

  if (params.startDate) {
    const startDate = parseISO8601(params.startDate)
    if (startDate) {
      find.lastModifiedAfter = startDate
    } else {
      return invalidInput('startDate must be a valid ISO-8601 date.', [ 'startDate' ])
    }
  }

  if (params.endDate) {
    const endDate = parseISO8601(params.endDate)
    if (endDate) {
      find.lastModifiedBefore = endDate
    } else {
      return invalidInput('endDate must be a valid ISO-8601 date.', [ 'endDate' ])
    }
  }

  if (params.observationStartDate) {
    const startDate = parseISO8601(params.observationStartDate)
    if (startDate) {
      find.timestampAfter = startDate
    } else {
      return invalidInput('observationStartDate must be a valid ISO-8601 date.', [ 'observationStartDate' ])
    }
  }

  if (params.observationEndDate) {
    const endDate = parseISO8601(params.observationEndDate)
    if (endDate) {
      find.timestampBefore = endDate
    } else {
      return invalidInput('observationEndDate must be a valid ISO-8601 date.', [ 'observationEndDate' ])
    }
  }

  if (params.bbox) {
    const bboxParam = parseBBox(params.bbox)
    if (bboxParam instanceof MageError) {
      return bboxParam
    }
    find.geometryIntersects = bboxParam as [number, number, number, number]
  }

  if (params.states) {
    const states = parseStatesParam(params.states)
    if (states instanceof MageError) {
      return states
    }
    find.stateIsAnyOf = states
  }

  if (params.favoritedBy) {
    if (typeof params.favoritedBy === 'string') {
      find.isFavoriteOfUser = params.favoritedBy
    } else {
      return invalidInput('favoritedBy must be a string.', [ 'favoritedBy' ])
    }
  }

  if (params.important) {
    if (params.important === 'true') {
      find.isFlaggedImportant = true
    } else if (params.important !== 'false') {
      return invalidInput('important must be true or false', [ 'important' ])
    }
  }

  if (params.hasAttachments) {
    if (params.hasAttachments === 'true') {
      find.hasAttachments = true
    } else if (params.hasAttachments !== 'false') {
      return invalidInput('hasAttachments must be true or false', [ 'hasAttachments' ])
    }
  }

  if (params.users) {
    if (typeof params.users === 'string') {
      find.userIsAnyOf = params.users.split(',')
    } else if (Array.isArray(params.users)) {
      find.userIsAnyOf = params.users
    } else {
      return invalidInput('users must be CSV string or array user ids', [ 'users' ])
    }
  }

  if (params.teams) {
    if (typeof params.teams === 'string') {
      find.teamIsAnyOf = params.teams.split(',')
    } else if (Array.isArray(params.teams)) {
      find.teamIsAnyOf = params.teams
    } else {
      return invalidInput('teams must be CSV string or array of team ids', [ 'teams' ])
    }
  }

  const filter = parseFilterParam(query.keyword, body)
  if (filter) {
    find.filter = filter
  }

  if (params.sort) {
    const sort = parseSortParam(params.sort)
    if (sort instanceof MageError) {
      return sort
    }
    find.orderBy = sort
  }

  if (params.page_size) {
    const paging = parsePagingParam(params)
    if (paging instanceof MageError) {
      return paging
    }
    find.paging = paging
  }

  find.populateUserNames = params.populate === 'true'

  return find
}