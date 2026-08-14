import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import { Model, Document, Schema, Connection } from 'mongoose'
import { ObservationIcon, ObservationIconRepository } from '../../entities/observations/entities.observations.icons'
import { MageEventId } from '../../entities/events/entities.events'
import { FormId } from '../../entities/events/entities.events.forms'

export type ObservationIconDocument = Omit<ObservationIcon, 'contentLocator'> & Document & {
  relativePath: string
}
export type ObservationIconModel = Model<ObservationIconDocument>
export const ObservationIconModelName = 'Icon'

export const ObservationIconSchema = new Schema({
  eventId: { type: Number, required: true },
  formId: { type: Number, required: false },
  primary: { type: String, required: false },
  variant: { type: Object, required: false },
  relativePath: {type: String, required: true }
},{
  versionKey: false
});

export function ObservationIconModel(conn: Connection, collection?: string): ObservationIconModel {
  return conn.model(ObservationIconModelName, ObservationIconSchema, collection || 'icons') as any
}

export class MongooseObservationIconRepository extends BaseMongooseRepository<ObservationIconDocument, ObservationIconModel, ObservationIcon> implements ObservationIconRepository {
  constructor(
    model: Model<ObservationIconDocument>
  ) {
    super(model, {
      docToEntity: doc => {
        const {
          _id,
          relativePath,
          ...icon
        } = doc.toJSON<ObservationIconDocument>()

        return {
          ...icon,
          contentLocator: relativePath
        }
      }
    })
  }

  async getIcons(eventId: MageEventId): Promise<ObservationIcon[]> {
    const icons = await this.model.find({ eventId }, {}, { sort: { primary: -1, variant: -1 } })
    return icons.map(icon => this.entityForDocument(icon))
  }

  async getIcon(eventId: MageEventId, formId?: FormId | null, primary?: string | null, secondary?: string | null): Promise<ObservationIcon | null> {
    const condition: any = { eventId }
    if (formId) { condition.formId = formId }
    if (primary) { condition.primary = { '$in': [primary, null] } }
    if (secondary) { condition.variant = { '$in': [secondary, null] } }

    const icon = await this.model.findOne(condition, {}, { sort: { primary: -1, variant: -1 } })
    return icon ? this.entityForDocument(icon) : null
  }
}
