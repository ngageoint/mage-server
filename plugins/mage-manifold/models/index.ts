
import mongoose from 'mongoose';


/**
 * A medium represents a specific type of data source and the translation from
 * that type of data source to data that MAGE can understand, and vice versa.
 */
export interface AdapterDescriptor extends mongoose.Document {
  id: string
  title: string
  summary: string
}

export interface SourceDescriptor extends mongoose.Document {
  id: string
  adapterId: string
  title: string
  summary: string
};