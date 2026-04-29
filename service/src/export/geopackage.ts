'use strict';

import { RelationType } from '@ngageoint/geopackage/dist/lib/extension/relatedTables/relationType'
import { EnvelopeBuilder } from '@ngageoint/geopackage/dist/lib/geom/envelopeBuilder'
import * as GPKG from '@ngageoint/geopackage'
import { GeoPackageAPI } from '@ngageoint/geopackage'
import { Envelope } from '@ngageoint/geopackage/dist/lib/geom/envelope'
import { FeatureDao } from '@ngageoint/geopackage/dist/lib/features/user/featureDao'
import { FeatureRow } from '@ngageoint/geopackage/dist/lib/features/user/featureRow'
import geojson from 'geojson'
import util from 'util'
import fs from 'fs'
import fs_async from 'fs/promises'
import archiver from 'archiver'
import moment from 'moment'
import os from 'os'
import path from 'path'
import wkx from 'wkx'
import { Exporter } from './exporter'
import api from '../api'
import environment from '../environment/env'
import User, { UserDocument } from '../models/user'
import { FormFieldType, FormId } from '../entities/events/entities.events.forms'
import { AttachmentDocument } from '../models/observation'
import { IconRow } from '@ngageoint/geopackage/dist/lib/extension/style/iconRow'
import { IconAttrs, IconDocument } from '../models/icon'
import { MageEvent } from '../entities/events/entities.events'

// TODO: we really need to revamp our logging
const logger = require('../logger')
const log = [ 'debug', 'info', 'warn', 'error', 'log' ].reduce((log: any, methodName: string): any => {
  const logMethod = logger[methodName] as (...args: any[]) => any
  return {
    ...log,
    [methodName]: (...args: any[]) => logMethod('[export:geopackage]', ...args)
  }
}, {} as any)

const attachmentBase = environment.attachmentBaseDirectory;

export class GeoPackage extends Exporter {

  private iconCache = new IconTreeCache()
  private observationStyles: GPKG.FeatureTableStyles | null = null

  async export(streamable: NodeJS.WritableStream): Promise<void> {
    log.info(`export geopackage for event ${this._event.id} - ${this._event.name}:\n`, this._filter)
    const safeEventName = this._event.name.replace(/\W/g, '').replace(/\s+/g, ' ').trim()
    const downloadedFileName = `MAGE ${safeEventName || 'Event ' + this._event.id}`
    const archive = archiver('zip')
    archive.pipe(streamable)
    try {
      const filePath = await createGeoPackageFile();
      const gp = await GeoPackageAPI.create(filePath);
      if (this._filter.exportObservations) {
        await this.addFormDataToGeoPackage(gp);
        await this.createFormAttributeTables(gp);
        await this.createObservationTable(gp);
        this.observationStyles = await this.createObservationFeatureTableStyles(gp);
        await this.addObservationsToGeoPackage(gp);
      }
      if (this._filter.exportLocations) {
        await this.addLocationsToGeoPackage(gp);
      }
      log.info(`export geopackage created: ${filePath}`)
      archive.append(fs.createReadStream(filePath), { name: downloadedFileName + '.gpkg' })
      archive.on('end', () => {
        log.info(`removing temporary export geopackage file ${filePath}`)
        fs.unlink(filePath, (err?: any) => {
          if (err) {
            console.warn('error removing temporary geopackage', filePath)
          }
          gp.close()
        })
      })
      archive.finalize()
    }
    catch (err) {
      log.error(`error exporting geopackage`, err)
      throw err
    }
  }

  async createObservationTable(geopackage: GPKG.GeoPackage): Promise<void> {
    log.info('create observation table');
    const columns = [];

    // TODO columns should be the same as KML file
    columns.push({
      name: 'lastModified',
      dataType: 'DATETIME'
    });
    columns.push({
      name: 'timestamp',
      dataType: 'DATETIME'
    });
    columns.push({
      name: 'mageId',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'userId',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'deviceId',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'createdAt',
      dataType: 'DATETIME'
    });
    columns.push({
      name: 'primaryField',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'variantField',
      dataType: 'TEXT'
    });

    await geopackage.createFeatureTableFromProperties('Observations', columns);
  }

  createAttachmentTable(geopackage: GPKG.GeoPackage): void {
    log.info('create attachment table');
    const columns = [{
      name: "name",
      dataType: "TEXT"
    }, {
      name: "size",
      dataType: "REAL"
    }];
    geopackage.createMediaTable('Attachments', columns);
  }

  async createLocationTable(geopackage: GPKG.GeoPackage, table: string): Promise<void> {
    const columns = [];

    columns.push({
      name: 'Location Id',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'User Id',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'Username',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'Display Name',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'Date/Time',
      dataType: 'DATETIME'
    });
    columns.push({
      name: 'Device Id',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'Accuracy',
      dataType: 'REAL'
    });
    columns.push({
      name: 'Altitude',
      dataType: 'REAL'
    });
    columns.push({
      name: 'Bearing',
      dataType: 'REAL'
    });
    columns.push({
      name: 'Speed',
      dataType: 'REAL'
    });

    await geopackage.createFeatureTableFromProperties(table, columns);
  }

  async createLocationTableStyles(geopackage: GPKG.GeoPackage, table: string): Promise<GPKG.FeatureTableStyles> {
    const featureTableName = table;
    const featureTableStyles = new GPKG.FeatureTableStyles(geopackage, featureTableName);
    await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName);
    await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension();
    await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension();
    featureTableStyles.createRelationships();

    return featureTableStyles
  }

  async addLocationsToGeoPackage(geopackage: GPKG.GeoPackage): Promise<void> {
    log.info('fetching locations')
    const table = 'Locations'
    await this.createLocationTable(geopackage, table)
    const featureTableStyles = await this.createLocationTableStyles(geopackage, table)

    const { startDate, endDate } = this._filter
    const cursor = this.requestLocations({ startDate, endDate })
    let numLocations = 0
    let user: UserDocument | null = null
    const userIconRows: Map<string, IconRow> = new Map()
    let zoomToEnvelope: Envelope | null = null
    return cursor.eachAsync(async location => {
      if (user?._id.toString() !== location.userId.toString()) {
        user = await User.getUserById(location.userId);
      }

      zoomToEnvelope = calculateBounds(location.geometry, zoomToEnvelope)

      const properties = location.properties || {} as geojson.Feature<geojson.Point, any>
      const feature: geojson.Feature<geojson.Point, any> = {
        type: 'Feature',
        geometry: location.geometry,
        properties: {
          'Location Id': location._id.toString(),
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
      const iconPath = user?.icon.relativePath ? path.join(environment.userBaseDirectory, user.icon.relativePath) : null
      if (user && iconPath) {
        let iconRow = userIconRows.get(user.id)
        if (iconRow === undefined) {
          try {
            iconRow = featureTableStyles.getIconDao().newRow()
            const iconBuffer = await fs_async.readFile(iconPath)
            iconRow.data = iconBuffer
            iconRow.contentType = 'image/png'
            iconRow.name = user.username
            iconRow.description = `Icon for user ${user.username}`
            iconRow.width = 20
            iconRow.anchorU = 0.5
            iconRow.anchorV = 1.0
            featureTableStyles.setIconDefault(rowId, iconRow)
            userIconRows.set(user.id, iconRow)
          } catch (err) {
            log.error(`error reading user icon for geopackage export: ${iconPath}`, err)
            return void (0)
          }
        } else {
          featureTableStyles.setIconDefault(rowId, iconRow)
        }
      }

      numLocations++
    }).then(async () => {
      if (cursor) {
        cursor.close()
      }

      const featureDao = geopackage.getFeatureDao(table);
      if (zoomToEnvelope && user) {
        // Process the last user, since it was missed in the loop above
        const featureDao = geopackage.getFeatureDao('Locations')
        setContentBounds(geopackage, featureDao, zoomToEnvelope)
      }

      const rtreeIndex = new GPKG.RTreeIndex(geopackage, featureDao);
      rtreeIndex.create();

      log.info(`wrote ${numLocations} locations to geopackage`)
    })
    .catch(err => { log.warn(err) })
  }

  async createFormAttributeTables(geopackage: GPKG.GeoPackage): Promise<void> {
    log.info('create form attribute tables');
    for (const form of this._event.forms) {
      const columns = [];
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
      columns.push({
        name: 'formId',
        dataType: 'INTEGER',
        default: form.id
      });
      for (let i = 0; i < form.fields.length; i++) {
        const field = form.fields[i];
        columns.push({
          dataColumn: {
            column_name: field.name,
            table_name: 'Form_' + form.id,
            name: field.name,
            title: field.title
          },
          name: field.name,
          dataType: this.fieldTypeToGeoPackageType(field.type)
        });
      }
      await geopackage.createAttributesTableFromProperties('Form_' + form.id, columns);
    }
  }

  fieldTypeToGeoPackageType(fieldType: FormFieldType): string {
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

  async addFormDataToGeoPackage(geopackage: GPKG.GeoPackage): Promise<void> {
    const columns = [];
    columns.push({
      name: 'formName',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'primaryField',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'variantField',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'color',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'formId',
      dataType: 'TEXT'
    });

    await geopackage.createAttributesTableFromProperties('Forms', columns)
    for (const form of this._event.forms) {
      const row = {
        formName: form.name,
        primaryField: form.primaryField || null,
        variantField: form.variantField || null,
        color: form.color,
        formId: form.id
      };
      geopackage.addAttributeRow('Forms', row as any);
    }
  }

  async addObservationsToGeoPackage(geopackage: GPKG.GeoPackage): Promise<void> {
    log.info('requesting locations from db');

    this.createAttachmentTable(geopackage);

    const cursor = this.requestObservations(this._filter);

    let numObservations = 0;
    let zoomToEnvelope: Envelope;
    return cursor.eachAsync(async observation => {

      console.debug('exporting observation', observation.id, '...')
      numObservations++;

      if (!Array.isArray(observation.properties.forms)) {
        return
      }
      const primaryEntry = observation.properties.forms[0]
      if (!primaryEntry) {
        return
      }
      const form = this._event.formFor(primaryEntry.formId)
      const primary = form?.primaryField ? String(primaryEntry[form.primaryField]) : null
      const variant = form?.primaryField && form?.variantField ? String(primaryEntry[form.variantField]) : null
      const properties: any = {
        lastModified: observation.lastModified,
        timestamp: observation.properties.timestamp,
        mageId: observation._id.toString(),
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
        eventId: this._event.id,
        formId: primaryEntry.formId,
        primary,
        variant,
      }
      await this.linkObservationFeatureIcon(iconSpec, featureId)

      const formEntries = observation.properties.forms || []
      for (const formEntry of formEntries) {
        const form = this._event.formFor(formEntry.formId)!;
        const primary = form.primaryField ? String(formEntry[form.primaryField]) : null
        const variant = form.primaryField && form.variantField ? String(formEntry[form.variantField]) : null
        const formToSave = {
          primaryField: primary,
          variantField: variant,
          formId: formEntry.formId
        } as any;
        const attachments = [] as AttachmentDocument[];
        if (observation.attachments) {
          observation.attachments.forEach((attachment) => {
            if (String(attachment.observationFormId) === String(formEntry._id)) {
              attachments.push(attachment);
              const attachmentFieldEntries = (formEntry[attachment.fieldName] || []) as string[]
              attachmentFieldEntries.push(String(attachment._id))
              formEntry[attachment.fieldName] = attachmentFieldEntries
            }
          })
        }
        Object.keys(formEntry).forEach(key => {
          const fieldEntry = formEntry[key] as any
          if (fieldEntry === null || fieldEntry === undefined) {
            return
          }
          const field = this._event.formFieldFor(key, form.id)
          if (!field) {
            return
          }
          if (field.type === 'multiselectdropdown') {
            formToSave[key] = fieldEntry.join(', ');
          }
          else if (field.type === 'date') {
            formToSave[key] = moment(fieldEntry).toISOString();
          }
          else if (field.type === 'checkbox') {
            formToSave[key] = String(fieldEntry)
          }
          else if (field.type === 'geometry') {
            formToSave[key] = wkx.Geometry.parseGeoJSON(fieldEntry).toWkt();
          }
          else if (field.type === 'attachment') {
            formToSave[key] = fieldEntry.join(', ');
          }
          else {
            formToSave[key] = fieldEntry
          }
        })

        try {
          const rowId = geopackage.addAttributeRow('Form_' + formToSave.formId, formToSave);
          if (attachments.length) {
            await addAttachments(geopackage, attachments, featureId, 'Form_' + formToSave.formId, rowId);
          }
          await geopackage.linkRelatedRows('Observations', featureId, 'Form_' + formToSave.formId, rowId, RelationType.ATTRIBUTES);
        }
        catch (e) {
          log.error(`error writing rows for form entry ${formEntry.id} of observation ${observation.id} to geopackage`, e);
        }
      }
    })
    .then(async () => {
      if (cursor) {
        await cursor.close()
      }
      const featureDao = geopackage.getFeatureDao('Observations');
      const rtreeIndex = new GPKG.RTreeIndex(geopackage, featureDao);
      rtreeIndex.create();
      if (zoomToEnvelope) {
        setContentBounds(geopackage, featureDao, zoomToEnvelope);
      }
      log.info(`'wrote ${numObservations} observations to geopackage`);
    })
    .catch(err => {
      log.warn(err)
    });
  }

  async createObservationFeatureTableStyles(geopackage: GPKG.GeoPackage): Promise<GPKG.FeatureTableStyles> {
    const featureTableName = 'Observations'
    const featureTableStyles = new GPKG.FeatureTableStyles(geopackage, featureTableName)
    await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName)
    await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension()
    await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension()
    featureTableStyles.createRelationships()
    const defaultIconAccess = new api.Icon(this._event.id)
    const defaultIconDoc = await util.promisify(defaultIconAccess.getIcon.bind(defaultIconAccess))()
    if (!defaultIconDoc || isNothing(defaultIconDoc.path)) {
      return featureTableStyles
    }
    try {
      const iconBytes = await fs_async.readFile(defaultIconDoc.path)
      const gpkgIconRow = featureTableStyles.getIconDao().newRow()
      gpkgIconRow.data = iconBytes
      populateGpkgIconRow(gpkgIconRow, defaultIconDoc, this._event)
      featureTableStyles.setTableIconDefault(gpkgIconRow)
      this.iconCache.put(defaultIconDoc, gpkgIconRow.id)
    }
    catch (err) {
      console.warn('error setting default icon', defaultIconDoc.path)
    }
    return featureTableStyles
  }

  async linkObservationFeatureIcon(iconSpec: IconCachePath, featureId: number): Promise<void> {
    const iconId = await this.ensureIconInGeopackage(iconSpec)
    if (iconId === null) {
      return
    }
    const styleExt = this.observationStyles!.getFeatureStyleExtension()
    const iconMappingDao = this.observationStyles!.getIconMappingDao()
    styleExt.insertStyleMapping(iconMappingDao, featureId, iconId)
  }

  async ensureIconInGeopackage(iconSpec: IconCachePath): Promise<IconRow['id'] | null> {
    const cachedIconId = this.iconCache.get(iconSpec)
    if (cachedIconId === IconTreeCache.ICON_LOAD_ERROR) {
      return null
    }
    if (cachedIconId !== null) {
      return cachedIconId
    }
    const iconAccess = new api.Icon(this._event.id, iconSpec.formId, iconSpec.primary, iconSpec.variant)
    const iconDoc = await util.promisify(iconAccess.getIcon.bind(iconAccess))()
    if (!iconDoc || isNothing(iconDoc.path)) {
      return null
    }
    try {
      const iconBytes = await fs_async.readFile(iconDoc.path)
      const gpkgIconRow = this.observationStyles!.getIconDao().newRow()
      gpkgIconRow.data = iconBytes
      populateGpkgIconRow(gpkgIconRow, iconDoc, this._event)
      const id = this.observationStyles!.getIconDao().create(gpkgIconRow)
      this.iconCache.put(iconDoc, id)
      return id
    }
    catch (err) {
      console.warn('error adding icon', iconDoc.path, err)
    }
    this.iconCache.put(iconDoc, IconTreeCache.ICON_LOAD_ERROR)
    return null
  }
}

function populateGpkgIconRow(gpkgIconRow: IconRow, iconDoc: IconDocument, mageEvent: MageEvent): IconRow {
  gpkgIconRow.contentType = 'image/png'
  gpkgIconRow.width = 20
  gpkgIconRow.anchorU = 0.5
  gpkgIconRow.anchorV = 1.0
  const defaultName = `${mageEvent.name} default`
  const name = ((): string => {
    if (isNothing(iconDoc.formId)) {
      if (isNothing(iconDoc.primary)) {
        if (isNothing(iconDoc.variant)) {
          return defaultName
        }
        return iconDoc.variant
      }
      return iconDoc.primary
    }
    const form = mageEvent.formFor(iconDoc.formId)
    if (!form) {
      return defaultName
    }
    return `${form.name} icon`
  })()
  gpkgIconRow.name = name
  return gpkgIconRow
}

function isNothing(wut: any): wut is undefined | null | ''  {
  return wut === null || wut === undefined || wut === '' || (typeof wut === 'number' && isNaN(wut))
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

  put(icon: IconDocument, gpkgIconId: IconRow['id']): this {
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

type IconCachePath = Pick<IconAttrs, 'formId' | 'primary' | 'variant'>

function  createGeoPackageFile(): Promise<string> {
  const filename = moment().format('YYYMMDD_hhmmssSSS') + '.gpkg'
  const filePath = path.join(os.tmpdir(), filename)
  return new Promise(function (resolve, reject) {
    fs.unlink(filePath, function () {
      fs.mkdir(path.dirname(filePath), function () {
        fs.open(filePath, 'w', function (err) {
          if (err) return reject(err)
          resolve(filePath)
        })
      })
    })
  })
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

async function addAttachments(geopackage: GPKG.GeoPackage, attachments: AttachmentDocument[], observationId: number, formTable: string, formRowId: number): Promise<void> {
  log.info('add attachments');

  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];

    if (attachment.relativePath) {
      await new Promise(function (resolve, reject) {
        fs.readFile(path.join(attachmentBase, attachment.relativePath!), async (err, dataBuffer) => {
          if (err) {
            return reject(err);
          }
          const mediaId = geopackage.addMedia('Attachments', dataBuffer, attachment.contentType || 'application/octet-stream', {
            name: attachment.name || attachment._id,
            size: attachment.size || 0
          });
          await geopackage.linkMedia('Observations', observationId, 'Attachments', mediaId)
          resolve(geopackage.linkMedia(formTable, formRowId, 'Attachments', mediaId))
        });
      });
    }
  }
}

function setContentBounds(geopackage: GPKG.GeoPackage, featureDao: FeatureDao<FeatureRow>, zoomToEnvelope: Envelope): void {
  const contents = featureDao.getContents();
  contents.max_x = zoomToEnvelope.maxX;
  contents.max_y = zoomToEnvelope.maxY;
  contents.min_x = zoomToEnvelope.minX;
  contents.min_y = zoomToEnvelope.minY;
  const contentsDao = geopackage.contentsDao;
  contentsDao.update(contents);
}
