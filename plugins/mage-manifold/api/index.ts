
/**
 * An adapter represents a specific type of data source and the translation from
 * that type of data source to data that MAGE can understand, and vice versa.
 */
export interface AdapterDescriptor {
  id: string
  title: string
  summary: string
}

export interface SourceDescriptor {
  id: string
  adapterId: string
  title: string
  summary: string
};