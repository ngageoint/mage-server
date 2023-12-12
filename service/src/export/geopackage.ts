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
import archiver from 'archiver'
import moment from 'moment'
import os from 'os'
import path from 'path'
import wkx from 'wkx'
import { Exporter } from './exporter'
import api from '../api'
import environment from '../environment/env'
import User, { UserDocument } from '../models/user'
import { UserLocationDocument } from '../models/location'
import { UserId } from '../entities/users/entities.users'
import { FormFieldType } from '../entities/events/entities.events.forms'
import { AttachmentDocument } from '../models/observation'

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

  private iconMap = {} as any

  async export(streamable: NodeJS.WritableStream): Promise<void> {
    log.info('Export the GeoPackage');
    const downloadedFileName = 'mage-' + this._event.name;

    const archive = archiver('zip');
    archive.pipe(streamable);

    try {
      const filePath = await createGeoPackageFile();
      const gp = await GeoPackageAPI.create(filePath);
      await this.createUserTable(gp);
      await createUserFeatureTableStyles(gp);
      if (this._filter.exportObservations) {
        await this.addFormDataToGeoPackage(gp);
        await this.createFormAttributeTables(gp);
        await this.createObservationTable(gp);
        await this.createObservationFeatureTableStyles(gp);
        await this.addObservationsToGeoPackage(gp);
      }
      if (this._filter.exportLocations) {
        await this.addLocationsToGeoPackage(gp);
      }
      log.info(`export geopackage created: ${filePath}`);
      archive.append(fs.createReadStream(filePath), { name: downloadedFileName + '.gpkg' });
      archive.on('end', function () {
        log.info(`removing temporary export geopackage file ${filePath}`);
        fs.unlink(filePath, function () {
          gp.close();
        });
      });
      archive.finalize();
    }
    catch (err) {
      log.error(`error exporting geopackage`, err);
      throw err;
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

  async addUserToUsersTable(geopackage: GPKG.GeoPackage, user: UserDocument, usersLastLocation: UserLocationDocument, zoomToEnvelope: Envelope): Promise<void> {
    log.info(`add user ${user.username} to users table`);
    const feature: geojson.Feature = {
      type: 'Feature',
      geometry: usersLastLocation.geometry,
      properties: {
        timestamp: usersLastLocation.properties.timestamp,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phones: user.phones.join(', '),
        userId: user._id.toString()
      }
    }
    const userRowId = geopackage.addGeoJSONFeatureToGeoPackage(feature, 'Users');
    const iconPath = path.join(environment.userBaseDirectory, user._id.toString(), 'icon');
    let iconBuffer = null;
    try {
      iconBuffer = await util.promisify(fs.readFile)(iconPath)
    }
    catch (err) {
      log.error(`error reading reading user icon for geopackage export: ${iconPath}`, err)
      return void(0);
    }
    const featureTableStyles = new GPKG.FeatureTableStyles(geopackage, 'Users');
    const iconRow = featureTableStyles.getIconDao().newRow();
    iconRow.data = iconBuffer;
    iconRow.contentType = 'image/png';
    iconRow.name = user.username;
    iconRow.description = `Icon for user ${user.username}`;
    iconRow.width = 20;
    iconRow.anchorU = 0.5;
    iconRow.anchorV = 1.0;
    featureTableStyles.setIconDefault(userRowId, iconRow);
    const featureDao = geopackage.getFeatureDao('Users');
    const rtreeIndex = new GPKG.RTreeIndex(geopackage, featureDao);
    rtreeIndex.create();
    if (zoomToEnvelope) {
      setContentBounds(geopackage, featureDao, zoomToEnvelope);
    }
  }

  async createLocationTableForUser(geopackage: GPKG.GeoPackage, userId: UserId): Promise<void> {
    const columns = [];

    columns.push({
      name: 'mageId',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'userId',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'timestamp',
      dataType: 'DATETIME'
    });
    columns.push({
      name: 'deviceId',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'accuracy',
      dataType: 'REAL'
    });

    await geopackage.createFeatureTableFromProperties('Locations_' + userId, columns);
  }

  async addLocationsToGeoPackage(geopackage: GPKG.GeoPackage): Promise<void> {
    log.info('fetching locations');
    const { startDate, endDate } = this._filter
    const cursor = this.requestLocations({ startDate, endDate });
    let numLocations = 0;
    let user: UserDocument | null = null;
    let userLastLocation: UserLocationDocument | null = null;
    let zoomToEnvelope: Envelope | null = null;
    return cursor.eachAsync(async location => {

      if (!user || user._id.toString() !== location.userId.toString()) {
        if (zoomToEnvelope) {
          // Switching user, so update location
          const featureDao = geopackage.getFeatureDao('Locations_' + user!._id.toString());
          setContentBounds(geopackage, featureDao, zoomToEnvelope);
          await this.addUserToUsersTable(geopackage, user!, userLastLocation!, zoomToEnvelope);
        }
        zoomToEnvelope = null;
        user = await User.getUserById(location.userId);
        await this.createLocationTableForUser(geopackage, location.userId.toString());
      }

      zoomToEnvelope = calculateBounds(location.geometry, zoomToEnvelope);
      userLastLocation = location;

      const feature: geojson.Feature<geojson.Point, any> = {
        type: 'Feature',
        geometry: location.geometry,
        properties: location.properties
      };
      feature.properties.mageId = location._id.toString();
      feature.properties.userId = location.userId.toString();
      feature.properties.deviceId = location.properties.deviceId.toString();

      if (feature.properties.id) {
        delete feature.properties.id;
      }

      await geopackage.addGeoJSONFeatureToGeoPackage(feature, 'Locations_' + location.userId.toString());

      numLocations++;
    }).then(async () => {
      if (cursor) {
        cursor.close();
      }

      if (zoomToEnvelope && user) {
        //Process the last user, since it was missed in the loop above
        const featureDao = geopackage.getFeatureDao('Locations_' + user._id.toString());
        setContentBounds(geopackage, featureDao, zoomToEnvelope);
        await this.addUserToUsersTable(geopackage, user, userLastLocation!, zoomToEnvelope);
      }

      log.info(`wrote ${numLocations} locations to geopackage`);
    })
    .catch(err => { log.warn(err) });
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
            name: field.title,
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

  async createUserTable(geopackage: GPKG.GeoPackage): Promise<void> {
    const columns = [];
    columns.push({
      name: 'username',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'displayName',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'email',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'phones',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'userId',
      dataType: 'TEXT'
    });
    columns.push({
      name: 'timestamp',
      dataType: 'DATETIME'
    });
    await geopackage.createFeatureTableFromProperties('Users', columns)
    log.info('create user avatar table');
    await geopackage.createMediaTable('UserAvatars', void(0) as any /* really is optional */);
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

      numObservations++;

      let primary: string | null = null;
      let variant: string | null = null;
      if (observation.properties.forms && observation.properties.forms.length > 0) {
        const formEntry1 = observation.properties.forms[0];
        const form = this._event.formFor(formEntry1.formId);
        primary = (formEntry1[form?.primaryField || ''] || null) as string | null;
        variant = (formEntry1[form?.variantField || ''] || null) as string | null;
      }

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
      };

      zoomToEnvelope = calculateBounds(feature.geometry, zoomToEnvelope);

      const featureId = geopackage.addGeoJSONFeatureToGeoPackage(feature, 'Observations');

      if (observation.properties.forms && observation.properties.forms[0]) {
        // insert the icon link
        let iconId = this.iconMap[observation.properties.forms[0].formId]['icon.png'];
        if (primary && this.iconMap[observation.properties.forms[0].formId][primary]) {
          iconId = this.iconMap[observation.properties.forms[0].formId][primary]['icon.png'];
          if (variant && this.iconMap[observation.properties.forms[0].formId][primary] && this.iconMap[observation.properties.forms[0].formId][primary][variant]) {
            iconId = this.iconMap[observation.properties.forms[0].formId][primary][variant];
          }
        }
        const featureTableStyles = new GPKG.FeatureTableStyles(geopackage, 'Observations');
        featureTableStyles.setIconDefault(featureId, iconId)
      }

      const formEntries = observation.properties.forms || []
      for (const formEntry of formEntries) {
        const formDefinition = this._event.formFor(formEntry.formId)!;
        const primary = formEntry[formDefinition.primaryField || ''];
        const variant = formEntry[formDefinition.variantField || ''];
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
          const field = this._event.formFieldFor(key, formDefinition.id)
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

  async createObservationFeatureTableStyles(geopackage: GPKG.GeoPackage): Promise<void> {
    const featureTableName = 'Observations';
    const featureTableStyles = new GPKG.FeatureTableStyles(geopackage, featureTableName);
    await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName)
    await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension()
    await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension()
    featureTableStyles.createRelationships()
    await this.addObservationIcons(geopackage, featureTableStyles);
  }

  async addObservationIcons(geopackage: GPKG.GeoPackage, featureTableStyles: GPKG.FeatureTableStyles): Promise<void> {
    const rootDir = path.join(new api.Icon(this._event.id).getBasePath());

    if (!fs.existsSync(path.join(rootDir))) {
      return;
    }

    const formDirs = fs.readdirSync(path.join(rootDir));
    for (let i = 0; i < formDirs.length; i++) {
      const formDir = formDirs[i];
      this.iconMap[formDir] = this.iconMap[formDir] || {};
      if (!fs.existsSync(path.join(rootDir, formDir))) {
        continue;
      }
      if (formDir === 'icon.png') {
        await new Promise((resolve, reject) => {
          fs.readFile(path.join(rootDir, formDir), async (err, iconBuffer) => {
            if (err) return reject(err);
            const iconRow = featureTableStyles.getIconDao().newRow();
            iconRow.data = iconBuffer;
            iconRow.contentType = 'image/png';
            iconRow.name = `${this._event.name} icon`;
            iconRow.description = `Icon for event ${this._event.name}`;
            iconRow.width = 20;
            iconRow.anchorU = 0.5;
            iconRow.anchorV = 1.0;
            this.iconMap[formDir] = iconRow;
            await featureTableStyles.setTableIconDefault(iconRow);
            resolve(void(0));
          });
        });
      } else {
        const primaryDirs = fs.readdirSync(path.join(rootDir, formDir));
        for (let p = 0; p < primaryDirs.length; p++) {
          const primaryDir = primaryDirs[p];
          if (!fs.existsSync(path.join(rootDir, formDir, primaryDir))) {
            continue;
          }
          if (primaryDir === 'icon.png') {
            await new Promise((resolve, reject) => {
              fs.readFile(path.join(rootDir, formDir, primaryDir), (err, iconBuffer) => {
                if (err) return reject(err);
                const iconRow = featureTableStyles.getIconDao().newRow();
                iconRow.data = iconBuffer;
                iconRow.contentType = 'image/png';
                iconRow.name = formDir;
                iconRow.description = `Icon for form ${formDir}/icon.png`;
                iconRow.width = 20;
                iconRow.anchorU = 0.5;
                iconRow.anchorV = 1.0;
                this.iconMap[formDir]['icon.png'] = iconRow;
                resolve(void(0));
              });
            });
          } else {
            this.iconMap[formDir][primaryDir] = this.iconMap[formDir][primaryDir] || {};
            const variantDirs = fs.readdirSync(path.join(rootDir, formDir, primaryDir));
            for (let v = 0; v < variantDirs.length; v++) {
              const variantDir = variantDirs[v];
              if (!fs.existsSync(path.join(rootDir, formDir, primaryDir, variantDir))) {
                continue;
              }
              if (variantDir === 'icon.png') {
                await new Promise((resolve, reject) => {
                  fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir), (err, iconBuffer) => {
                    if (err) return reject(err);
                    const iconRow = featureTableStyles.getIconDao().newRow();
                    iconRow.data = iconBuffer;
                    iconRow.contentType = 'image/png';
                    iconRow.name = primaryDir;
                    iconRow.description = `Icon for form ${formDir}/${primaryDir}/icon.png`;
                    iconRow.width = 20;
                    iconRow.anchorU = 0.5;
                    iconRow.anchorV = 1.0;
                    this.iconMap[formDir][primaryDir]['icon.png'] = iconRow;
                    resolve(void(0));
                  });
                });
              } else {
                this.iconMap[formDir][primaryDir][variantDir] = this.iconMap[formDir][primaryDir][variantDir] || {};
                if (!fs.existsSync(path.join(rootDir, formDir, primaryDir, variantDir, 'icon.png'))) {
                  continue;
                }
                await new Promise((resolve, reject) => {
                  fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir, 'icon.png'), (err, iconBuffer) => {
                    if (err) return reject(err);
                    const iconRow = featureTableStyles.getIconDao().newRow();
                    iconRow.data = iconBuffer;
                    iconRow.contentType = 'image/png';
                    iconRow.name = variantDir;
                    iconRow.description = `Icon for form ${formDir}/${primaryDir}/${variantDir}/icon.png`;
                    iconRow.width = 20;
                    iconRow.anchorU = 0.5;
                    iconRow.anchorV = 1.0;
                    this.iconMap[formDir][primaryDir][variantDir]['icon.png'] = iconRow;
                    resolve(void(0));
                  });
                });
              }
            }
          }
        }
      }
    }
  }
}

function  createGeoPackageFile(): Promise<string> {
  const filename = moment().format('YYYMMDD_hhmmssSSS') + '.gpkg';
  const filePath = path.join(os.tmpdir(), filename);
  return new Promise(function (resolve, reject) {
    fs.unlink(filePath, function () {
      fs.mkdir(path.dirname(filePath), function () {
        fs.open(filePath, 'w', function (err) {
          if (err) return reject(err);
          resolve(filePath);
        });
      });
    });
  });
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

async function createUserFeatureTableStyles(geopackage: GPKG.GeoPackage): Promise<void> {
  const featureTableName = 'Users';
  const featureTableStyles = new GPKG.FeatureTableStyles(geopackage, featureTableName);
  await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName);
  await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension();
  await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension();
  featureTableStyles.createRelationships();
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
