
import mongoose from 'mongoose';


const PluginDescriptorSchema = new mongoose.Schema({
  pluginId: { type: String, required: true },
  version: { type: Number, required: false, default: 0 },
  displayName: { type: String, required: true },
  summary: { type: String, required: false, default: null },
  iconClass: { type: String, required: false, default: null },
  iconPath: { type: String, required: false, default: null },
  providesUi: { type: Boolean, required: false, default: false },
  providesMigrations: { type: Boolean, required: false, default: false },
  enabled: { type: Boolean, required: false, default: false }
});


const PluginDescriptor = mongoose.model<IPluginDescriptor>('PluginDescriptor', PluginDescriptorSchema);
export default PluginDescriptor;


export interface IPluginDescriptor extends mongoose.Document {

  /**
   * The plugin ID is the module name of the physical directory in the plugins
   * directory where the plugin code resides.
   */
  pluginId: string
  version: number
  /**
   * The display name is a short name suitable to place on the plugin's tab
   * in the UI.
   */
  displayName: string
  /**
   * The summary should be one or two lines of text that describes the purpose
   * of the plugin at a high level.
   */
  summary: string | null
  iconClass: string | null
  iconPath: string | null
  providesMigrations: boolean
  providesUi: boolean
  enabled: boolean
};
