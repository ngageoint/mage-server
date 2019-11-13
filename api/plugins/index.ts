
import { IPluginDescriptor } from '../../models/plugin';


export default interface PluginService {

  /**
   * Fetch all the loaded plugins from the database.  The insertion order of
   * the plugin descriptors to the returned map will be alphabetical by display
   * name.
   */
  getPlugins(): Promise<Map<string, IPluginDescriptor>>

  /**
   * Fetch the plugin descriptor for the given plugin ID.
   *
   * @param pluginId the ID (module name) of the plugin to fetch
   */
  getPlugin(pluginId: string): Promise<IPluginDescriptor>
  /**
   * For the given plugin, perform database migrations if necessary, start any
   * services, and enable any HTTP routes.
   *
   * @param descriptor
   */
  enablePlugin(descriptor: IPluginDescriptor): Promise<IPluginDescriptor>
  disablePlugin(descriptor: IPluginDescriptor): Promise<IPluginDescriptor>
};