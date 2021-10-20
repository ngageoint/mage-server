import { URL } from 'url'

export interface EntityIdFactory {
  nextId(): Promise<string>
}

/**
 * TODO: This class may belong somewhere else, but for now is here until things
 * evolve a bit more.
 */
export class PluginResourceUrl extends URL {

  static readonly pluginProtocol = 'mage-plugin:'

  /**
   * Return the plugin module path from the given URL which is the path
   * component of the URL with no leading slash.  Return `undefined` if the
   * given URL does not have the appropriate {@link PluginResourceUrl.pluginProtocol | protocol}.
   * @param source
   * @returns
   */
  static pluginPathOf(source: URL): string | undefined {
    if (source.protocol !== PluginResourceUrl.pluginProtocol) {
      return
    }
    return source.pathname.slice(1)
  }

  readonly pluginModuleName: string
  readonly pluginResourcePath?: string

  /**
   * Create a URL with the `mage-plugin:` protocol whose absolute path is the
   * concatenation of the given base plugin module name, and relative resource
   * path.  The resulting URL will will be of the form
   * `mage-plugin:///@example/module/sub/resource.ext`.
   * The path of the constructed URL will always begin with a `/`, and will
   * thus have no host/authority component.  The constructor will also join the
   * two components with a single `/` as appropriate, regardless of trailing
   * and/or leading `/` in the given components.
   * @param pluginModuleName
   * @param pluginResourcePath
   */
  constructor(
    pluginModuleName: string,
    pluginResourcePath?: string
  ) {
    pluginModuleName = pluginModuleName.replace(/^\/+/, '').replace(/\/+$/, '/')
    pluginResourcePath = pluginResourcePath?.replace(/^\/+/, '').replace(/\/+$/, '/')
    const joinSlash = pluginResourcePath && pluginModuleName[pluginModuleName.length - 1] !== '/' ? '/' : ''
    super(`${PluginResourceUrl.pluginProtocol}///${pluginModuleName}${joinSlash}${pluginResourcePath || ''}`)
    this.pluginModuleName = pluginModuleName
    this.pluginResourcePath = pluginResourcePath
  }
}

export interface PagingParameters {
  /**
   * The number of items to include in a page
   */
  pageSize: number
  /**
   * The zero-based page to return
   */
  pageIndex: number
  /**
   * If true, count the total number of results the non-paged query would
   * return, and include the count in the resulting page object.  If absent,
   * the paging mechanism should default the value to `true` if the requested
   * page index is `0`, and `false` otherwise.
   */
  includeTotalCount?: boolean
}

export interface PageOf<T> {
  totalCount: number | null
  pageSize: number
  pageIndex: number
  items: T[]
}

export const pageOf = <T>(items: T[], paging: PagingParameters, totalCount?: number | null): PageOf<T> => {
  return {
    totalCount: totalCount || null,
    pageSize: paging.pageSize,
    pageIndex: paging.pageIndex,
    items
  }
}

/**
 * This interface is a simple mechanism to support referencing and fetching
 * content from URLs, especially custom schemes.  The need arose because feed
 * plugins can reference icons that are bundled within a plugin library.  Those
 * icons exist in their own plugin context separate from any MAGE server or
 * file system, so the plugin needs to reference and register the icons with
 * any given MAGE server runtime in a portable and context-independent way.
 */
export interface UrlScheme {
  /**
   * TODO: maybe this should go away, but for now is used to determine
   * whether content should be cached locally or not.  for example, the
   * mage-plugin:// scheme is just local files resolved by node module names so
   * storing the content in a cache would be redundant.  or maybe this should
   * more accurately be called something like `isCacheable`.
   */
  isLocalScheme: boolean
  canResolve(url: URL): boolean
  resolveContent(url: URL): Promise<NodeJS.ReadableStream | UrlResolutionError>
}

export class UrlResolutionError extends Error {

  constructor(public readonly sourceUrl: URL, message?: string) {
    super(`error loading url ${sourceUrl}: ${message}`)
  }
}