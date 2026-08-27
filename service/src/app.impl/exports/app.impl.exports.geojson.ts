import archiver, { Archiver } from 'archiver'
import { AllGeoJSON } from '@turf/helpers'
import turfCentroid from '@turf/centroid'
import stream, { Readable } from 'stream'
import { ExportTransform, ObservationFormFieldProjection } from '../../app.api/exports/app.api.exports'
import { ExportItemSummary, ExportOptions, ExportSummary } from '../../entities/exports/entities.exports'
import { Attachment, AttachmentStore, EventScopedObservationRepository, FormEntry, Observation, ObservationAttrs, ObservationRepositoryForEvent } from '../../entities/observations/entities.observations'
import { UserLocationRepository } from '../../entities/locations/entities.locations'
import { MageEvent } from '../../entities/events/entities.events'
import { User, UserRepository } from '../../entities/users/entities.users'
import { DevicesRepository } from '../../entities/devices/entities.devices'
import moment from 'moment'
import { FormFieldType } from '../../entities/events/entities.events.forms'

const mgrs = require('mgrs')

export class GeoJsonExportTransform implements ExportTransform {

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
    const observationStream = new stream.PassThrough()
    try {
      archive.append(observationStream, { name: 'observations.geojson' })
      return await this.streamObservations(event, options, projectObservationFormFields, observationStream, archive)
    } finally {
      observationStream.end()
    }
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
    const iterable = repository.iterate({
      where: {
        stateIsAnyOf: [ 'active' ],
        timestampAfter: filter?.startDate,
        timestampBefore: filter?.endDate,
        isFavoriteOfUser: filter?.favorites ? filter.favorites.userId : undefined,
        isFlaggedImportant: filter?.important ? true : undefined
      },
      includeAttachments: filter?.includeAttachments
    })

    try {
      let count = 0
      let startTimestamp: number | undefined = undefined
      let endTimestamp: number | undefined = undefined
      let user: User | null = null
      let device: any = null

      for await (const observation of iterable) {
        if (startTimestamp === undefined || observation.properties.timestamp.getTime() < startTimestamp) {
          startTimestamp = observation.properties.timestamp.getTime()
        }
        if (endTimestamp === undefined || observation.properties.timestamp.getTime() > endTimestamp) {
          endTimestamp = observation.properties.timestamp.getTime()
        }

        if (count > 0) {
          stream.write(',')
        }

        const forms = projectObservationFormFields(observation, options.projection)
        this.mapObservationProperties(event, observation, forms, archive)

        if (observation.userId) {
          if (!user || user.id !== observation.userId) {
            if (observation.userId) {
              user = await this.userRepository.findById(observation.userId!)
            }
          }
        }

        if (observation.deviceId) {
          if (!device || device.id.toString() !== observation.deviceId?.toString()) {
            if (observation.deviceId) {
              device = await this.deviceRepository.getDeviceById(observation.deviceId)
            }
          }
        }
        const exportProperties = observation.properties as any
        if (user) {
          exportProperties.user = user.username
        }
        if (device) {
          exportProperties.device = device.uid
        }
        const data = JSON.stringify({
          geometry: observation.geometry,
          properties: observation.properties
        })

        stream.write(data)

        count++
      }

      return { count, startTimestamp: new Date(startTimestamp ?? 0), endTimestamp: new Date(endTimestamp ?? Date.now()) }
    } finally {
      if (iterable.close) {
        iterable.close()
      }
      stream.push(null)
    }
  }

  async exportLocations(
    event: MageEvent,
    options: ExportOptions,
    archive: Archiver
  ): Promise<ExportItemSummary> {
    const locationStream = new stream.PassThrough()
    try {
      archive.append(locationStream, { name: 'locations.geojson' })
      return await this.streamLocations(event, options, locationStream)
    } finally {
      locationStream.end()
    }
  }

  async streamLocations(
    event: MageEvent,
    options: ExportOptions,
    stream: stream.Transform
  ): Promise<ExportItemSummary> {
    stream.write('{"type": "FeatureCollection", "features": [')

    let count = 0
    let startTimestamp: number | undefined = undefined
    let endTimestamp: number | undefined = undefined

    const iterable = this.locationRepository.iterate({
      where: {
        eventId: event.id,
        timestampAfter: options?.filter?.startDate,
        timestampBefore: options?.filter?.endDate
      }
    })

    try {
      for await (const location of iterable) {
        if (count > 0) {
          stream.write(',')
        }

        const centroid = turfCentroid(location)
        const exportProperties = location.properties as any
        exportProperties.mgrs = mgrs.forward(centroid.geometry.coordinates)
        const data = JSON.stringify(location)
        stream.write(data)
        count++
        if (startTimestamp === undefined || location.properties.timestamp.getTime() < startTimestamp) {
          startTimestamp = location.properties.timestamp.getTime()
        }
        if (endTimestamp === undefined || location.properties.timestamp.getTime() > endTimestamp) {
          endTimestamp = location.properties.timestamp.getTime()
        }
      }
    } finally {
      if (iterable.close) {
        iterable.close()
      }
    }

    stream.write(']}')
    return { count, startTimestamp: new Date(startTimestamp ?? 0), endTimestamp: new Date(endTimestamp ?? Date.now()) }
  }

  mapObservationProperties(
    event: MageEvent,
    observation: ObservationAttrs,
    forms: FormEntry[],
    archive: archiver.Archiver
  ): void {
    const centroid = turfCentroid(observation as any)
    const exportProperties = {
      ...observation.properties,
      id: observation.id,
      timestamp: moment(observation.properties.timestamp).toISOString(),
      mgrs: mgrs.forward(centroid.geometry.coordinates),
    } as any
    delete exportProperties.forms
    const { formEntriesByName, exportAttachments } = forms.reduce(({ formEntriesByName, exportAttachments }, formEntry) => {
      const form = event.formFor(formEntry.formId)
      if (!form) {
        return { formEntriesByName, exportAttachments }
      }
      const { fieldEntryHash, entryAttachments } = form.fields.reduce(({ fieldEntryHash, entryAttachments }, field) => {
        if (field.archived || field.type === FormFieldType.Password || field.type === FormFieldType.Geometry ||
          (field.type === FormFieldType.CheckBox && field.value === null)) {
          return { fieldEntryHash, entryAttachments }
        }
        if (field.type === FormFieldType.Attachment) {
          const fieldAttachments = observation.attachments.filter(attachment => {
            return attachment.contentLocator &&
              attachment.fieldName === field.name &&
              String(attachment.observationFormId) === String(formEntry.id)
            }
          )
          const attachmentRelPaths = fieldAttachments.map(x => x.contentLocator)
          fieldEntryHash[field.title] = attachmentRelPaths
          entryAttachments = entryAttachments.concat(fieldAttachments)
        } else if (formEntry[field.name] !== undefined) {
          fieldEntryHash[field.title] = formEntry[field.name]
        }
        return { fieldEntryHash, entryAttachments }
      }, { fieldEntryHash: {} as any, entryAttachments: [] as Attachment[] })
      const entriesForForm = formEntriesByName[form.name] || []
      entriesForForm.push(fieldEntryHash)
      formEntriesByName[form.name] = entriesForForm
      exportAttachments = exportAttachments.concat(entryAttachments)
      return { formEntriesByName, exportAttachments }
    }, { formEntriesByName: {} as any, exportAttachments: [] as Attachment[] })

    exportAttachments.forEach(async attachment => {
      const content = await this.attachmentStore.readContent(attachment.id, Observation.evaluate(observation, event))
      if (content instanceof Readable) {
        const name = attachment.name || `Attachment_${attachment.id}`
        archive.append(content, { name })
      }
    })

    observation.properties = { ...exportProperties, ...formEntriesByName }
  }
}
