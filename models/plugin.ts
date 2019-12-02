
import mongoose from 'mongoose';
import { IPluginDescriptor } from '../api/plugins'

const PluginDescriptorSchema = new mongoose.Schema({
  version: { type: Number, required: false, default: 0 },
  displayName: { type: String, required: true },
  summary: { type: String, required: false, default: null },
  iconClass: { type: String, required: false, default: null },
  iconPath: { type: String, required: false, default: null },
  providesUi: { type: Boolean, required: false, default: false },
  providesMigrations: { type: Boolean, required: false, default: false },
  enabled: { type: Boolean, required: false, default: false }
});

export const PluginDescriptorModel = mongoose.model<mongoose.Document & IPluginDescriptor>('PluginDescriptor', PluginDescriptorSchema);
