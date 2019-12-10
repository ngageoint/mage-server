
import mongoose from 'mongoose';
import { AdapterDescriptor, SourceDescriptor } from '../api';

export const ManifoldModels = {
  AdapterDescriptor: 'AdapterDescriptor',
  SourceDescriptor: 'SourceDescriptor'
};

const AdapterDescriptorSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, required: false }
});

const SourceDescriptorSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, required: false },
});

export type AdapterDescriptorDocument = AdapterDescriptor & mongoose.Document;
export type SourceDescriptorDocument = SourceDescriptor & mongoose.Document;

export const AdapterDescriptorModel = mongoose.model<AdapterDescriptorDocument>(ManifoldModels.AdapterDescriptor, AdapterDescriptorSchema);
export const SourceDescriptorModel = mongoose.model<SourceDescriptorDocument>(ManifoldModels.SourceDescriptor, SourceDescriptorSchema);