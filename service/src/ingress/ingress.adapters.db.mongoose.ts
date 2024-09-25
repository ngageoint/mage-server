import mongoose from 'mongoose'

type ObjectId = mongoose.Types.ObjectId
const Schema = mongoose.Schema

const UserIngressSchema = new Schema(
  {
    // TODO: type is really not necessary
    type: { type: String, required: true },
    id: { type: String, required: false },
    authenticationConfigurationId: { type: Schema.Types.ObjectId, ref: 'AuthenticationConfiguration', required: false }
  },
  {
    timestamps: {
      updatedAt: 'lastUpdated'
    },
    toObject: {
      transform: DbAuthenticationToObject
    }
  }
);

export type UserIdpAccountDocument = {
  _id: ObjectId
  // TODO: migrate to this foreign key instead of on user records
  // userId: ObjectId
  createdAt: Date
  lastUpdated: Date
  // TODO: migrate to identityProviderId
  authenticationConfigurationId: ObjectId
  idpAccount: Record<string, any>
}