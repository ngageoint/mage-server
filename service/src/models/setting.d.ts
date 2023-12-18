import mongoose from 'mongoose'

export interface SettingsDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  type: string
  settings: any
}

export declare const Model: mongoose.Model<SettingsDocument>
