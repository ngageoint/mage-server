import mongoose from 'mongoose'


export interface IconAttrs {
  id: string
  eventId: number
  formId?: number | null
  primary?: string | null
  variant?: string | null
  relativePath: string
}

export declare class IconDocument extends mongoose.Document implements IconAttrs {
  id: string
  eventId: number
  formId?: number
  primary?: string
  variant?: string
  relativePath: string

  constructor(attrs: Partial<IconAttrs>)
}

export declare function getAll(options: { eventId?: number, formId?: number }, callback: (err: any | null, icons?: IconDocument[]) => any): void