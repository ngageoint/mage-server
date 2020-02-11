
import mongoose from 'mongoose';
import { PluginDescriptor } from '../api/plugins'

const PluginDescriptorSchema = new mongoose.Schema({
  version: { type: Number, required: false, default: 0 },
  title: { type: String, required: true },
  summary: { type: String, required: false, default: null },
  iconClass: { type: String, required: false, default: null },
  iconPath: { type: String, required: false, default: null },
  providesUi: { type: Boolean, required: false, default: false },
  providesMigrations: { type: Boolean, required: false, default: false },
  enabled: { type: Boolean, required: false, default: false }
});

export type PluginDescriptorDocument = mongoose.Document & PluginDescriptor;
export const PluginDescriptorModel = mongoose.model<PluginDescriptorDocument>('PluginDescriptor', PluginDescriptorSchema);
