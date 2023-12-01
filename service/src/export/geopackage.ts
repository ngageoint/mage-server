'use strict';

import { RelationType } from '@ngageoint/geopackage/dist/lib/extension/relatedTables/relationType'
import { EnvelopeBuilder } from '@ngageoint/geopackage/dist/lib/geom/envelopeBuilder'
import GPKG, { GeoPackageAPI } from '@ngageoint/geopackage'
import util from 'util'
import fs from 'fs'
import api from '../api'
import archiver from 'archiver'
import moment from 'moment'
import os from 'os'
import path from 'path'
import wkx from 'wkx'
import { Exporter } from './exporter'
import environment from '../environment/env'
import * as User from '../models/user'
import { UserLocationDocument } from '../models/location'
import { UserId } from '../entities/users/entities.users'
import { FormFieldType } from '../entities/events/entities.events.forms'
import { Envelope } from '@ngageoint/geopackage/dist/lib/geom/envelope'
import { FeatureDao } from '@ngageoint/geopackage/dist/lib/features/user/featureDao'
import { FeatureRow } from '@ngageoint/geopackage/dist/lib/features/user/featureRow'
const log = require('winston')

const attachmentBase = environment.attachmentBaseDirectory;

export class GeoPackage extends Exporter {

  private iconMap = {} as any

  async export(streamable: NodeJS.WritableStream): Promise<void> {
    log.info('Export the GeoPackage');
    const downloadedFileName = 'mage-' + this._event.name;

    const archive = archiver('zip');
    archive.pipe(streamable);

    try {
      const filePath = await this.createGeoPackageFile();
      const gp = await GeoPackageAPI.create(filePath);
      await this.createUserTable(gp);
      await this.createUserFeatureTableStyles(gp);
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
  };

  createGeoPackageFile(): Promise<string> {
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

  async createObservationTable(geopackage: GPKG.GeoPackage): Promise<void> {
    log.info('Create Observation Table');
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

  async addUserToUsersTable(geopackage: GPKG.GeoPackage, user: User.UserDocument, usersLastLocation: UserLocationDocument, zoomToEnvelope: Envelope): Promise<void> {
    log.info(`add user ${user.username} to users table`);
    const geoJson = {
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
    };
    const userRowId = geopackage.addGeoJSONFeatureToGeoPackage(geoJson, 'Users');
    const iconPath = path.join(environment.userBaseDirectory, user._id.toString(), 'icon');
    let iconBuffer = null;
    try {
      iconBuffer = await util.promisify(fs.readFile)(iconPath)
    }
    catch (err) {
      log.error(`error reading reading user icon for geopackage export: ${iconPath}`, err)
      return void(0);
    }
    const featureTableStyles = new GeoPackageAPI.FeatureTableStyles(geopackage, 'Users');
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
    const rtreeIndex = new GeoPackageAPI.RTreeIndex(geopackage, featureDao);
    rtreeIndex.create();
    if (zoomToEnvelope) {
      this.setContentBounds(geopackage, featureDao, zoomToEnvelope);
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
    log.info('Requesting locations from DB');

    const { startDate, endDate } = this._filter
    const cursor = this.requestLocations({ startDate, endDate });

    let numLocations = 0;
    let user = null;
    let userLastLocation = null;
    let zoomToEnvelope;
    return cursor.eachAsync(async location => {

      if (!user || user._id.toString() !== location.userId.toString()) {
        if (zoomToEnvelope) {
          //Switching user, so update location
          const featureDao = geopackage.getFeatureDao('Locations_' + user._id.toString());

          this.setContentBounds(geopackage, featureDao, zoomToEnvelope);

          await this.addUserToUsersTable(geopackage, user, userLastLocation, zoomToEnvelope);
        }
        zoomToEnvelope = null;
        user = await User.getUserById(location.userId);
        await this.createLocationTableForUser(geopackage, location.userId.toString());
      }

      zoomToEnvelope = this.calculateBounds(location.geometry, zoomToEnvelope);
      userLastLocation = location;

      const geojson = {
        type: 'Feature',
        geometry: location.geometry,
        properties: location.properties
      };

      geojson.properties.mageId = location._id.toString();
      geojson.properties.userId = location.userId.toString();
      geojson.properties.deviceId = location.properties.deviceId.toString();

      if (geojson.properties.id) {
        delete geojson.properties.id;
      }

      await geopackage.addGeoJSONFeatureToGeoPackage(geojson, 'Locations_' + location.userId.toString());

      numLocations++;
    }).then(async () => {
      if (cursor) cursor.close;

      if (zoomToEnvelope && user) {
        //Process the last user, since it was missed in the loop above
        const featureDao = geopackage.getFeatureDao('Locations_' + user._id.toString());
        this.setContentBounds(geopackage, featureDao, zoomToEnvelope);
        await this.addUserToUsersTable(geopackage, user, userLastLocation, zoomToEnvelope);
      }

      log.info(`wrote ${numLocations} locations to geopackage`);
    })
    .catch(err => { log.warn(err) });
  }

  async createFormAttributeTables(geopackage: GPKG.GeoPackage): Promise<void> {
    log.info('Create Form Attribute Tables');
    const formIds = Object.keys(this._event.formMap);

    for (let i = 0; i < formIds.length; i++) {
      const formId = formIds[i];
      const columns = [];
      const form = this._event.formMap[formId];
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
        default: formId
      });
      for (let i = 0; i < form.fields.length; i++) {
        const field = form.fields[i];
        columns.push({
          dataColumn: {
            column_name: field.name,
            table_name: 'Form_' + formId,
            name: field.title,
            title: field.title
          },
          name: field.name,
          dataType: this.fieldTypeToGeoPackageType(field.type)
        });
      }
      await geopackage.createAttributesTableFromProperties('Form_' + formId, columns);
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
    await geopackage.createMediaTable('UserAvatars');
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
    for (const formId in this._event.formMap) {
      const form = this._event.formMap[formId];
      const row = {
        formName: form.name,
        primaryField: form.primaryField,
        variantField: form.variantField,
        color: form.color,
        formId: formId
      };

      geopackage.addAttributeRow('Forms', row);
    }
  }

  async addObservationsToGeoPackage(geopackage: GPKG.GeoPackage): Promise<void> {
    log.info('Requesting locations from DB');

    this.createAttachmentTable(geopackage);

    const cursor = this.requestObservations(this._filter);

    let numObservations = 0;
    let zoomToEnvelope: Envelope;
    return cursor.eachAsync(async observation => {

      numObservations++;

      let primary;
      let variant;
      if (observation.properties.forms && observation.properties.forms.length > 0) {
        const observationFirstForm = observation.properties.forms[0];
        const form = this._event.formMap[observationFirstForm.formId];
        primary = observationFirstForm[form.primaryField];
        variant = observationFirstForm[form.variantField];
      }

      const properties = {
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

      const geojson = {
        type: 'Feature',
        geometry: observation.geometry,
        properties: properties
      };

      zoomToEnvelope = this.calculateBounds(geojson.geometry, zoomToEnvelope);

      const featureId = geopackage.addGeoJSONFeatureToGeoPackage(geojson, 'Observations');

      if (observation.properties.forms && observation.properties.forms[0]) {
        // insert the icon link
        let iconId = this.iconMap[observation.properties.forms[0].formId]['icon.png'];

        if (primary && this.iconMap[observation.properties.forms[0].formId][primary]) {
          iconId = this.iconMap[observation.properties.forms[0].formId][primary]['icon.png'];
        }
        if (variant && this.iconMap[observation.properties.forms[0].formId][primary] && this.iconMap[observation.properties.forms[0].formId][primary][variant]) {
          iconId = this.iconMap[observation.properties.forms[0].formId][primary][variant];
        }
        const featureTableStyles = new GPKG.FeatureTableStyles(geopackage, 'Observations');
        featureTableStyles.setIconDefault(featureId, iconId)
      }

      if (observation.properties.forms) {
        for (let f = 0; f < observation.properties.forms.length; f++) {
          const observationForm = observation.properties.forms[f];
          const formDefinition = this._event.formMap[observationForm.formId];
          primary = observationForm[formDefinition.primaryField];
          variant = observationForm[formDefinition.variantField];
          const formToSave = {
            primaryField: primary,
            variantField: variant,
            formId: observationForm.formId
          };
          const attachments = [];
          if (observation.attachments) {
            observation.attachments.forEach((attachment) => {
              if (attachment.observationFormId.toString() == observationForm._id) {
                attachments.push(attachment);
                observationForm[attachment.fieldName] = observationForm[attachment.fieldName] || []
                observationForm[attachment.fieldName].push(attachment._id.toString());
              }
            })
          }
          Object.keys(observationForm).forEach(key => {

            if (observationForm[key] == null) return;

            const fieldDefinition = formDefinition.fields.find(field => field.name === key);
            if (!fieldDefinition) return;
            if (fieldDefinition.type === 'multiselectdropdown') {
              formToSave[key] = observationForm[key].join(', ');
            } else if (fieldDefinition.type === 'date') {
              formToSave[key] = moment(observationForm[key]).toISOString();
            } else if (fieldDefinition.type === 'checkbox') {
              formToSave[key] = observationForm[key].toString();
            } else if (fieldDefinition.type === 'geometry') {
              formToSave[key] = wkx.Geometry.parseGeoJSON(observationForm[key]).toWkt();
            } else if (fieldDefinition.type === 'attachment') {
              formToSave[key] = observationForm[key].join(', ');
            } else {
              formToSave[key] = observationForm[key]
            }
          })

          try {
            const rowId = geopackage.addAttributeRow('Form_' + formToSave.formId, formToSave);

            if (attachments.length) {
              await this.addAttachments(geopackage, attachments, featureId, 'Form_' + formToSave.formId, rowId);
            }

            await geopackage.linkRelatedRows('Observations', featureId, 'Form_' + formToSave.formId, rowId, RelationType.ATTRIBUTES);
          }
          catch (e) {
            console.error('error is ', e);
          }
        }
      }
    }).then(async () => {
      if (cursor) cursor.close;

      const featureDao = geopackage.getFeatureDao('Observations');
      const rtreeIndex = new GeoPackageAPI.RTreeIndex(geopackage, featureDao);
      rtreeIndex.create();

      if (zoomToEnvelope) {
        this.setContentBounds(geopackage, featureDao, zoomToEnvelope);
      }

      log.info(`'wrote ${numObservations} observations to geopackage`);
    })
    .catch(err => {
      log.warn(err)
    });
  }

  calculateBounds(geometry: wkx.Geometry, zoomToEnvelope: Envelope): Envelope {
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

  async addAttachments(geopackage: GPKG.GeoPackage, attachments, observationId, formTable, formRowId): Promise<void> {
    log.info('Add Attachments');

    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];

      if (attachment.relativePath) {
        await new Promise(function (resolve, reject) {
          fs.readFile(path.join(attachmentBase, attachment.relativePath), async (err, dataBuffer) => {
            if (err) return reject(err);
            const mediaId = geopackage.addMedia('Attachments', dataBuffer, attachment.contentType, {
              name: attachment.name,
              size: attachment.size
            });

            await geopackage.linkMedia('Observations', observationId, 'Attachments', mediaId)
            resolve(geopackage.linkMedia(formTable, formRowId, 'Attachments', mediaId))
          });
        });
      }
    }
  }

  async createObservationFeatureTableStyles(geopackage: GPKG.GeoPackage): Promise<void> {
    const featureTableName = 'Observations';
    const featureTableStyles = new GeoPackageAPI.FeatureTableStyles(geopackage, featureTableName);
    await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName)
    await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension()
    await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension()
    featureTableStyles.createRelationships()
    await this.addObservationIcons(geopackage, featureTableStyles);
  }

  async createUserFeatureTableStyles(geopackage: GPKG.GeoPackage): Promise<void> {
    const featureTableName = 'Users';
    const featureTableStyles = new GeoPackageAPI.FeatureTableStyles(geopackage, featureTableName);
    await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName);
    await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension();
    await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension();
    featureTableStyles.createRelationships();
  }

  async addObservationIcons(geopackage: GPKG.GeoPackage, featureTableStyles): Promise<void> {
    const rootDir = path.join(new api.Icon(this._event._id).getBasePath());

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

  setContentBounds(geopackage: GPKG.GeoPackage, featureDao: FeatureDao<FeatureRow>, zoomToEnvelope: Envelope): void {
    const contents = featureDao.getContents();
    contents.max_x = zoomToEnvelope.maxX;
    contents.max_y = zoomToEnvelope.maxY;
    contents.min_x = zoomToEnvelope.minX;
    contents.min_y = zoomToEnvelope.minY;
    const contentsDao = geopackage.contentsDao;
    contentsDao.update(contents);
  }
}
