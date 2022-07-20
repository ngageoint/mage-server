import mongoose from 'mongoose'
import { InjectionToken } from '.'

export interface GetDbConnection {
  (): Promise<mongoose.Connection>
}

export const MongooseDbConnectionToken: InjectionToken<GetDbConnection> = Symbol('InjectMongooseDbConnection')