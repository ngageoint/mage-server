import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
// import mongoose from 'mongoose'

export enum SftpStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  WAITING = 'WAITING',
}

// export type SftpObservation = mongoose.Document

// export interface SftpObservationRepository {
//   findAll(eventId: MageEventId): Promise<SftpObservation[]>
//   findAllByStatus(eventId: MageEventId, status: SftpStatus[]): Promise<SftpObservation[]>
//   postStatus(observation: SftpObservation): Promise<SftpObservation>
// }