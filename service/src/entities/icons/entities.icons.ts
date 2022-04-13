import { URL } from 'url'
import { PageOf, PagingParameters, UrlResolutionError } from '../entities.global'


export type StaticIconStub = Omit<StaticIcon, 'id' | 'registeredTimestamp' | 'resolvedTimestamp'>

export interface ImageSize {
  width: number,
  height: number
}

/**
 * The reason for the 'static' qualifier of `StaticIcon` is to distinguish
 * that the icon image is not dynamically generated and so is subject to
 * caching.  Other types of icons, such as the [Joint Military Symbology](https://www.jcs.mil/Portals/36/Documents/Doctrine/Other_Pubs/ms_2525d.pdf)
 * may be dynamically generated based on the attributes of the feature the icon
 * represents.
 */
export interface StaticIcon {
  /**
   * The source URL of an icon is a persistent, cache-friendly URL that exists
   * outside the URL namespace of a particular MAGE server.  For example, this
   * could be an HTTP URL that MAGE can use to retrieve and cache the icon.
   */
  sourceUrl: URL
  id: StaticIconId
  registeredTimestamp: number
  /**
   * The epoch timestamp that the icon's content was last successfully fetched
   * and stored (if necessary) from its source URL.
   */
  resolvedTimestamp?: number
  imageType?: 'raster' | 'vector'
  /**
   * The icons's media type is a standard [IANA media/MIME](https://www.iana.org/assignments/media-types/media-types.xhtml)
   * type strings, such as `image/jpeg`.
   */
  mediaType?: string
  /**
   * The size in pixels is the width and height of the icon's image canvas.
   */
  sizePixels?: ImageSize
  sizeBytes?: number
  contentHash?: string
  /**
   * The intention of content timestamp is to be a last-modified timestamp of
   * the source content, such as the timestamp extracted from the
   * `Last-Modified` header of an icon fetched from a remote HTTP server.
   */
  contentTimestamp?: number
  title?: string
  summary?: string
  /**
   * The icon's file name is the original file name of an uploaded icon, and/or
   * the default file name provided to download the icon.
   */
  fileName?: string
  tags?: string[]
}

export type LocalStaticIconStub = Omit<StaticIconStub, 'sourceUrl' | 'title'> & Required<Pick<StaticIcon, 'title'>>

const iconIsResolved = (icon: StaticIcon): boolean => {
  return typeof icon.contentHash === 'string' && typeof icon.contentTimestamp === 'number'
}

export type StaticIconId = string

export enum StaticIconImportFetch {
  /**
   * Immediately fetch and store the icon content from the source URL and wait
   * for the fetch to complete.
   */
  EagerAwait = 'StaticIconFetch.eagerAwait',
  /**
   * Immediately fetch and store the icon content from the source URL, but do
   * not serially wait for the fetch to complete.
   */
  Eager = 'StaticIconFetch.eager',
  /**
   * Defer fetching the icon content from the source URL until some process
   * explictly requests a fetch at some point in the future, such as a client
   * requests the icon content by its internal ID.
   */
  Lazy = 'StaticIconFetch.lazy',
}

export interface StaticIconRepository {
  findOrImportBySourceUrl(stub: StaticIconStub | URL, fetch?: StaticIconImportFetch): Promise<StaticIcon | UrlResolutionError>
  createLocal(stub: LocalStaticIconStub, content: NodeJS.ReadableStream): Promise<StaticIcon>
  findByReference(ref: StaticIconReference): Promise<StaticIcon | null>
  find(paging?: PagingParameters): Promise<PageOf<StaticIcon>>
  /**
   * Load the image content for the given icon ID.  If the given ID does not
   * exist in the database, return null.  If no URL scheme can resolve the
   * icon's source URL, return a `UrlResolutionError`.  If an icon with the
   * given ID exists but its content is not yet resolved, attempt to fetch
   * and store the content.  If an error occurs fetching the content, return
   * a `UrlResolutionError`.
   * @param id
   */
  loadContent(id: StaticIconId): Promise<[StaticIcon, NodeJS.ReadableStream] | null | UrlResolutionError>
}

export interface RegisteredStaticIconReference {
  id: StaticIconId
  sourceUrl?: never
}

export interface SourceUrlStaticIconReference {
  sourceUrl: URL
  id?: never
}

export type StaticIconReference = RegisteredStaticIconReference | SourceUrlStaticIconReference

export interface StaticIconContentStore {
  putContent(icon: StaticIcon, content: NodeJS.ReadableStream): Promise<void>
  loadContent(id: StaticIconId): Promise<NodeJS.ReadableStream | null>
}
