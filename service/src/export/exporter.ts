import * as ObservationModelModule from '../models/observation'
import * as LocationModelModule from '../models/location'
import { MageEventDocument } from '../models/event'
import mongoose from 'mongoose'
import { UserLocationDocument } from '../models/location'


export interface ExportOptions {
  event: MageEventDocument
  filter: ExportFilter
}

export interface ExportFilter {
  exportObservations?: boolean
  exportLocations?: boolean
  startDate?: Date
  endDate?: Date
  favorites?: false | { userId: mongoose.Types.ObjectId }
  important?: boolean
  attachments?: boolean
}

export type LocationFetchOptions = Pick<ExportFilter, 'startDate' | 'endDate'>

export class Exporter {

  protected _event: MageEventDocument
  protected _filter: ExportFilter

  constructor(options: ExportOptions) {
    this._event = options.event;
    this._filter = options.filter;
  }

  requestObservations(filter: ExportFilter): ReturnType<typeof ObservationModelModule['getObservations']> {
    const options: ObservationModelModule.ObservationReadStreamOptions = {
      filter: {
        states: [ 'active' ] as [ 'active' ],
        observationStartDate: filter.startDate,
        observationEndDate: filter.endDate,
        favorites: filter.favorites,
        important: filter.important,
        attachments: filter.attachments
      },
      sort: { userId: 1 },
      stream: true
    }
    return ObservationModelModule.getObservations(this._event, options);
  }

  requestLocations(options: LocationFetchOptions): mongoose.QueryCursor<UserLocationDocument> {
    const filter = {
      eventId: this._event._id
    } as { eventId: number, startDate?: Date, endDate?: Date }
    if (options.startDate) {
      filter.startDate = options.startDate
    }
    if (options.endDate) {
      filter.endDate = options.endDate
    }
    const sort = { userId: 1, "properties.timestamp": 1, _id: 1 };
    return LocationModelModule.getLocations({ stream: true, filter, sort });
  }
}
