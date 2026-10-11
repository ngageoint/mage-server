import mongoose from 'mongoose'
import { SequenceRepository } from '../../entities/entities.global'

/**
 * Mongoose adapter for the Counter entity: owns the CounterSchema/CounterModel
 * and implements SequenceRepository against it. models/counter.js bridges the
 * legacy API onto this repository for callers not yet migrated to the new architecture.
 */

const Schema = mongoose.Schema

export const CounterModelName = 'Counter'

export interface CounterDocument {
  _id: string
  sequence: number
}

export type CounterModel = mongoose.Model<CounterDocument>

export const CounterSchema = new Schema<CounterDocument, CounterModel>(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true }
  },
  {
    versionKey: false
  }
)

export function CounterModel(conn: mongoose.Connection, collection?: string): CounterModel {
  return (conn.models[CounterModelName] as CounterModel) || conn.model<CounterDocument, CounterModel>(CounterModelName, CounterSchema, collection)
}

function range(start: number, end: number): number[] {
  const values: number[] = []
  for (let i = start; i <= end; i++) {
    values.push(i)
  }
  return values
}

export class MongooseSequenceRepository implements SequenceRepository {

  constructor(private readonly model: CounterModel) {}

  async nextValues(sequenceName: string, amount: number): Promise<number[]> {
    const counter = await this.model.findOneAndUpdate(
      { _id: sequenceName },
      { $inc: { sequence: amount } },
      { upsert: true, returnDocument: 'after' }
    ).exec()
    return range(counter!.sequence, counter!.sequence + amount)
  }

  async nextValue(sequenceName: string): Promise<number> {
    const ids = await this.nextValues(sequenceName, 1)
    return ids[0]
  }
}
