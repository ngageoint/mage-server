import { URL } from 'url'
import { entityNotFound, invalidInput } from '../../app.api/app.api.errors'
import { KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import { CreateLocalStaticIcon, CreateLocalStaticIconRequest, ListStaticIcons, ListStaticIconsRequest, GetStaticIcon, GetStaticIconContent, GetStaticIconContentRequest, GetStaticIconRequest, StaticIconPermissionService, iconSourceUrlFetchError, StaticIconWithContent } from '../../app.api/icons/app.api.icons'
import { UrlResolutionError } from '../../entities/entities.global'
import { StaticIcon, StaticIconReference, StaticIconRepository } from '../../entities/icons/entities.icons'


export function CreateStaticIcon(permissions: StaticIconPermissionService): CreateLocalStaticIcon {
  return function(req: CreateLocalStaticIconRequest): ReturnType<CreateLocalStaticIcon> {
    return withPermission(
      permissions.ensureCreateStaticIconPermission(req.context),
      () => {
        throw new Error('todo')
      }
    )
  }
}

export function GetStaticIcon(permissions: StaticIconPermissionService, repo: StaticIconRepository): GetStaticIcon {
  return function getStaticIcon(req: GetStaticIconRequest): ReturnType<GetStaticIcon> {
    return withPermission<StaticIcon | null, KnownErrorsOf<GetStaticIcon>>(
      permissions.ensureGetStaticIconPermission(req.context),
      async () => {
        const ref = req.iconRef
        let parsedRef: StaticIconReference
        if (typeof ref.sourceUrl === 'string') {
          try {
            parsedRef = { sourceUrl: new URL(ref.sourceUrl) }
          }
          catch (err) {
            return invalidInput('invalid icon source url', [ `invalid url: ${ref.sourceUrl}`, 'iconRef', 'sourceUrl' ])
          }
        }
        else {
          parsedRef = ref as StaticIconReference
        }
        const icon = await repo.findByReference(parsedRef)
        if (icon) {
          return icon
        }
        if (parsedRef.sourceUrl) {
          return null
        }
        return entityNotFound(parsedRef.id, 'StaticIcon')
      }
    )
  }
}

export function GetStaticIconContent(permissions: StaticIconPermissionService, repo: StaticIconRepository): GetStaticIconContent {
  return function getStaticIconContent(req: GetStaticIconContentRequest): ReturnType<GetStaticIconContent> {
    return withPermission<StaticIconWithContent, KnownErrorsOf<GetStaticIconContent>>(
      permissions.ensureGetStaticIconPermission(req.context),
      async () => {
        // TODO: support caching parameters to suppress fetch/load
        const content = await repo.loadContent(req.iconId)
        if (content instanceof UrlResolutionError) {
          return iconSourceUrlFetchError(content, req.iconId)
        }
        if (content) {
          return {
            iconInfo: content[0],
            iconContent: content[1]
          }
        }
        return entityNotFound(req.iconId, 'StaticIcon')
      }
    )
  }
}

export function ListStaticIcons(permissions: StaticIconPermissionService): ListStaticIcons {
  return function findStaticIcons(req: ListStaticIconsRequest): ReturnType<ListStaticIcons> {
    return withPermission(
      permissions.ensureGetStaticIconPermission(req.context),
      () => {
        throw new Error('todo')
      }
    )
  }
}