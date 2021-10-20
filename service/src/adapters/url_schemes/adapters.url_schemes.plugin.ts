import fs from 'fs'
import fsx from 'fs-extra'
import path from 'path'
import { URL } from 'url'
import { PluginResourceUrl, UrlResolutionError, UrlScheme } from '../../entities/entities.global'

/**
 * The `PluginUrlScheme` resolves content that a `PluginResourceUrl`
 * references.  The scheme starts with a known list of plugin base module names
 * from which to resolve bundled child resources.  Be aware that if the base
 * module includes a `package.json` with a `main` field, the scheme resolves
 * all child resource paths relative to the directory that contains the `main`
 * file.  For example, given a module `@example/nested-main` whose
 * `package.json` `main` value is `"lib/public/main.js"`, the scheme would
 * resolve the URL `mage-plugin:///@example/nested-main/assets/help.txt` with
 * the path `<resolved base path>/node_modules/@example/nested-main/lib/public/assets/help.txt`.
 * This behavior imposes a compatibility requirement on packages that any
 * resolvable resources must be packaged as siblings of the main file.
 *
 * TODO: consider [package entry points](https://nodejs.org/dist/latest-v12.x/docs/api/packages.html#packages_package_entry_points)
 */
export class PluginUrlScheme implements UrlScheme {

  private readonly pluginNamesDescending: string[]

  /**
   * This class must know the registered plugin module names to ensure
   * resolution of only intended resources.
   * @param pluginNames
   */
  constructor(pluginNames: string[], private extraSearchPaths: string[] | null = null) {
    this.pluginNamesDescending = pluginNames.sort().reverse()
  }

  get isLocalScheme() { return true }

  canResolve(url: URL): boolean {
    return url.protocol === PluginResourceUrl.pluginProtocol
  }

  async resolveContent(url: URL): Promise<NodeJS.ReadableStream | UrlResolutionError> {
    const contentPath = this.localPathOfUrl(url)
    if (typeof contentPath !== 'string') {
      return contentPath
    }
    const stats = await fsx.stat(contentPath)
    if (stats.isFile()) {
      return fs.createReadStream(contentPath)
    }
    return new UrlResolutionError(url, 'no content found')
  }

  /**
   * Resolve the local path the given plugin resource URL references.
   * @param url a plugin URL that refers to a resource in a plugin module
   * @returns
   */
  localPathOfUrl(url: URL): string | UrlResolutionError {
    if (!this.canResolve(url)) {
      return new UrlResolutionError(url, 'invalid scheme')
    }
    const pluginPath = PluginResourceUrl.pluginPathOf(url)
    if (!pluginPath) {
      return new UrlResolutionError(url, 'not a plugin url')
    }
    const longestMatchingPlugin = this.pluginNamesDescending.find(pluginName => pluginPath.startsWith(pluginName))
    if (!longestMatchingPlugin) {
      return new UrlResolutionError(url, 'no matching plugin module')
    }
    const resolveOpts: { paths?: string[] } = {}
    if (Array.isArray(this.extraSearchPaths)) {
      resolveOpts.paths = this.extraSearchPaths
    }
    let manifestPath: string | null = null
    try {
      manifestPath = require.resolve(longestMatchingPlugin + '/package.json', resolveOpts)
    }
    catch (err) {
      // no package.json, no problem
    }
    let mainFilePath
    try {
      mainFilePath = require.resolve(longestMatchingPlugin, resolveOpts)
    }
    catch (err) {
      return new UrlResolutionError(url, String(err))
    }
    const baseDir = path.dirname(manifestPath || mainFilePath)
    const contentRelPath = pluginPath.slice(longestMatchingPlugin.length + 1)
    if (!contentRelPath) {
      if (url.pathname.endsWith('/')) {
        return baseDir
      }
      return mainFilePath
    }
    const contentPath = path.join(baseDir, contentRelPath)
    return contentPath
  }
}
