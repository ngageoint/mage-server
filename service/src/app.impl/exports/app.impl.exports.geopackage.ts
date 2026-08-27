import path from 'path'
import geojson from 'geojson'
import stream, { Readable } from 'stream'
import os from 'os'
import moment from 'moment'
import { Archiver } from 'archiver'
import { ExportTransform, ObservationFormFieldProjection } from '../../app.api/exports/app.api.exports'
import { ExportItemSummary, ExportOptions, ExportProjection, ExportSummary } from '../../entities/exports/entities.exports'
import { Attachment, AttachmentStore, EventScopedObservationRepository, Observation, ObservationRepositoryForEvent } from '../../entities/observations/entities.observations'
import { UserLocationRepository } from '../../entities/locations/entities.locations'
import { MageEvent } from '../../entities/events/entities.events'
import { User, UserIconContentStore, UserRepository } from '../../entities/users/entities.users'
import { mkdtemp, open, unlink } from 'fs/promises'
import { FeatureTableStyles, GeoPackage, GeoPackageAPI, RTreeIndex } from '@ngageoint/geopackage'
import { IconAttrs } from '../../models/icon'
import { FormFieldType, FormId } from '../../entities/events/entities.events.forms'
import { ObservationIcon, ObservationIconContentStore, ObservationIconRepository } from '../../entities/observations/entities.observations.icons'
import { buffer } from 'stream/consumers'
import { IconRow } from '@ngageoint/geopackage/dist/lib/extension/style/iconRow'
import { Envelope } from '@ngageoint/geopackage/dist/lib/geom/envelope'
import { RelationType } from '@ngageoint/geopackage/dist/lib/extension/relatedTables/relationType'
import { FeatureRow } from '@ngageoint/geopackage/dist/lib/features/user/featureRow'
import { FeatureDao } from '@ngageoint/geopackage/dist/lib/features/user/featureDao'
import { EnvelopeBuilder } from '@ngageoint/geopackage/dist/lib/geom/envelopeBuilder'
import { Logger, NoopLogger } from '../../entities/entities.logging'

const mgrs = require('mgrs')
const wkx = require('wkx')

export class GeoPackageExportTransform implements ExportTransform {
  private iconCache = new IconTreeCache()

  constructor(
    private readonly locationRepository: UserLocationRepository,
    private readonly observationRepository: ObservationRepositoryForEvent,
    private readonly iconStore: ObservationIconContentStore,
    private readonly attachmentStore: AttachmentStore,
    private readonly iconRepository: ObservationIconRepository,
    private readonly userRepository: UserRepository,
    private readonly userIconStore: UserIconContentStore,
    private readonly log: Logger = NoopLogger
  ) {}

  async export(
    event: MageEvent,
    options: ExportOptions,
    projectObservationFormFields: ObservationFormFieldProjection,
    archive: Archiver
  ): Promise<ExportSummary> {
    const response: ExportSummary = {}

    const filePath = await createGeoPackageFile()
    const geopackage = await GeoPackageAPI.create(filePath)

    if (options?.filter?.exportObservations) {
      response.observations = await this.exportObservations(event, options, projectObservationFormFields, geopackage)
    }

    if (options?.filter?.exportLocations) {
      response.locations = await this.addLocationsToGeoPackage(geopackage, event, options)
    }

    const fileHandle = await open(filePath, 'r')
    const filename = event.name.replace(/\W/g, '').replace(/\s+/g, ' ').trim() || `Event_${event.id}`
    archive.append(fileHandle.createReadStream(), { name: filename + '.gpkg' })
    archive.on('end', async () => {
      await unlink(filePath)
      geopackage.close()
    })

    return response
  }

  async exportObservations(
    event: MageEvent,
    options: ExportOptions,
    projectObservationFormFields: ObservationFormFieldProjection,
    geopackage: GeoPackage,
  ): Promise<ExportItemSummary> {
      await addFormDataToGeoPackage(geopackage, event, options.projection)
      await createFormAttributeTables(geopackage, event, options.projection)
      await createObservationTable(geopackage)
      const styles = await this.createObservationFeatureTableStyles(geopackage, event)
      return this.addObservationsToGeoPackage(geopackage, event, styles, options, projectObservationFormFields)
  }

  async addObservationsToGeoPackage(
    geopackage: GeoPackage,
    event: MageEvent,
    styles: FeatureTableStyles,
    options: ExportOptions,
    projectObservationFormFields: ObservationFormFieldProjection
  ): Promise<ExportItemSummary> {
    const { filter, projection } = options
    createAttachmentTable(geopackage)

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

    let count = 0;
    let startTimestamp: number | undefined = undefined
    let endTimestamp: number | undefined = undefined
    let zoomToEnvelope: Envelope | null = null;
    try {
      for await (const observation of iterable) {
        this.log.debug(`exporting observation ${observation.id} ...`)
        count++;
        if (startTimestamp === undefined || observation.properties.timestamp.getTime() < startTimestamp) {
          startTimestamp = observation.properties.timestamp.getTime()
        }
        if (endTimestamp === undefined || observation.properties.timestamp.getTime() > endTimestamp) {
          endTimestamp = observation.properties.timestamp.getTime()
        }

        const forms = projectObservationFormFields(observation, options.projection)

        if (!forms.length) {
          break
        }

        const primaryEntry = forms[0]
        const form = event.formFor(primaryEntry.formId)
        const primary = form?.primaryField ? String(primaryEntry[form.primaryField]) : null
        const variant = form?.primaryField && form?.variantField ? String(primaryEntry[form.variantField]) : null
        const properties: any = {
          lastModified: observation.lastModified,
          timestamp: observation.properties.timestamp,
          mageId: observation.id.toString(),
          createdAt: observation.createdAt,
          primaryField: primary,
          variantField: variant
        }
        if (observation.userId) {
          properties.userId = observation.userId.toString()
        }
        if (observation.deviceId) {
          properties.deviceId = observation.deviceId.toString()
        }

        const feature: geojson.Feature = {
          type: 'Feature',
          geometry: observation.geometry,
          properties
        }

        zoomToEnvelope = calculateBounds(feature.geometry, zoomToEnvelope)

        const featureId = geopackage.addGeoJSONFeatureToGeoPackage(feature, 'Observations')
        const iconSpec = {
          eventId: event.id,
          formId: primaryEntry.formId,
          primary,
          variant,
        }
        await this.linkObservationFeatureIcon(event, iconSpec, featureId, styles)

        const formEntries = observation.properties.forms || []
        for (const formEntry of formEntries) {
          const form = event.formFor(formEntry.formId)!;
          const primary = form.primaryField ? String(formEntry[form.primaryField]) : null
          const variant = form.primaryField && form.variantField ? String(formEntry[form.variantField]) : null
          const formToSave = {
            primaryField: primary,
            variantField: variant,
            formId: formEntry.formId
          } as any;
          const attachments = [] as Attachment[]
          if (observation.attachments) {
            observation.attachments.forEach((attachment) => {
              if (String(attachment.observationFormId) === formEntry.id) {
                attachments.push(attachment);
                const attachmentFieldEntries = (formEntry[attachment.fieldName] || []) as string[]
                attachmentFieldEntries.push(String(attachment.id))
                formEntry[attachment.fieldName] = attachmentFieldEntries
              }
            })
          }
          Object.keys(formEntry).forEach(key => {
            const fieldEntry = formEntry[key] as any
            if (fieldEntry === null || fieldEntry === undefined) {
              return
            }
            const field = event.formFieldFor(key, form.id)
            if (!field) {
              return
            }
            if (field.type === 'multiselectdropdown') {
              formToSave[key] = fieldEntry.join(', ');
            } else if (field.type === 'date') {
              formToSave[key] = moment(fieldEntry).toISOString();
            } else if (field.type === 'checkbox') {
              formToSave[key] = String(fieldEntry)
            } else if (field.type === 'geometry') {
              formToSave[key] = wkx.Geometry.parseGeoJSON(fieldEntry).toWkt();
            } else if (field.type === 'attachment') {
              formToSave[key] = fieldEntry.join(', ');
            } else {
              formToSave[key] = fieldEntry
            }
          })

          try {
            const rowId = geopackage.addAttributeRow('Form_' + formToSave.formId, formToSave);
            if (attachments.length) {
              await this.addAttachments(geopackage, Observation.evaluate(observation, event), attachments, featureId, 'Form_' + formToSave.formId, rowId);
            }
            await geopackage.linkRelatedRows('Observations', featureId, 'Form_' + formToSave.formId, rowId, RelationType.ATTRIBUTES);
          } catch (e) {
            this.log.error(`error writing rows for form entry ${formEntry.id} of observation ${observation.id} to geopackage`, e);
          }
        }
      }
    } finally {
      if (iterable.close) {
        iterable.close()
      }
    }

    const featureDao = geopackage.getFeatureDao('Observations');
    const rtreeIndex = new RTreeIndex(geopackage, featureDao);
    rtreeIndex.create();
    if (zoomToEnvelope) {
      setContentBounds(geopackage, featureDao, zoomToEnvelope);
    }
    this.log.info(`'wrote ${count} observations to geopackage`);

    return { count, startTimestamp: new Date(startTimestamp ?? 0), endTimestamp: new Date(endTimestamp ?? Date.now()) }
  }

  async createObservationFeatureTableStyles(
    geopackage: GeoPackage,
    event: MageEvent
  ): Promise<FeatureTableStyles> {
    const featureTableName = 'Observations'
    const featureTableStyles = new FeatureTableStyles(geopackage, featureTableName)
    await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName)
    await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension()
    await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension()
    featureTableStyles.createRelationships()
    const defaultIcon = await this.iconRepository.getIcon(event.id)
    if (!defaultIcon || isNothing(defaultIcon.contentLocator)) {
      return featureTableStyles
    }
    try {
      const icon = await this.iconStore.readContent(defaultIcon)
      if (icon instanceof stream.Readable) {
        const gpkgIconRow = featureTableStyles.getIconDao().newRow()
        gpkgIconRow.data = await buffer(icon)
        populateGpkgIconRow(gpkgIconRow, defaultIcon, event)
        featureTableStyles.setTableIconDefault(gpkgIconRow)
        this.iconCache.put(defaultIcon, gpkgIconRow.id)
      }
    } catch (err) {
      console.warn('error setting default icon', defaultIcon.contentLocator)
    }

    return featureTableStyles
  }

  async addAttachments(
    geopackage: GeoPackage,
    observation: Observation,
    attachments: Attachment[],
    observationId: number,
    formTable: string,
    formRowId: number,
  ): Promise<void> {
    this.log.info('add attachments');

    for (const attachment of attachments) {
      const content = await this.attachmentStore.readContent(attachment.id, observation)
      if (content instanceof Readable) {
        const data = await buffer(content)
        const mediaId = geopackage.addMedia('Attachments', data, attachment.contentType || 'application/octet-stream', {
          name: attachment.name || attachment.id,
          size: attachment.size || 0
        })
        await geopackage.linkMedia('Observations', observationId, 'Attachments', mediaId)
        geopackage.linkMedia(formTable, formRowId, 'Attachments', mediaId)
      }
    }
  }

  async linkObservationFeatureIcon(
    event: MageEvent,
    iconSpec: IconCachePath,
    featureId: number,
    styles: FeatureTableStyles
  ): Promise<void> {
    const iconId = await this.ensureIconInGeopackage(event, iconSpec, this.iconCache, styles)
    if (iconId === null) {
      return
    }
    const styleExt = styles.getFeatureStyleExtension()
    const iconMappingDao = styles.getIconMappingDao()
    styleExt.insertStyleMapping(iconMappingDao, featureId, iconId)
  }

  async ensureIconInGeopackage(
    event: MageEvent,
    iconSpec: IconCachePath,
    iconCache: any,
    styles: FeatureTableStyles
  ): Promise<IconRow['id'] | null> {
    const cachedIconId = iconCache.get(iconSpec)
    if (cachedIconId === IconTreeCache.ICON_LOAD_ERROR) {
      return null
    }
    if (cachedIconId !== null) {
      return cachedIconId
    }

    const icon = await this.iconRepository.getIcon(event.id, iconSpec.formId, iconSpec.primary, iconSpec.variant)
    if (icon) {
      try {
        const content = await this.iconStore.readContent(icon)
        if (content instanceof Readable) {
          const gpkgIconRow = styles.getIconDao().newRow()
          gpkgIconRow.data = await buffer(content)
          populateGpkgIconRow(gpkgIconRow, icon, event)
          const id = styles.getIconDao().create(gpkgIconRow)
          this.iconCache.put(icon, id)
          return id
        }
      } catch (err) {
        console.warn('error adding icon', icon.contentLocator, err)
      }

      this.iconCache.put(icon, IconTreeCache.ICON_LOAD_ERROR)
    }

    return null
  }

  async addLocationsToGeoPackage(
    geopackage: GeoPackage,
    event: MageEvent,
    options: ExportOptions
  ): Promise<ExportItemSummary> {
    const table = 'Locations'
    await createLocationTable(geopackage, table)
    const featureTableStyles = await createLocationTableStyles(geopackage, table)

    const iterable = this.locationRepository.iterate({
      where: {
        eventId: event.id,
        timestampAfter: options?.filter?.startDate,
        timestampBefore: options?.filter?.endDate
      }
    })

    let count = 0
    let startTimestamp: number | undefined = undefined
    let endTimestamp: number | undefined = undefined
    let user: User | null = null
    const userIconRows: Map<string, IconRow> = new Map()
    let zoomToEnvelope: Envelope | null = null

    try {
      for await (const location of iterable) {
        if (startTimestamp === undefined || location.properties.timestamp.getTime() < startTimestamp) {
          startTimestamp = location.properties.timestamp.getTime()
        }
        if (endTimestamp === undefined || location.properties.timestamp.getTime() > endTimestamp) {
          endTimestamp = location.properties.timestamp.getTime()
        }

        if (user?.id.toString() !== location.userId.toString()) {
          user = await this.userRepository.findById(location.userId)
        }

        zoomToEnvelope = calculateBounds(location.geometry, zoomToEnvelope)

        const properties = location.properties || {} as geojson.Feature<geojson.Point, any>
        const feature: geojson.Feature<geojson.Point, any> = {
          type: 'Feature',
          geometry: location.geometry,
          properties: {
            'User Id': location.userId?.toString(),
            'Username': user?.username,
            'Display Name': user?.displayName,
            'Device Id': properties.deviceId ? properties.deviceId.toString() : undefined,
            'Date/Time': properties.timestamp,
            'Accuracy': properties.accuracy,
            'Altitude': properties.altitude,
            'Bearing': properties.bearing,
            'Speed': properties.speed
          }
        }

        delete feature.properties.id;

        const rowId = await geopackage.addGeoJSONFeatureToGeoPackage(feature, table)
        if (user) {
          const iconContent = await this.userIconStore.readContent(user)
          if (iconContent instanceof Readable) {
            let iconRow = userIconRows.get(user.id)
            if (iconRow === undefined) {
              try {
                iconRow = featureTableStyles.getIconDao().newRow()
                iconRow.data =  await buffer(iconContent)
                iconRow.contentType = 'image/png'
                iconRow.name = user.username
                iconRow.description = `Icon for user ${user.username}`
                iconRow.width = 36
                iconRow.anchorU = 0.5
                iconRow.anchorV = 1.0
                featureTableStyles.setIconDefault(rowId, iconRow)
                userIconRows.set(user.id, iconRow)
              } catch (err) {
                this.log.error(`error reading icon for user: ${user.id}`, err)
              }
            } else {
              featureTableStyles.setIconDefault(rowId, iconRow)
            }
          }
        }

        count++
      }
    } finally {
       iterable.close?.()
    }

    const featureDao = geopackage.getFeatureDao(table);
    if (zoomToEnvelope && user) {
      // Process the last user, since it was missed in the loop above
      const featureDao = geopackage.getFeatureDao('Locations')
      setContentBounds(geopackage, featureDao, zoomToEnvelope)
    }

    const rtreeIndex = new RTreeIndex(geopackage, featureDao);
    rtreeIndex.create();

    this.log.info(`wrote ${count} locations to geopackage`)
    return { count, startTimestamp: new Date(startTimestamp ?? 0), endTimestamp: new Date(endTimestamp ?? Date.now()) }
  }
}

type IconCachePath = Pick<IconAttrs, 'formId' | 'primary' | 'variant'>

async function createGeoPackageFile(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "geopackage-"))
  const filename = moment().format('YYYMMDD_hhmmssSSS') + '.gpkg'
  const filePath = path.join(dir, filename);
  await open(filePath, 'w')
  return filePath
}

async function addFormDataToGeoPackage(
  geopackage: GeoPackage,
  event: MageEvent,
  projection?: ExportProjection
): Promise<void> {
  const columns = [{
    name: 'formName',
    dataType: 'TEXT'
  },{
    name: 'primaryField',
    dataType: 'TEXT'
  },{
    name: 'variantField',
    dataType: 'TEXT'
  },{
    name: 'color',
    dataType: 'TEXT'
  },{
    name: 'formId',
    dataType: 'TEXT'
  }]

  const forms = projection ? event.forms?.filter(form => {
    return projection?.some(formProjection => formProjection.formId === form.id)
  }) : event.forms

  if (forms.length) {
    await geopackage.createAttributesTableFromProperties('Forms', columns)
    forms.forEach(form => {
      const row = {
        formName: form.name,
        primaryField: form.primaryField || null,
        variantField: form.variantField || null,
        color: form.color,
        formId: form.id
      };
      geopackage.addAttributeRow('Forms', row as any);
    })
  }
}

async function createFormAttributeTables(
  geopackage: GeoPackage,
  event: MageEvent,
  projection?: ExportProjection
): Promise<void> {
  const forms = projection ? event.forms?.filter(form => {
    return projection?.some(formProjection => formProjection.formId === form.id)
  }) : event.forms

  for (const form of forms) {
    const columns: any[] = form.fields
      .filter(form => !form.archived)
      .filter(field => {
        if (!projection) {
          return true
        }
        const formProjection = projection.find(formProjection => formProjection.formId === form.id)
        return formProjection?.fields.some(fieldProjection => fieldProjection === field.name)
      })
      .map(field => {
        return {
          dataColumn: {
            column_name: field.name,
            table_name: 'Form_' + form.id,
            name: field.name,
            title: field.title
          },
          name: field.name,
          dataType: fieldTypeToGeoPackageType(field.type)
        }
      })

    columns.push({
      name: 'formId',
      dataType: 'INTEGER',
      default: form.id
    })

    if (form.primaryField) {
      columns.push({
        name: 'primaryField',
        dataType: 'TEXT'
      });
    }

    if (form.variantField) {
      columns.push({
        name: 'variantField',
        dataType: 'TEXT'
      });
    }

    await geopackage.createAttributesTableFromProperties('Form_' + form.id, columns);
  }
}

function fieldTypeToGeoPackageType(fieldType: FormFieldType): string {
  switch (fieldType) {
    case 'numberfield':
      return 'INTEGER'
    case 'attachment':
    case 'textarea':
    case 'textfield':
      return 'TEXT'
    default:
      return 'TEXT'
  }
}

async function createObservationTable(geopackage: GeoPackage): Promise<void> {
  const columns = [{
    name: 'lastModified',
    dataType: 'DATETIME'
  },{
    name: 'timestamp',
    dataType: 'DATETIME'
  },{
    name: 'mageId',
    dataType: 'TEXT'
  },{
    name: 'userId',
    dataType: 'TEXT'
  },{
    name: 'deviceId',
    dataType: 'TEXT'
  },{
    name: 'createdAt',
    dataType: 'DATETIME'
  },{
    name: 'primaryField',
    dataType: 'TEXT'
  },{
    name: 'variantField',
    dataType: 'TEXT'
  }]

  await geopackage.createFeatureTableFromProperties('Observations', columns)
}

function populateGpkgIconRow(gpkgIconRow: IconRow, icon: ObservationIcon, mageEvent: MageEvent): IconRow {
  gpkgIconRow.contentType = 'image/png'
  gpkgIconRow.width = 36
  gpkgIconRow.anchorU = 0.5
  gpkgIconRow.anchorV = 1.0
  const defaultName = `${mageEvent.name} default`
  const name = ((): string => {
    if (isNothing(icon.formId)) {
      if (isNothing(icon.primary)) {
        if (isNothing(icon.variant)) {
          return defaultName
        }
        return icon.variant
      }
      return icon.primary
    }
    const form = mageEvent.formFor(icon.formId)
    if (!form) {
      return defaultName
    }
    return `${form.name} icon`
  })()
  gpkgIconRow.name = name
  return gpkgIconRow
}

function createAttachmentTable(geopackage: GeoPackage): void {
  const columns = [{
    name: "name",
    dataType: "TEXT"
  },{
    name: "size",
    dataType: "REAL"
  }]
  geopackage.createMediaTable('Attachments', columns)
}

function calculateBounds(geometry: geojson.Geometry, zoomToEnvelope: Envelope | null): Envelope {
  const wkxGeometry = wkx.Geometry.parseGeoJSON(geometry);
  const envelope = EnvelopeBuilder.buildEnvelopeWithGeometry(wkxGeometry);
  if (!zoomToEnvelope) {
    return envelope;
  }
  if (zoomToEnvelope.maxX < envelope.maxX) {
    zoomToEnvelope.maxX = envelope.maxX;
  }
  if (zoomToEnvelope.maxY < envelope.maxY) {
    zoomToEnvelope.maxY = envelope.maxY;
  }
  if (zoomToEnvelope.minX > envelope.minX) {
    zoomToEnvelope.minX = envelope.minX;
  }
  if (zoomToEnvelope.minY > envelope.minY) {
    zoomToEnvelope.minY = envelope.minY;
  }
  return zoomToEnvelope;
}

function setContentBounds(
  geopackage: GeoPackage,
  featureDao: FeatureDao<FeatureRow>,
  zoomToEnvelope: Envelope
): void {
  const contents = featureDao.getContents();
  contents.max_x = zoomToEnvelope.maxX;
  contents.max_y = zoomToEnvelope.maxY;
  contents.min_x = zoomToEnvelope.minX;
  contents.min_y = zoomToEnvelope.minY;
  const contentsDao = geopackage.contentsDao;
  contentsDao.update(contents);
}

async function createLocationTable(geopackage: GeoPackage, table: string): Promise<void> {
  const columns = [{
    name: 'Location Id',
    dataType: 'TEXT'
  },{
    name: 'User Id',
    dataType: 'TEXT'
  },{
    name: 'Username',
    dataType: 'TEXT'
  },{
    name: 'Display Name',
    dataType: 'TEXT'
  },{
    name: 'Date/Time',
    dataType: 'DATETIME'
  },{
    name: 'Device Id',
    dataType: 'TEXT'
  },{
    name: 'Accuracy',
    dataType: 'REAL'
  },{
    name: 'Altitude',
    dataType: 'REAL'
  },{
    name: 'Bearing',
    dataType: 'REAL'
  },{
    name: 'Speed',
    dataType: 'REAL'
  }]

  await geopackage.createFeatureTableFromProperties(table, columns)
}

async function createLocationTableStyles(geopackage: GeoPackage, table: string): Promise<FeatureTableStyles> {
  const featureTableName = table
  const featureTableStyles = new FeatureTableStyles(geopackage, featureTableName)
  await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName)
  await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension()
  await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension()
  featureTableStyles.createRelationships()

  return featureTableStyles
}

function isNothing(something: any): something is undefined | null | ''  {
  return something === null || something === undefined || something === '' || (typeof something === 'number' && isNaN(something))
}

class IconTreeCache {

  static readonly ICON_LOAD_ERROR = Number.MIN_SAFE_INTEGER

  readonly root: IconTreeCacheNode = new IconTreeCacheNode()

  constructor() {}

  get(icon: IconCachePath): IconRow['id'] | null {
    const { formId, primary, variant } = icon
    if (!isNothing(formId)) {
      const formNode = this.root.children[formId]
      if (formNode) {
        if (!isNothing(primary)) {
          const primaryNode = formNode.children[primary]
          if (primaryNode) {
            if (!isNothing(variant)) {
              const variantNode = primaryNode.children[variant]
              return variantNode?.gpkgIconId || null
            }
            return primaryNode.gpkgIconId
          }
          return null
        }
        return formNode.gpkgIconId
      }
      return null
    }
    return this.root.gpkgIconId
  }

  put(icon: ObservationIcon, gpkgIconId: IconRow['id']): this {
    const node = this.ensurePathNodes(icon)
    node.gpkgIconId = gpkgIconId
    return this
  }

  private ensurePathNodes(path: IconCachePath): IconTreeCacheNode {
    const { formId, primary, variant } = path
    if (!isNothing(formId)) {
      const formNode = this.root.children[formId] = this.root.children[formId] || new IconTreeCacheNode()
      if (!isNothing(primary)) {
        const primaryNode = formNode.children[primary] = formNode.children[primary] || new IconTreeCacheNode()
        if (!isNothing(variant)) {
          return primaryNode.children[variant] = primaryNode.children[variant] || new IconTreeCacheNode()
        }
        return primaryNode
      }
      return formNode
    }
    return this.root
  }
}

class IconTreeCacheNode {

  gpkgIconId: IconRow['id'] | null = null
  readonly children: { [key: FormId | string]: IconTreeCacheNode | undefined }

  constructor(gpkgRowId: number | null = null, children: IconTreeCacheNode['children'] = {}) {
    this.gpkgIconId = isNothing(gpkgRowId) ? null : gpkgRowId
    this.children = children
  }
}

