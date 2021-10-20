import { InjectionToken } from '.'
import { StaticIconRepository, StaticIconStub } from '../entities/icons/entities.icons'


export interface IconPluginHooks {
  icons: {
    loadPluginStaticIcons: () => Promise<PluginStaticIcon[]>
  }
}

/**
 * `PluginStaticIcon` defines properties necessary for plugin packages to
 * provide bundled static icon assets for use in MAGE.
 */
export type PluginStaticIcon = Omit<StaticIconStub, 'sourceUrl'> & Required<Pick<StaticIconStub, 'contentHash'>> & {
  /**
   * The module relative path of a plugin icon points to an image file within
   * the plugin package.  The path is relative to the root of the plugin
   * package that contains the icon.
   */
  pluginRelativePath: string
}

export const StaticIconRepositoryToken: InjectionToken<StaticIconRepository> = Symbol('InjectStaticIconRepository')