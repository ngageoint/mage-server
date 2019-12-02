
import { SourceDescriptor, AdapterDescriptor } from './models';

export interface ManifoldService {

  getAdapters(): AdapterDescriptor[];
  getSources(): Map<string, SourceDescriptor>;
  getSource(sourceId: string): SourceDescriptor;
}