import { URL } from 'url'
import { FeedServiceTypeRepository, FeedServiceRepository, FeedTopic, FeedService, InvalidServiceConfigError, FeedContent, Feed, FeedTopicId, FeedServiceConnection, FeedRepository, FeedCreateUnresolved, FeedCreateMinimal, FeedServiceType, FeedServiceId, FeedCreateAttrs, MapStyle } from '../../entities/feeds/entities.feeds';
import * as api from '../../app.api/feeds/app.api.feeds'
import { AppRequest, KnownErrorsOf, withPermission, AppResponse } from '../../app.api/app.api.global'
import { PermissionDeniedError, EntityNotFoundError, InvalidInputError, entityNotFound, invalidInput, MageError, KeyPathError } from '../../app.api/app.api.errors'
import { FeedServiceTypeDescriptor } from '../../app.api/feeds/app.api.feeds'
import { JsonSchemaService, JsonValidator, JSONSchema4 } from '../../entities/entities.json_types'
import { MageEventRepository } from '../../entities/events/entities.events'
import { SourceUrlStaticIconReference, StaticIconImportFetch, StaticIconReference, StaticIconRepository } from '../../entities/icons/entities.icons'
import { UrlResolutionError } from '../../entities/entities.global'


export function ListFeedServiceTypes(permissionService: api.FeedsPermissionService, repo: FeedServiceTypeRepository): api.ListFeedServiceTypes {
  return function listFeedServiceTypes(req: AppRequest): ReturnType<api.ListFeedServiceTypes> {
    return withPermission(
      permissionService.ensureListServiceTypesPermissionFor(req.context),
      async () => {
        const all = await repo.findAll()
        return all.map(x => FeedServiceTypeDescriptor(x))
      }
    )
  }
}

export function PreviewTopics(permissionService: api.FeedsPermissionService, repo: FeedServiceTypeRepository): api.PreviewTopics {
  return function previewTopics(req: api.PreviewTopicsRequest): ReturnType<api.PreviewTopics> {
    return withPermission<FeedTopic[], KnownErrorsOf<api.PreviewTopics>>(
      permissionService.ensureCreateServicePermissionFor(req.context),
      async (): Promise<FeedTopic[] | PermissionDeniedError | EntityNotFoundError | InvalidInputError> => {
        const serviceType = await repo.findById(req.serviceType)
        if (!serviceType) {
          return entityNotFound(req.serviceType, 'FeedServiceType')
        }
        const invalid = await serviceType.validateServiceConfig(req.serviceConfig)
        if (invalid) {
          return invalidInputServiceConfig(invalid, 'serviceConfig')
        }
        const conn = await serviceType.createConnection(req.serviceConfig)
        return await conn.fetchAvailableTopics()
      }
    )
  }
}

export function CreateFeedService(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository): api.CreateFeedService {
  return function createFeedService(req: api.CreateFeedServiceRequest): ReturnType<api.CreateFeedService> {
    return withPermission<FeedService, KnownErrorsOf<api.CreateFeedService>>(
      permissionService.ensureCreateServicePermissionFor(req.context),
      async (): Promise<FeedService | EntityNotFoundError | InvalidInputError> => {
        const serviceType = await serviceTypeRepo.findById(req.serviceType)
        if (!serviceType) {
          return entityNotFound(req.serviceType, 'FeedServiceType')
        }
        const invalid = await serviceType.validateServiceConfig(req.config)
        if (invalid) {
          return invalidInputServiceConfig(invalid, 'config')
        }
        const created = await serviceRepo.create({
          serviceType: req.serviceType,
          title: req.title,
          summary: req.summary || null,
          config: req.config
        })
        return redactServiceConfig(created, serviceType)
      }
    )
  }
}

export function ListFeedServices(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository): api.ListFeedServices {
  return function listFeedServices(req: AppRequest): ReturnType<api.ListFeedServices> {
    return withPermission<FeedService[], KnownErrorsOf<api.ListFeedServices>>(
      permissionService.ensureListServicesPermissionFor(req.context),
      async (): Promise<FeedService[]> => {
        const serviceTypes = new Map((await serviceTypeRepo.findAll()).map(x => {
          return [ x.id, x ]
        }))
        const services: FeedService[] = []
        ;(await serviceRepo.findAll()).forEach(x => {
          const serviceType = serviceTypes.get(x.serviceType)
          if (!serviceType) {
            return
          }
          const redactedService = redactServiceConfig(x, serviceType)
          services.push(redactedService)
        })
        return services
      }
    )
  }
}

export function GetFeedService(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository): api.GetFeedService {
  return function getFeedService(req: api.GetFeedServiceRequest): ReturnType<api.GetFeedService> {
    return withPermission<api.FeedServiceExpanded, KnownErrorsOf<api.GetFeedService>>(
      permissionService.ensureListServicesPermissionFor(req.context),
      async (): Promise<api.FeedServiceExpanded | EntityNotFoundError> => {
        const service = await serviceRepo.findById(req.service)
        if (!service) {
          return entityNotFound(req.service, 'FeedService')
        }
        const serviceType = await serviceTypeRepo.findById(service.serviceType)
        if (!serviceType) {
          return entityNotFound(service.serviceType, 'FeedServiceType')
        }
        const redacted = redactServiceConfig(service, serviceType)
        return Object.assign({ ...redacted }, { serviceType: FeedServiceTypeDescriptor(serviceType) })
      }
    )
  }
}

export function DeleteFeedService(permissionService: api.FeedsPermissionService, serviceRepo: FeedServiceRepository, feedRepo: FeedRepository, eventRepo: MageEventRepository): api.DeleteFeedService {
  return async function deleteFeedService(req: api.DeleteFeedServiceRequest): ReturnType<api.DeleteFeedService> {
    return withPermission<true, KnownErrorsOf<api.DeleteFeedService>>(
      permissionService.ensureCreateServicePermissionFor(req.context),
      async (): Promise<true | EntityNotFoundError> => {
        const service = await serviceRepo.findById(req.service)
        if (!service) {
          return entityNotFound(req.service, 'FeedService')
        }
        const serviceFeeds = await feedRepo.findFeedsForService(service.id)
        if (serviceFeeds.length) {
          eventRepo.removeFeedsFromEvents(...serviceFeeds.map(x => x.id))
        }
        await feedRepo.removeByServiceId(service.id)
        const removed = await serviceRepo.removeById(service.id)
        if (removed) {
          return true
        }
        return entityNotFound(service.id, 'FeedService', 'service was already removed')
      }
    )
  }
}

export function ListServiceTopics(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository): api.ListServiceTopics {
  return async function listTopics(req: api.ListServiceTopicsRequest): ReturnType<api.ListServiceTopics> {
    const service = await serviceRepo.findById(req.service)
    if (!service) {
      return AppResponse.error<FeedTopic[], EntityNotFoundError>(entityNotFound(req.service, 'FeedService'))
    }
    const serviceType = await serviceTypeRepo.findById(service.serviceType)
    if (!serviceType) {
      return AppResponse.error<FeedTopic[], EntityNotFoundError>(entityNotFound(service.serviceType, 'FeedServiceType'))
    }
    return await withPermission<FeedTopic[], KnownErrorsOf<api.ListServiceTopics>>(
      permissionService.ensureListTopicsPermissionFor(req.context, service.id),
      async (): Promise<FeedTopic[] | EntityNotFoundError> => {
        const conn = await serviceType.createConnection(service.config)
        return await conn.fetchAvailableTopics()
      }
    )
  }
}

type ContentFetchDependencies = {
  serviceTypeRepo: FeedServiceTypeRepository,
  serviceRepo: FeedServiceRepository,
  jsonSchemaService?: JsonSchemaService,
}

type ContentFetchContext = {
  serviceType: FeedServiceType,
  service: FeedService,
  topic: FeedTopic,
  conn: FeedServiceConnection,
  variableParamsValidator?: JsonValidator,
}

interface WithContentFetchContext<R> {
  then(createFeedOp: (context: ContentFetchContext) => Promise<R>): () => Promise<EntityNotFoundError | InvalidInputError | R>
}

async function buildFetchContext(deps: ContentFetchDependencies, serviceId: FeedServiceId, topicId: FeedTopicId, variableParamsSchema?: JSONSchema4 | null): Promise<ContentFetchContext | EntityNotFoundError | InvalidInputError> {
  const service = await deps.serviceRepo.findById(serviceId)
  if (!service) {
    return entityNotFound(serviceId, 'FeedService')
  }
  const serviceType = await deps.serviceTypeRepo.findById(service.serviceType)
  if (!serviceType) {
    return entityNotFound(service.serviceType, 'FeedServiceType')
  }
  const conn = await serviceType.createConnection(service.config)
  const topics = await conn.fetchAvailableTopics()
  const topic = topics.find(x => x.id === topicId)
  if (!topic) {
    return entityNotFound(topicId, 'FeedTopic')
  }
  let variableParamsValidator: JsonValidator | undefined = undefined
  if (variableParamsSchema && deps.jsonSchemaService) {
    try {
      variableParamsValidator = await deps.jsonSchemaService.validateSchema(variableParamsSchema)
    }
    catch (err) {
      return invalidInput('invalid variable parameters schema', [ err, 'feed', 'variableParamsSchema' ])
    }
  }
  return { serviceType, service, topic, conn, variableParamsValidator }
}

interface FetchContextParams {
  service: FeedServiceId
  topic: FeedTopicId
  variableParamsSchema?: JSONSchema4 | null
}

function withFetchContext<R>(deps: ContentFetchDependencies, { service, topic, variableParamsSchema }: FetchContextParams): WithContentFetchContext<R> {
  return {
    then(operation: (fetchContext: ContentFetchContext) => Promise<R>): () => Promise<EntityNotFoundError | InvalidInputError | R> {
      return async (): Promise<EntityNotFoundError | InvalidInputError | R> => {
        const fetchContext = await buildFetchContext(deps, service, topic, variableParamsSchema)
        if (fetchContext instanceof MageError) {
          return fetchContext
        }
        return await operation(fetchContext)
      }
    }
  }
}

function tryParseIconSourceUrlRef(ref: { sourceUrl: string }): SourceUrlStaticIconReference | null {
  try {
    return { sourceUrl: new URL(ref.sourceUrl) }
  }
  catch (err) {
    console.error(`error parsing icon url ${ref.sourceUrl} --`, err)
  }
  return null
}

function parseIconUrlsIfNecessary(feedMinimal: api.FeedCreateMinimalAcceptingStringUrls): FeedCreateMinimal | KeyPathError[] {
  const keyErrors: KeyPathError[] = []
  let { icon, mapStyle, ...rest } = feedMinimal
  if (icon) {
    if (typeof icon.sourceUrl === 'string') {
      icon = tryParseIconSourceUrlRef(icon as { sourceUrl: string })
      if (!icon) {
        keyErrors.push([ 'invalid icon url', 'feed', 'icon' ])
      }
    }
  }
  let mapIcon = mapStyle?.icon as api.AcceptStringUrls<MapStyle['icon']> | null
  if (mapIcon) {
    if (typeof mapIcon.sourceUrl === 'string') {
      mapIcon = tryParseIconSourceUrlRef(mapIcon as { sourceUrl: string })
      if (!mapIcon) {
        keyErrors.push([ 'invalid icon url', 'feed', 'mapStyle', 'icon'])
      }
    }
  }
  if (keyErrors.length) {
    return keyErrors
  }
  const parsed: FeedCreateMinimal = rest
  if (icon !== undefined) {
    parsed.icon = icon as StaticIconReference | null
  }
  if (mapStyle !== undefined) {
    if (mapIcon) {
      mapStyle = { ...mapStyle, icon: mapIcon }
    }
    parsed.mapStyle = mapStyle as FeedCreateMinimal['mapStyle']
  }
  return parsed
}

function keyPathOfIconUrl(url: URL | string, feedMinimal: api.FeedCreateMinimalAcceptingStringUrls): string[] {
  const urlStr = String(url)
  if (urlStr === String(feedMinimal.icon)) {
    return [ 'feed', 'icon' ]
  }
  if (urlStr === String(feedMinimal.mapStyle?.icon)) {
    return [ 'feed', 'mapStyle', 'icon' ]
  }
  return []
}

async function resolveFeedCreate(topic: FeedTopic, feedMinimal: api.FeedCreateMinimalAcceptingStringUrls, iconRepo: StaticIconRepository, iconFetch: StaticIconImportFetch = StaticIconImportFetch.Lazy): Promise<FeedCreateAttrs | KeyPathError[]> {
  const feedMinimalParsed = parseIconUrlsIfNecessary(feedMinimal)
  if (Array.isArray(feedMinimalParsed)) {
    return feedMinimalParsed
  }
  const unresolved = FeedCreateUnresolved(topic, feedMinimalParsed)
  const errors: KeyPathError[] = []
  const icons = await Promise.all(unresolved.unresolvedIcons.map(iconUrl => {
    return iconRepo.findOrImportBySourceUrl(iconUrl, iconFetch).then(icon => {
      if (icon instanceof UrlResolutionError) {
        return errors.push([ `error resolving icon url: ${iconUrl}`, ...keyPathOfIconUrl(iconUrl, feedMinimal) ])
      }
      else {
        return ({ [String(iconUrl)]: icon.id })
      }
    })
  }))
  const iconsMerged = Object.assign({}, ...icons)
  const resolved = FeedCreateAttrs(unresolved, iconsMerged)
  return resolved
}

export function PreviewFeed(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository, jsonSchemaService: JsonSchemaService, iconRepo: StaticIconRepository): api.PreviewFeed {
  return async function previewFeed(req: api.PreviewFeedRequest): ReturnType<api.PreviewFeed> {
    const reqFeed = req.feed
    return await withPermission<api.FeedPreview, KnownErrorsOf<api.PreviewFeed>>(
      permissionService.ensureCreateFeedPermissionFor(req.context, reqFeed.service),
      withFetchContext<api.FeedPreview | InvalidInputError>({ serviceTypeRepo, serviceRepo, jsonSchemaService }, reqFeed)
        .then(async (context: ContentFetchContext): Promise<api.FeedPreview | InvalidInputError> => {
          const constantParams = reqFeed.constantParams || null
          const variableParams = req.variableParams || null
          if (variableParams && context.variableParamsValidator) {
            const invalid = await context.variableParamsValidator.validate(variableParams)
            if (invalid) {
              return invalidInput('invalid variable parameters', [ invalid, 'variableParams' ])
            }
          }
          const mergedParams = Object.assign({}, variableParams, constantParams)
          if (context.topic.paramsSchema) {
            const mergedParamsSchema = await jsonSchemaService.validateSchema(context.topic.paramsSchema)
            const invalid = await mergedParamsSchema.validate(mergedParams)
            if (invalid) {
              return invalidInput('invalid parameters',
                [ invalid, 'feed', 'constantParams' ],
                [ invalid, 'variableParams' ])
            }
          }
          const previewCreateAttrs = await resolveFeedCreate(context.topic, reqFeed, iconRepo, StaticIconImportFetch.EagerAwait)
          if (Array.isArray(previewCreateAttrs)) {
            return invalidInput('invalid icon urls', ...previewCreateAttrs)
          }
          const feedPreview: api.FeedPreview = {
            feed: previewCreateAttrs
          }
          if (req.skipContentFetch === true) {
            return feedPreview
          }
          const topicContent = await context.conn.fetchTopicContent(reqFeed.topic, mergedParams)
          const previewContent:  FeedContent & { feed: 'preview' } = {
            feed: 'preview',
            topic: topicContent.topic,
            variableParams: req.variableParams,
            items: topicContent.items,
          }
          if (topicContent.pageCursor) {
            previewContent.pageCursor = topicContent.pageCursor
          }
          feedPreview.content = previewContent
          return feedPreview
        })
    )
  }
}

export function CreateFeed(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository, feedRepo: FeedRepository, jsonSchemaService: JsonSchemaService, iconRepo: StaticIconRepository): api.CreateFeed {
  return async function createFeed(req: api.CreateFeedRequest): ReturnType<api.CreateFeed> {
    const reqFeed = req.feed
    return await withPermission<api.FeedExpanded, KnownErrorsOf<api.CreateFeed>>(
      permissionService.ensureCreateFeedPermissionFor(req.context, reqFeed.service),
      withFetchContext<api.FeedExpanded | InvalidInputError>({ serviceRepo, serviceTypeRepo, jsonSchemaService }, reqFeed)
        .then(async (context: ContentFetchContext): Promise<api.FeedExpanded | InvalidInputError> => {
          const feedResolved = await resolveFeedCreate(context.topic, reqFeed, iconRepo, StaticIconImportFetch.EagerAwait)
          if (Array.isArray(feedResolved)) {
            return invalidInput('invalid icon urls', ...feedResolved)
          }
          const feed = await feedRepo.create(feedResolved)
          return { ...feed, service: context.service, topic: context.topic }
        })
    )
  }
}

export function ListAllFeeds(permissionService: api.FeedsPermissionService, feedRepo: FeedRepository): api.ListAllFeeds {
  return async function listFeeds(req: AppRequest): ReturnType<api.ListAllFeeds> {
    return await withPermission<Feed[], KnownErrorsOf<api.ListAllFeeds>>(
      permissionService.ensureListAllFeedsPermissionFor(req.context),
      async (): Promise<Feed[]> => {
        return await feedRepo.findAll()
      }
    )
  }
}

export function ListServiceFeeds(permissionService: api.FeedsPermissionService, serviceRepo: FeedServiceRepository, feedRepo: FeedRepository): api.ListServiceFeeds {
  return async function listServiceFeeds(req: api.ListServiceFeedsRequest): ReturnType<api.ListServiceFeeds> {
    return await withPermission<Feed[], KnownErrorsOf<api.ListServiceFeeds>>(
      permissionService.ensureListAllFeedsPermissionFor(req.context),
      async (): Promise<Feed[] | EntityNotFoundError> => {
        const service = await serviceRepo.findById(req.service)
        if (!service) {
          return entityNotFound(req.service, 'FeedService')
        }
        return await feedRepo.findFeedsForService(req.service)
      }
    )
  }
}

export function GetFeed(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository, feedRepo: FeedRepository): api.GetFeed {
  return async function getFeed(req: api.GetFeedRequest): ReturnType<api.GetFeed> {
    return await withPermission<api.FeedExpanded, KnownErrorsOf<api.GetFeed>>(
      permissionService.ensureListAllFeedsPermissionFor(req.context),
      async (): Promise<api.FeedExpanded | EntityNotFoundError> => {
        const feed = await feedRepo.findById(req.feed)
        if (!feed) {
          return entityNotFound(req.feed, 'Feed')
        }
        const feedCompanions = await buildFetchContext({ serviceTypeRepo, serviceRepo }, feed.service, feed.topic)
        if (feedCompanions instanceof MageError) {
          return feedCompanions as EntityNotFoundError
        }
        const serviceRedacted = redactServiceConfig(feedCompanions.service, feedCompanions.serviceType)
        return Object.assign({ ...feed }, { service: serviceRedacted, topic: feedCompanions.topic })
      }
    )
  }
}

export function UpdateFeed(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository, feedRepo: FeedRepository, iconRepo: StaticIconRepository): api.UpdateFeed {
  return async function updateFeed(req: api.UpdateFeedRequest): ReturnType<api.UpdateFeed> {
    const feed = await feedRepo.findById(req.feed.id)
    if (!feed) {
      return AppResponse.error<api.FeedExpanded, EntityNotFoundError>(entityNotFound(req.feed.id, 'Feed'))
    }
    const invalidKeys: KeyPathError[] = []
    if ('service' in req.feed && (req.feed as any).service !== feed.service) {
      invalidKeys.push([ 'changing feed service is not allowed', 'feed', 'service' ])
    }
    if ('topic' in req.feed && (req.feed as any).topic !== feed.topic) {
      invalidKeys.push([ 'changing feed topic is not allowed', 'feed', 'topic' ])
    }
    if (invalidKeys.length) {
      return AppResponse.error<api.FeedExpanded, InvalidInputError>(invalidInput('feed service and topic cannot be modified', ...invalidKeys))
    }
    return await withPermission<api.FeedExpanded, KnownErrorsOf<api.UpdateFeed>>(
      permissionService.ensureCreateFeedPermissionFor(req.context, feed.service),
      withFetchContext<api.FeedExpanded | EntityNotFoundError | InvalidInputError>({ serviceTypeRepo, serviceRepo }, { service: feed.service, topic: feed.topic }).then(
        async (fetchContext): Promise<api.FeedExpanded | EntityNotFoundError | InvalidInputError> => {
          const updateUnresolved = { ...req.feed, service: feed.service, topic: feed.topic }
          const updateResolved = await resolveFeedCreate(fetchContext.topic, updateUnresolved as FeedCreateMinimal, iconRepo, StaticIconImportFetch.EagerAwait)
          if (Array.isArray(updateResolved)) {
            return invalidInput('invalid update request', ...updateResolved)
          }
          const updated = await feedRepo.put({ ...updateResolved, id: feed.id })
          if (!updated) {
            return entityNotFound(feed.id, 'Feed', 'feed deleted before update')
          }
          return Object.assign({ ...updated }, { service: fetchContext.service, topic: fetchContext.topic })
        }
      )
    )
  }
}

export function DeleteFeed(permissionService: api.FeedsPermissionService, feedRepo: FeedRepository, eventRepo: MageEventRepository): api.DeleteFeed {
  return async function deleteFeed(req: api.DeleteFeedRequest): ReturnType<api.DeleteFeed> {
    const feed = await feedRepo.findById(req.feed)
    if (!feed) {
      return AppResponse.error<true, EntityNotFoundError>(entityNotFound(req.feed, 'Feed'))
    }
    return await withPermission<true, KnownErrorsOf<api.DeleteFeed>>(
      permissionService.ensureCreateFeedPermissionFor(req.context, feed.service),
      async (): Promise<true | EntityNotFoundError> => {
        await eventRepo.removeFeedsFromEvents(feed.id)
        const removed = await feedRepo.removeById(req.feed)
        if (removed) {
          return true
        }
        return entityNotFound(req.feed, 'Feed', `feed ${req.feed} was already deleted before delete attempt`)
      }
    )
  }
}

export function FetchFeedContent(permissionService: api.FeedsPermissionService, serviceTypeRepo: FeedServiceTypeRepository, serviceRepo: FeedServiceRepository, feedRepo: FeedRepository, jsonSchemaService: JsonSchemaService): api.FetchFeedContent {
  return async function fetchFeedContent(req: api.FetchFeedContentRequest): ReturnType<api.FetchFeedContent> {
    return await withPermission<FeedContent, KnownErrorsOf<api.FetchFeedContent>>(
      permissionService.ensureFetchFeedContentPermissionFor(req.context, req.feed),
      async (): Promise<FeedContent | EntityNotFoundError> => {
        const feed = await feedRepo.findById(req.feed)
        if (!feed) {
          return entityNotFound(req.feed, 'Feed')
        }
        const service = await serviceRepo.findById(feed.service)
        if (!service) {
          return entityNotFound(feed.service, 'FeedService')
        }
        const serviceType = await serviceTypeRepo.findById(service.serviceType)
        if (!serviceType) {
          return entityNotFound(service.serviceType, 'FeedServiceType')
        }
        const conn = await serviceType.createConnection(service.config)
        let params = req.variableParams || {}
        params = Object.assign(params, feed.constantParams || {})
        const content = await conn.fetchTopicContent(feed.topic, params)
        return { ...content, feed: feed.id, variableParams: req.variableParams }
      }
    )
  }
}

function invalidInputServiceConfig(err: InvalidServiceConfigError, ...configKey: string[]): InvalidInputError {
  const problems = err.data?.invalidKeys.map(invalidKey => {
    return [ `${invalidKey} is invalid`, ...configKey, invalidKey ] as KeyPathError
  }) || [[ err.message, 'config' ]]
  return invalidInput(`invalid service config: ${err.message}`, ...problems)
}

function redactServiceConfig(service: FeedService, serviceType: FeedServiceType): FeedService {
  const redactedConfig = serviceType.redactServiceConfig(service.config)
  return Object.assign({ ...service}, { config: redactedConfig })
}