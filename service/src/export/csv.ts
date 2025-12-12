'use strict';

import async from 'async'
import archiver from 'archiver'
import path from 'path'
import { AllGeoJSON } from '@turf/helpers'
import { Exporter } from './exporter'
import turfCentroid from '@turf/centroid'
import * as User from '../models/user'
import * as Device from '../models/device'
import * as json2csv from 'json2csv'
const mgrs = require('mgrs')
const log = require('winston')
const wkx = require('wkx')
import { attachmentBaseDirectory as attachmentBase } from  '../environment/env'
import stream from 'stream'
import { ObservationDocument } from '../models/observation'
import { UserDocument } from '../adapters/users/adapters.users.db.mongoose'
import { UserLocationDocument, UserLocationDocumentProperties } from '../models/location'


export class Csv extends Exporter {

  export(streamable: NodeJS.WritableStream): void {
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
    ]
    this._event.forms
      .filter(form => !form.archived)
      .forEach(form => {
        const formPrefix = this._event.forms.length > 1 ? form.name + '.' : '';
        form.fields
          .filter(field => !field.archived)
          .sort((a, b) => a.id - b.id)
          .filter(field => field.type !== 'attachment')
          .forEach(field => {
            observationFields.push({
              label: formPrefix + field.title,
              value: formPrefix + field.name
            });
          });
      });

    observationFields.push({
      label: 'Attachment',
      value: 'attachment'
    });

    observationFields.push({
      label: 'Attachment Orig Name',
      value: 'attachmentOriginalName'
    })

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
    ];

    const archive = archiver('zip');
    archive.pipe(streamable);
    async.parallel(
      [
        (done): void => {
          if (!this._filter.exportObservations) {
            return done();
          }
          const asyncParser = new json2csv.AsyncParser({ fields: observationFields }, { readableObjectMode: true, writableObjectMode: true });
          archive.append(asyncParser.processor as stream.Transform, { name: 'observations.csv' });
          this.streamObservations(asyncParser.input, archive, (err: any) => {
            done(err);
          });
        },
        (done): void => {
          if (!this._filter.exportLocations){
            return done();
          }
          const asyncParser = new json2csv.AsyncParser({ fields: locationFields }, { readableObjectMode: true, writableObjectMode: true });
          archive.append(asyncParser.processor as stream.Transform, { name: 'locations.csv' });
          this.streamLocations(asyncParser.input, (err: any) => {
            done(err);
          });
        }
      ],
      err => {
        if (err) {
          log.warn(err);
        }
        log.info('done writing csv, finalize archive');
        archive.finalize();
      }
    );
  }

  async streamObservations(stream: stream.Transform, archive: archiver.Archiver, done: (err?: any) => any): Promise<void> {
    log.info(`fetching observations for csv export`);
    const cursor = this.requestObservations(this._filter)
    const cache = {
      user: null,
      device: null
    }
    let numObservations = 0
    cursor
      .eachAsync(async observation => {
        const properties = await this.flattenObservation(observation, cache, archive);
        stream.push(properties);
        numObservations++;
      })
      .then(() => {
        if (cursor) {
          cursor.close;
        }
        log.info(`finished writing ${numObservations} observations to csv`);
        stream.push(null);
        done();
      })
      .catch(err => done(err));
  }

  async flattenObservation(observation: ObservationDocument, cache: { user: UserDocument | null, device: any }, archive: archiver.Archiver): Promise<void> {
    const flat = {
      id: observation.id,
      ...observation.properties
    } as any

    if (!cache.user || cache.user._id.toString() !== observation.userId?.toString()) {
      if (observation.userId) {
        cache.user = await User.getUserById(observation.userId!)
      }
    }
    if (!cache.device || cache.device._id.toString() !== observation.deviceId?.toString()) {
      if (observation.deviceId) {
        cache.device = await Device.getDeviceById(observation.deviceId);
      }
    }

    if (cache.user) {
      flat.user = cache.user.username;
    }
    if (cache.device) {
      flat.device = cache.device.uid;
    }

    const centroid = turfCentroid(observation as AllGeoJSON);
    flat.mgrs = mgrs.forward(centroid.geometry.coordinates);

    flat.shapeType = observation.geometry.type;
    if (observation.geometry.type === 'Point') {
      flat.longitude = observation.geometry.coordinates[0];
      flat.latitude = observation.geometry.coordinates[1];
    } else {
      flat.longitude = centroid.geometry.coordinates[0];
      flat.latitude = centroid.geometry.coordinates[1];
    }
    flat.wkt = wkx.Geometry.parseGeoJSON(observation.geometry).toWkt();
    flat.excelTimestamp = "=DATEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),1,10)) + TIMEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),12,8))";

    if (observation.properties && observation.properties.forms) {
      observation.properties.forms.forEach(formEntry => {
        const form = this._event.formFor(formEntry.formId)
        if (!form) {
          return
        }
        const formPrefix = this._event.forms.length > 1 ? form.name + '.' : ''
        for (const field of form.fields) {
          const fieldEntry = formEntry[field.name]
          if (fieldEntry !== undefined) {
            flat[formPrefix + field.name] = fieldEntry
          }
        }
      });
    }

    if (observation.attachments) {
      observation.attachments.forEach((attachment, index) => {
        if (!attachment.relativePath) {
          // exclude attachments that are pending upload and/or not saved
          return
        }
        const name = path.basename(attachment.relativePath!);
        flat.attachment = name
        flat.attachmentOriginalName = attachment.name
        archive.file(path.join(attachmentBase, attachment.relativePath), { name });
      })
    }

    return flat
  }

  async streamLocations(stream: stream.Transform, done: (err?: any) => any): Promise<void> {

    const { startDate, endDate } = this._filter
    const cursor = this.requestLocations({ startDate, endDate })
    const cache = {
      user: null,
      device: null
    }
    let numLocations = 0;
    cursor.eachAsync(async location => {
      const locationRecord = await this.flattenLocation(location, cache)
      stream.push(locationRecord)
      numLocations++
    })
    .then(() => {
      if (cursor) {
        cursor.close
      }
      log.info('Successfully wrote ' + numLocations + ' locations to CSV')
      log.info('done writing locations')
      stream.push(null)
      done()
    })
    .catch(err => done(err))
  }

  async flattenLocation(location: UserLocationDocument, cache: { user: UserDocument | null, device: any }): Promise<any> {
    const flat = {
      ...location.properties,
      user: undefined as string | undefined,
      device: undefined as string | undefined,
      longitude: location.geometry.coordinates[0],
      latitude: location.geometry.coordinates[1],
      mgrs: mgrs.forward(location.geometry.coordinates),
    } as UserLocationDocumentProperties & { user?: string, device?: string }
    if (!cache.user || cache.user._id.toString() !== location.userId.toString()) {
      cache.user = await User.getUserById(location.userId)
    }
    if (!cache.device || cache.device._id.toString() !== flat.deviceId?.toString()) {
      cache.device = flat.deviceId ? await Device.getDeviceById(flat.deviceId) : undefined
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
