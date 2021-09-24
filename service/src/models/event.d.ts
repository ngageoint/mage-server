import mongoose, { DocumentToObjectOptions } from 'mongoose'
import { UserDocument } from './user'
import { MageEventId, MageEvent, MageEventCreateAttrs, EventPermission, Form, FormFieldChoice, FormField, EventRole } from '../entities/events/entities.events'
import { Team, TeamMemberRole } from '../entities/teams/entities.teams'

export interface MageEventDocumentToObjectOptions extends DocumentToObjectOptions {
  access: { user: UserDocument, permission: EventPermission }
  projection: any
}

/**
 * TODO: This needs to go into a more complete defintion file for the team
 * model module (or convert it to typescript), but this will suffice for now.
 */
export type TeamDocument = Omit<Team, 'acl' | 'userIds'> & mongoose.Document & {
  userIds: mongoose.Types.ObjectId[]
  acl: {
    [userId: string]: TeamMemberRole
  }
}

export type MageEventDocument = Omit<MageEvent, 'teamIds' | 'layerIds' | 'acl'> & mongoose.Document & {
  /**
   * The event's collection name is the name of the MongoDB collection that
   * stores observations for the event.
   */
  collectionName: string
  teamIds: mongoose.Types.ObjectId[] | TeamDocument[]
  layerIds: mongoose.Types.ObjectId[]
  acl: MageEventDocumentAcl
  toObject(options?: MageEventDocumentToObjectOptions): any
  toJSON(options: DocumentToObjectOptions): MageEvent
}
export interface MageEventDocumentAcl {
  [userId: string]: EventRole
}
export type FormDocument = Form & mongoose.Document & {
  _id: number
}
export type FormFieldDocument = FormField & mongoose.Document & {
  _id: never
}
export type FormFieldChoiceDocument = FormFieldChoice & mongoose.Document & {
  _id: never
}

export type TODO = any
export type Callback<Result = unknown> = (err: Error | null, result?: Result) => void

export declare function count(options: TODO, callback: Callback<number>): void
export declare function getEvents(options: TODO, callback: Callback<MageEventDocument[]>): void
export declare function getById(id: MageEventId, options: TODO, callback: Callback<MageEventDocument | null>): void
export declare function filterEventsByUserId(events: MageEventDocument[], userId: string, callback: Callback<MageEventDocument[]>): void
export declare function userHasEventPermission(event: MageEventDocument, userId: string, permission: EventPermission, callback: Callback<boolean>): void
export declare function create(event: MageEventCreateAttrs, user: Partial<UserDocument> & Pick<UserDocument, '_id'>, callback: Callback<MageEventDocument>): void
export declare function addLayer(event: MageEventDocument, layer: any, callback: Callback<MageEventDocument>): void
export declare function removeLayer(event: MageEventDocument, layer: { id: any }, callback: Callback<MageEventDocument>): void
export declare function getUsers(eventId: MageEventId, callback: Callback<UserDocument[]>): void
export declare function addTeam(event: MageEventDocument, team: any, callback: Callback<MageEventDocument>): void
export declare function getTeams(eventId: MageEventId, options: { populate: string[] | null }, callback: Callback): void
export declare function removeTeam(event: MageEventDocument, team: any, callback: Callback<MageEventDocument>): void
export declare function updateUserInAcl(eventId: MageEventId, userId: string, role: string, callback: Callback<MageEventDocument>): void
export declare function removeUserFromAcl(eventId: MageEventId, userId: string, callback: Callback<MageEventDocument>): void

export declare const Model: mongoose.Model<MageEventDocument>