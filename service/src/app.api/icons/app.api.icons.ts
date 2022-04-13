import { PageOf, PagingParameters, UrlResolutionError } from '../../entities/entities.global'
import { LocalStaticIconStub, StaticIcon, StaticIconId, StaticIconReference } from '../../entities/icons/entities.icons'
import { EntityNotFoundError, InvalidInputError, MageError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { URL } from 'url'

export interface CreateLocalStaticIconRequest extends AppRequest {
  iconInfo: LocalStaticIconStub
  iconContent: NodeJS.ReadableStream
}

export interface CreateLocalStaticIcon {
  (req: CreateLocalStaticIconRequest): Promise<AppResponse<StaticIcon, PermissionDeniedError | InvalidInputError>>
}

export interface GetStaticIconRequest extends AppRequest {
  iconRef: StaticIconReference | { sourceUrl: string }
}

/**
 * If the request references an icon by ID and the icon does not exist, return
 * an `EntityNotFoundError`.  If the request is looking up an icon by source
 * URL and no icon with the source URL exists, return null.
 */
export interface GetStaticIcon {
  (req: GetStaticIconRequest): Promise<AppResponse<StaticIcon | null, PermissionDeniedError | EntityNotFoundError | InvalidInputError>>
}

export interface GetStaticIconContentRequest extends AppRequest {
  iconId: StaticIconId
  // TODO: suppress fetching/loading content if client-cached content is valid
  cached?: {
    contentHash?: StaticIcon['contentHash'],
    contentTimestamp?: StaticIcon['contentTimestamp'],
    resolvedTimestamp?: StaticIcon['resolvedTimestamp']
  }
}

export interface StaticIconWithContent {
  iconInfo: StaticIcon
  iconContent: NodeJS.ReadableStream
}

export interface GetStaticIconContent {
  (req: GetStaticIconContentRequest): Promise<AppResponse<StaticIconWithContent, PermissionDeniedError | EntityNotFoundError | IconSourceUrlFetchError>>
}

export interface ListStaticIconsRequest extends AppRequest {
  // TODO: full-text search on title, file name, tag, etc.
  searchText?: string
  paging?: Partial<PagingParameters>
}

export interface ListStaticIcons {
  (req: ListStaticIconsRequest): Promise<AppResponse<PageOf<StaticIcon>, PermissionDeniedError>>
}

export interface StaticIconPermissionService {
  ensureCreateStaticIconPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
  ensureGetStaticIconPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}

export const ErrIconSourceUrlFetch = Symbol.for('icon.source_url_fetch')
export interface IconSourceUrlFetchErrorData {
  sourceUrl: URL | string
  iconId?: StaticIconId
}
export type IconSourceUrlFetchError = MageError<typeof ErrIconSourceUrlFetch, IconSourceUrlFetchErrorData>

export function iconSourceUrlFetchError(sourceUrl: URL | string | UrlResolutionError, iconId: StaticIconId | null | undefined, message?: string): IconSourceUrlFetchError {
  let urlError: UrlResolutionError | null = null
  if (sourceUrl instanceof UrlResolutionError) {
    urlError = sourceUrl
    sourceUrl = urlError.sourceUrl
  }
  const data: IconSourceUrlFetchErrorData = { sourceUrl }
  if (typeof iconId === 'string') {
    data.iconId = iconId
  }
  if (!message) {
    message = `error retrieving content for icon source url ${sourceUrl}`
    if (data.iconId) {
      message = `${message} for icon ${iconId}`
    }
    if (urlError) {
      message = `${message}: ${urlError.message || 'unknown error'}`
    }
  }
  return new MageError(ErrIconSourceUrlFetch, data, message)
}