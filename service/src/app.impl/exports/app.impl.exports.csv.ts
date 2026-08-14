import archiver, { Archiver } from 'archiver'
import { AllGeoJSON } from '@turf/helpers'
import turfCentroid from '@turf/centroid'
import * as json2csv from 'json2csv'
import stream, { Readable } from 'stream'
import { ExportTransform, ObservationFormFieldProjection } from '../../app.api/exports/app.api.exports'
import { ExportItemSummary, ExportOptions, ExportSummary } from '../../entities/exports/entities.exports'
import { AttachmentStore, EventScopedObservationRepository, FormEntry, Observation, ObservationAttrs, ObservationRepositoryForEvent } from '../../entities/observations/entities.observations'
import { UserLocation, UserLocationProperties, UserLocationRepository } from '../../entities/locations/entities.locations'
import { MageEvent } from '../../entities/events/entities.events'
import { User, UserRepository } from '../../entities/users/entities.users'
import { Device, DevicesRepository } from '../../entities/devices/entities.devices'

const mgrs = require('mgrs')
const wkx = require('wkx')

export class CsvExportTransform implements ExportTransform {

  constructor(
    private readonly locationRepository: UserLocationRepository,
    private readonly observationRepository: ObservationRepositoryForEvent,
    private readonly attachmentStore: AttachmentStore,
    private readonly deviceRepository: DevicesRepository,
    private readonly userRepository: UserRepository
  ) {}

  async export(
    event: MageEvent,
    options: ExportOptions,
    projectObservationFormFields: ObservationFormFieldProjection,
    archive: Archiver
  ): Promise<ExportSummary> {
    const response: ExportSummary = {}

    if (options?.filter?.exportObservations) {
      response.observations = await this.exportObservations(event, options, projectObservationFormFields, archive)
    }

    if (options?.filter?.exportLocations) {
      response.locations = await this.exportLocations(event, options, archive)
    }

    return response
  }

  async exportObservations(
    event: MageEvent,
    options: ExportOptions,
    projectObservationFormFields: ObservationFormFieldProjection,
    archive: Archiver
  ): Promise<ExportItemSummary> {
    const { filter, projection } = options

    const forms = event?.forms || []
    const observationFields = [
      { label: 'id', value: 'id' },
      { label: 'User', value: 'user' },
      { label: 'Device', value: 'device' },
      { label: 'Shape Type', value: 'shapeType' },
      { label: 'Latitude', value: 'latitude' },
      { label: 'Longitude', value: 'longitude' },
      { label: 'MGRS', value: 'mgrs' },
      { label: 'Date (ISO8601)', value: 'timestamp' },
      { label: 'Excel Timestamp (UTC)', value: 'excelTimestamp' },
      { label: 'Well Known Text', value: 'wkt' },
      { label: 'Location Provider', value: 'provider' },
      { label: 'Location Accuracy +/- (meters)', value: 'accuracy' },
    ].concat(forms
      .filter(form => !form.archived)
      .flatMap(form => {
        const fields = form.fields
          .filter(field => !field.archived)
          .filter(field => field.type !== 'attachment')
          .filter(field => {
            if (!projection) {
              return true
            }
            const formProjection = projection.find(formProjection => formProjection.formId === form.id)
            return formProjection?.fields.some(fieldProjection => fieldProjection === field.name)
          })
          .sort((a, b) => a.id - b.id)
          .map(field => {
            return {
              label: `${form.name}.${field.title}`,
              value: `${form.name}.${field.name}`
            }
          })
        return fields
      }))
      
    if (filter?.includeAttachments) {
      observationFields.push({
        label: 'Attachment',
        value: 'attachment'
      })

      observationFields.push({
        label: 'Attachment Orig Name',
        value: 'attachmentOriginalName'
      })
    }  

    const asyncParser = new json2csv.AsyncParser({ fields: observationFields }, { readableObjectMode: true, writableObjectMode: true })
    archive.append(asyncParser.processor as stream.Transform, { name: 'observations.csv' })
    return this.streamObservations(event, options, projectObservationFormFields, asyncParser.input, archive)
  }

  async streamObservations(
    event: MageEvent,
    options: ExportOptions,
    projectObservationFormFields: ObservationFormFieldProjection,
    stream: stream.Transform,
    archive: archiver.Archiver
  ): Promise<ExportItemSummary> {
    const { filter } = options

    const repository: EventScopedObservationRepository = await this.observationRepository(event.id)
    const iterable = repository.find(event, {
      filter: {
        states: [ 'active' ],
        observationStartDate: filter?.startDate,
        observationEndDate: filter?.endDate,
        favorites: filter?.favorites,
        important: filter?.important,
        includeAttachments: filter?.includeAttachments
      },
      sort: { userId: 1 },
      stream: true
    })

    try {
      let count = 0
      let startTimestamp: number | undefined = undefined
      let endTimestamp: number | undefined = undefined
      const cache = {
        user: null,
        device: null
      }
      
      for await (const observation of iterable) {
        if (startTimestamp === undefined || observation.properties.timestamp.getTime() < startTimestamp) {
          startTimestamp = observation.properties.timestamp.getTime()
        }
        if (endTimestamp === undefined || observation.properties.timestamp.getTime() > endTimestamp) {
          endTimestamp = observation.properties.timestamp.getTime()
        }

        const forms = projectObservationFormFields(observation, options.projection)
        const properties = await this.observationColumns(event, observation, forms, cache, archive)
        stream.push(properties)
        count++
      }

      return { count, startTimestamp, endTimestamp }
    } finally {
      if (iterable.close) {
        iterable.close()
      }
      stream.push(null)
    }
  }

  async observationColumns(
    event: MageEvent,
    observation: ObservationAttrs,
    forms: FormEntry[],
    cache: { user: User | null, device: Device | null },
    archive: archiver.Archiver,
  ): Promise<any> {
    const column = {
      id: observation.id,
      ...observation.properties
    } as any

    if (!cache.user || cache.user.id !== observation.userId) {
      if (observation.userId) {
        cache.user = await this.userRepository.findById(observation.userId!)
      }
    }
    
    if (!cache.device || cache.device.id.toString() !== observation.deviceId?.toString()) {
      if (observation.deviceId) {
        cache.device = await this.deviceRepository.getDeviceById(observation.deviceId)
      }
    }

    if (cache.user) {
      column.user = cache.user.username
    }
    if (cache.device) {
      column.device = cache.device.uid
    }

    const centroid = turfCentroid(observation as any)
    column.mgrs = mgrs.forward(centroid.geometry.coordinates)

    column.shapeType = observation.geometry.type
    if (observation.geometry.type === 'Point') {
      column.longitude = observation.geometry.coordinates[0]
      column.latitude = observation.geometry.coordinates[1]
    } else {
      column.longitude = centroid.geometry.coordinates[0]
      column.latitude = centroid.geometry.coordinates[1]
    }
    column.wkt = wkx.Geometry.parseGeoJSON(observation.geometry).toWkt()
    column.excelTimestamp = "=DATEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),1,10)) + TIMEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),12,8))"

    forms.forEach(formEntry => {
      const form = event.formFor(formEntry.formId)
      if (!form) {
        return
      }
      for (const field of form.fields) {
        const fieldEntry = formEntry[field.name]
        if (fieldEntry) {
          column[`${form.name}.` + field.name] = fieldEntry
        }
      }
    })

    if (observation.attachments) {
      for (const attachment of observation.attachments) {
        const content = await this.attachmentStore.readContent(attachment.id, Observation.evaluate(observation, event))

        if (content instanceof Readable) {
          const name = attachment.name || `Attachment_${attachment.id}`
          column.attachment = name
          column.attachmentOriginalName = attachment.name
          archive.append(content, { name })
        }
      }
    }

    return column
  }

  async exportLocations(
    event: MageEvent,
    options: ExportOptions,
    archive: Archiver
  ): Promise<ExportItemSummary> {
    const locationFields = [
      'user',
      'timestamp',
      'latitude',
      'longitude',
      'altitude',
      'provider',
      'mgrs',
      'accuracy',
      'speed',
      'bearing',
      'battery_level',
      'device'
    ]

    const asyncParser = new json2csv.AsyncParser({ fields: locationFields }, { readableObjectMode: true, writableObjectMode: true })
    archive.append(asyncParser.processor as stream.Transform, { name: 'locations.csv' })
    return this.streamLocations(event, options, asyncParser.input)
  }

  async streamLocations(
    event: MageEvent,
    options: ExportOptions,
    stream: stream.Transform
  ): Promise<ExportItemSummary> {
    const locations = this.locationRepository.getLocations({
      filter: {
        eventId: event.id,
        startDate: options?.filter?.startDate,
        endDate: options?.filter?.endDate
      },
      sort: { userId: 1, 'properties.timestamp': 1, _id: 1 }
    })

    const cache = {
      user: null,
      device: null
    }
    try {
      let count = 0
      let startTimestamp: number | undefined = undefined
      let endTimestamp: number | undefined = undefined
      for await (const location of locations) {
        const locationRecord = await this.flattenLocation(location, cache)
        stream.push(locationRecord)
        count++
        if (startTimestamp === undefined || location.properties.timestamp.getTime() < startTimestamp) {
          startTimestamp = location.properties.timestamp.getTime()
        }
        if (endTimestamp === undefined || location.properties.timestamp.getTime() > endTimestamp) {
          endTimestamp = location.properties.timestamp.getTime()
        }
      }

      return { count, startTimestamp, endTimestamp }
    } finally {
      if (locations.close) {
        locations.close()
      }
      stream.push(null)
    }
  }

  async flattenLocation(location: UserLocation, cache: { user: User | null, device: any }): Promise<any> {
    const flat = {
      ...location.properties,
      user: undefined as string | undefined,
      device: undefined as string | undefined,
      longitude: location.geometry.coordinates[0],
      latitude: location.geometry.coordinates[1],
      mgrs: mgrs.forward(location.geometry.coordinates),
    } as UserLocationProperties & { user?: string, device?: string }
    if (!cache.user || cache.user.id !== location.userId) {
      cache.user = await this.userRepository.findById(location.userId)
    }
    if (!cache.device || cache.device._id.toString() !== flat.deviceId?.toString()) {
      cache.device = flat.deviceId ? await this.deviceRepository.getDeviceById(flat.deviceId) : undefined
    }
    if (cache.user) {
      flat.user = cache.user.username
    }
    if (cache.device) {
      flat.device = cache.device.uid
    }
    return flat
  }
}
