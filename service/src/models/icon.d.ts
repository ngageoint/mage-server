import mongoose from 'mongoose'


export interface IconDocument extends mongoose.Document {
  id: string
  eventId: number
  formId?: number
  primary?: string
  variant?: string
  relativePath: string
}

export declare function getAll(options: { eventId?: number, formId?: number }, callback: (err: any | null, icons?: IconDocument[]) => any): void