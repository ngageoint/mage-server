import mongoose, { HydratedSingleSubdocument, ToObjectOptions } from 'mongoose'
import { UserDocument } from './user'
import { MageEventId, MageEventAttrs, MageEventCreateAttrs, EventAccessType, EventRole } from '../entities/events/entities.events'
import { Form, FormField } from '../entities/events/entities.events.forms'
import { PageInfo } from '../utilities/paging'

export interface MageEventDocumentToObjectOptions extends ToObjectOptions {
  access: { user: UserDocument, permission: EventAccessType }
  projection: any
}

export type MageEventDocumentInstanceToObject = (options: MageEventDocumentToObjectOptions) => MageEventAttrs

export type MageEventDocument = Omit<MageEventAttrs, 'id' | 'forms' | 'teamIds' | 'layerIds' | 'acl'> & {
  _id: number
  /**
   * The event's collection name is the name of the MongoDB collection that
   * stores observations for the event.
   */
  collectionName: string
  forms: FormDocument[]
  teamIds: mongoose.Types.ObjectId[]
  layerIds: mongoose.Types.ObjectId[]
  acl: MageEventDocumentAcl
}

export interface MageEventDocumentAcl {
  [userId: string]: EventRole
}

export type FormDocument = Omit<Form, 'id' | 'fields'> & {
  _id: number
  fields: FormFieldDocument[]
}

export type FormFieldDocument = FormField

export type TODO = any
export type Callback<Result = unknown> = (err: Error | null, result?: Result, totalCount?: number) => void

export type FormSubdocumentModelInstance = HydratedSingleSubdocument<FormDocument>
export type MageEventModelInstance = mongoose.HydratedDocument<
  MageEventDocument,
  {
    forms: FormSubdocumentModelInstance[],
    toObject: MageEventDocumentInstanceToObject,
    toJSON: MageEventDocumentInstanceToObject
  },
  object,
  { id: number }
>
export type MageEventModel = mongoose.Model<MageEventDocument, object, object, object, MageEventModelInstance>

export declare function count(options: TODO, callback: Callback<number>): void
export declare function getEvents(options: TODO, callback: Callback<MageEventModelInstance[]>): void
export declare function getById(id: MageEventId, options: TODO, callback: Callback<MageEventModelInstance | null>): void
export declare function create(event: MageEventCreateAttrs, user: Partial<UserDocument> & Pick<UserDocument, '_id'>, callback: Callback<MageEventModelInstance>): void
export declare function addForm(eventId: MageEventId, form: any, callback: Callback<MageEventModelInstance>): void
export declare function addLayer(event: MageEventModelInstance, layer: any, callback: Callback<MageEventModelInstance>): void
export declare function removeLayer(event: MageEventModelInstance, layer: { id: any }, callback: Callback<MageEventModelInstance>): void
export declare function getUsers(eventId: MageEventId, callback: Callback<UserDocument[]>): void
export declare function addTeam(event: MageEventModelInstance, team: any, callback: Callback<MageEventModelInstance>): void
export declare function getTeams(eventId: MageEventId, options: { populate: string[] | null }, callback: Callback): void
export declare function removeTeam(event: MageEventModelInstance, team: any, callback: Callback<MageEventModelInstance>): void
export declare function updateUserInAcl(eventId: MageEventId, userId: string, role: string, callback: Callback<MageEventModelInstance>): void
export declare function removeUserFromAcl(eventId: MageEventId, userId: string, callback: Callback<MageEventModelInstance>): void
export declare function getMembers(eventId: MageEventId, options: TODO): Promise<PageInfo>
export declare function getNonMembers(eventId: MageEventId, options: TODO): Promise<PageInfo>
export declare function getTeamsInEvent(eventId: MageEventId, options: TODO): Promise<PageInfo>
export declare function getTeamsNotInEvent(eventId: MageEventId, options: TODO): Promise<PageInfo>

export declare const Model: mongoose.Model<MageEventDocument>
