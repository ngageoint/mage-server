import mongoose from 'mongoose'
import * as ObservationModelModule from '../models/observation'
import * as UserLocationModelModule from '../models/location'
import { MageEventModelInstance } from '../models/event'
import { MageEvent } from '../entities/events/entities.events'
import { UserId } from '../entities/users/entities.users'
import { ObservationStateName } from '../entities/observations/entities.observations'
import { ObservationModelInstance } from '../adapters/observations/adapters.observations.db.mongoose'


export interface ExportOptions {
  event: MageEventModelInstance
  filter: ExportFilter
}

export interface ExportFilter {
  exportObservations?: boolean
  exportLocations?: boolean
  startDate?: Date
  endDate?: Date
  favorites?: false | { userId: UserId }
  important?: boolean
  /**
   * Unintuitively, `attachments: true` will EXCLUDE attachments from the
   * export.
   * TODO: fix that
   */
  attachments?: boolean
}

export type LocationFetchOptions = Pick<ExportFilter, 'startDate' | 'endDate'>

export class Exporter {

  protected eventDoc: MageEventModelInstance
  protected _event: MageEvent
  protected _filter: ExportFilter

  constructor(options: ExportOptions) {
    this.eventDoc = options.event
    this._event = new MageEvent(options.event.toJSON())
    this._filter = options.filter;
  }

  requestObservations(filter: ExportFilter): mongoose.Cursor<ObservationModelInstance> {
    const options: ObservationModelModule.ObservationReadStreamOptions = {
      filter: {
        states: [ ObservationStateName.Active ],
        observationStartDate: filter.startDate,
        observationEndDate: filter.endDate,
        favorites: filter.favorites,
        important: filter.important,
        attachments: filter.attachments
      },
      sort: { userId: 1 },
      stream: true
    }
    return ObservationModelModule.getObservations(this.eventDoc, options);
  }

  /**
   * Return a cursor for the given location query with results ordered by user
   * ID and ascending timestamp.
   */
  requestLocations(options: LocationFetchOptions): mongoose.Cursor<UserLocationModelModule.UserLocationDocument> {
    const filter = {
      eventId: this._event.id
    } as { eventId: number, startDate?: Date, endDate?: Date }
    if (options.startDate) {
      filter.startDate = options.startDate
    }
    if (options.endDate) {
      filter.endDate = options.endDate
    }
    const sort = { userId: 1, 'properties.timestamp': 1, _id: 1 };
    return UserLocationModelModule.getLocations({ stream: true, filter, sort });
  }
}
