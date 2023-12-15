// import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
// import { SftpObservation, SftpObservationRepository, SftpStatus } from 'entities.sftp'
// import mongoose from 'mongoose'

// export const SftpObservationsSchema = new mongoose.Schema({
//   eventId: { type: Number, required: true, unique: true },
//   observationId: { type: String, required: true },
//   status: { enum: SftpStatus, required: true },
//   lastUpdated: { type: Date, required: true }
// },{
//   timestamps: true
// })

// export type SftpObservationModel = mongoose.Model<SftpObservation>
// const sftpObservationCollectionName: string = "sftp.observations"
// const SftpObservationModelName: string = 'SftpObservation'

// export function SftpObservatioModel(connection: mongoose.Connection): SftpObservationModel {
//   return connection.model(SftpObservationModelName, SftpObservationsSchema, sftpObservationCollectionName)
// }

// export class MongooseSftpObservationRepository  implements SftpObservationRepository {
//   readonly model: SftpObservationModel

//   constructor(model: SftpObservationModel) {
//     this.model = model
//   }

//   findAll(eventId: MageEventId): Promise<mongoose.Document[]> {
//     throw new Error('Method not implemented.')
//   }

//   findAllByStatus(eventId: MageEventId, status: SftpStatus[]): Promise<mongoose.Document[]> {
//     throw new Error('Method not implemented.')
//   }

//   postStatus(observation: mongoose.Document): Promise<mongoose.Document> {
//     throw new Error('Method not implemented.')
//   }

// }