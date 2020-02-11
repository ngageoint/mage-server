

export interface PluginDescriptor {
  /**
   * The plugin ID is the module name of the physical directory in the plugins
   * directory where the plugin code resides.
   */
  id: string
  version: number
  /**
   * The title is a short name suitable to display on a list item or tab.
   */
  title: string
  /**
   * The summary should be one or two lines of text that describes the purpose
   * of the plugin.
   */
  summary: string | null
  iconClass: string | null
  iconPath: string | null
  providesMigrations: boolean
  providesUi: boolean
  enabled: boolean
}

export interface PluginService {

  /**
   * Fetch all the loaded plugins from the database.  The insertion order of
   * the plugin descriptors to the returned map will be alphabetical by display
   * name.
   */
  getPlugins(): Promise<Map<string, PluginDescriptor>>

  /**
   * Fetch the plugin descriptor for the given plugin ID.
   *
   * @param pluginId the ID (module name) of the plugin to fetch
   */
  getPlugin(pluginId: string): Promise<PluginDescriptor>
  /**
   * For the given plugin, perform database migrations if necessary, start any
   * services, and enable any HTTP routes.
   *
   * @param descriptor
   */
  enablePlugin(descriptor: PluginDescriptor): Promise<PluginDescriptor>
  disablePlugin(descriptor: PluginDescriptor): Promise<PluginDescriptor>
};